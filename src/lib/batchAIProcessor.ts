import { categorizeSingleAnswer } from '../api/categorize';
import { getSupabaseClient } from './supabase';

const supabase = getSupabaseClient();

export type BatchStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface BatchProgress {
  status: BatchStatus;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  currentAnswerId: number | null;
  startTime: number | null;
  errors: Array<{ answerId: number; error: string }>;
  speed: number; // answers per second
}

export interface BatchOptions {
  rateLimitMs?: number; // Delay between requests (deprecated with parallel processing)
  maxRetries?: number; // Max retry attempts for failed requests
  concurrency?: number; // Number of parallel requests (default: 5)
  onProgress?: (progress: BatchProgress) => void;
  onComplete?: (progress: BatchProgress) => void;
  onError?: (error: Error) => void;
}

export class BatchAIProcessor {
  private queue: number[] = [];
  private status: BatchStatus = 'idle';
  private abortController: AbortController | null = null;
  private progress: BatchProgress = {
    status: 'idle',
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    currentAnswerId: null,
    startTime: null,
    errors: [],
    speed: 0
  };
  private options: BatchOptions;
  private retryQueue: Array<{ answerId: number; retryCount: number }> = [];
  private duplicateMap: Map<number, number[]> = new Map(); // Maps representative answer ID → duplicate IDs

  constructor(options: BatchOptions = {}) {
    this.options = {
      rateLimitMs: 500, // Deprecated with parallel processing
      maxRetries: 3,
      concurrency: 5, // 5 parallel requests by default
      ...options
    };
  }

  async startBatch(
    answerIds: number[],
    categoryId: number,
    template?: string
  ): Promise<void> {
    if (this.status === 'running') {
      throw new Error('Batch already running');
    }

    console.log(`🚀 Starting batch AI processing for ${answerIds.length} answers`);

    // Build duplicate map: group identical answer texts
    await this.buildDuplicateMap(answerIds);
    const uniqueIds = Array.from(this.duplicateMap.keys());

    console.log(`📊 Deduplicated: ${answerIds.length} answers → ${uniqueIds.length} unique (${answerIds.length - uniqueIds.length} duplicates)`);

    this.queue = uniqueIds;
    this.status = 'running';
    this.abortController = new AbortController();
    this.progress = {
      status: 'running',
      total: answerIds.length, // Show original total for user
      processed: 0,
      succeeded: 0,
      failed: 0,
      currentAnswerId: null,
      startTime: Date.now(),
      errors: [],
      speed: 0
    };

    this.updateProgress();

    try {
      await this.processQueue(categoryId, template);
      this.progress.status = 'completed';
      this.status = 'completed';
      console.log(`✅ Batch processing completed: ${this.progress.succeeded} succeeded, ${this.progress.failed} failed`);
      this.options.onComplete?.(this.getProgress());
    } catch (error) {
      this.progress.status = 'error';
      this.status = 'error';
      console.error('❌ Batch processing error:', error);
      this.options.onError?.(error as Error);
    } finally {
      this.updateProgress();
    }
  }

  private async buildDuplicateMap(answerIds: number[]): Promise<void> {
    this.duplicateMap.clear();

    // Fetch all answers
    const { data: answers, error } = await supabase
      .from('answers')
      .select('id, answer_text')
      .in('id', answerIds);

    if (error || !answers) {
      console.error('Failed to fetch answers for deduplication:', error);
      // Fallback: treat all as unique
      answerIds.forEach(id => this.duplicateMap.set(id, []));
      return;
    }

    // Group by answer_text
    const groups = new Map<string, number[]>();

    for (const answer of answers) {
      const text = (answer.answer_text || '').trim().toLowerCase();
      if (!groups.has(text)) {
        groups.set(text, []);
      }
      groups.get(text)!.push(answer.id);
    }

    // Build duplicate map: first ID in each group = representative
    for (const [_text, ids] of groups) {
      const [representative, ...duplicates] = ids;
      this.duplicateMap.set(representative, duplicates);
    }
  }

  private async copyAISuggestionsToDuplicates(sourceId: number, duplicateIds: number[]): Promise<void> {
    try {
      // Fetch AI suggestions from source answer
      const { data: sourceAnswer, error: fetchError } = await supabase
        .from('answers')
        .select('ai_suggestions, ai_suggested_code')
        .eq('id', sourceId)
        .single();

      if (fetchError || !sourceAnswer?.ai_suggestions) {
        console.error('Failed to fetch source AI suggestions:', fetchError);
        return;
      }

      // Copy to all duplicates
      const { error: updateError } = await supabase
        .from('answers')
        .update({
          ai_suggestions: sourceAnswer.ai_suggestions,
          ai_suggested_code: sourceAnswer.ai_suggested_code,
        })
        .in('id', duplicateIds);

      if (updateError) {
        console.error('Failed to copy AI suggestions to duplicates:', updateError);
      } else {
        console.log(`✅ Copied AI suggestions to ${duplicateIds.length} duplicate answers`);
      }
    } catch (error) {
      console.error('Error copying AI suggestions:', error);
    }
  }

  private async processQueue(categoryId: number, template?: string): Promise<void> {
    const concurrency = this.options.concurrency || 5;
    console.log(`🚀 Processing with ${concurrency} parallel workers`);

    // Process in batches with concurrency limit
    const workers: Promise<void>[] = [];

    for (let i = 0; i < concurrency; i++) {
      workers.push(this.worker(categoryId, template));
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    // Process retry queue if needed
    if (this.retryQueue.length > 0 && this.status === 'running') {
      console.log(`🔄 Processing ${this.retryQueue.length} retries...`);
      this.queue = [...this.retryQueue.map(r => r.answerId)];
      this.retryQueue = [];
      await this.processQueue(categoryId, template);
    }
  }

  private async worker(categoryId: number, template?: string): Promise<void> {
    while (this.queue.length > 0 && this.status === 'running') {
      // Get next item from queue
      const answerId = this.queue.shift();
      if (!answerId) break;

      this.progress.currentAnswerId = answerId;

      try {
        // Check if aborted
        if (this.abortController?.signal.aborted) {
          console.log('🛑 Worker stopped - batch aborted');
          break;
        }

        console.log(`🔄 Processing answer ${this.progress.processed + 1}/${this.progress.total}: ${answerId}`);

        // Use the new API function that handles everything
        const suggestions = await categorizeSingleAnswer(answerId, false);

        if (suggestions && suggestions.length > 0) {
          console.log(`✅ Successfully processed answer ${answerId} with ${suggestions.length} suggestions`);
          this.progress.succeeded++;

          // Copy AI suggestions to duplicate answers
          const duplicates = this.duplicateMap.get(answerId) || [];
          if (duplicates.length > 0) {
            console.log(`📋 Copying AI suggestions to ${duplicates.length} duplicate answers`);
            await this.copyAISuggestionsToDuplicates(answerId, duplicates);
            this.progress.succeeded += duplicates.length; // Count duplicates as succeeded
          }
        } else {
          throw new Error('No AI suggestions generated');
        }

      } catch (error: any) {
        console.error(`❌ Failed to process answer ${answerId}:`, error);
        this.progress.failed++;
        this.progress.errors.push({
          answerId,
          error: error.message || 'Unknown error'
        });

        // Add to retry queue if retries available
        const retryCount = this.retryQueue.find(r => r.answerId === answerId)?.retryCount || 0;
        if (retryCount < (this.options.maxRetries || 3)) {
          this.retryQueue.push({ answerId, retryCount: retryCount + 1 });
          console.log(`🔄 Adding answer ${answerId} to retry queue (attempt ${retryCount + 1})`);
        }
      }

      // Count both the answer and its duplicates as processed
      const duplicates = this.duplicateMap.get(answerId) || [];
      this.progress.processed += 1 + duplicates.length;
      this.updateSpeed();
      this.updateProgress();
    }
  }

  pause(): void {
    if (this.status === 'running') {
      this.status = 'paused';
      this.progress.status = 'paused';
      this.updateProgress();
      console.log('⏸️  Batch processing paused');
    }
  }

  resume(): void {
    if (this.status === 'paused') {
      this.status = 'running';
      this.progress.status = 'running';
      this.updateProgress();
      console.log('▶️  Batch processing resumed');
      // Processing will continue in the existing processQueue loop
    }
  }

  cancel(): void {
    this.abortController?.abort();
    this.status = 'idle';
    this.progress.status = 'idle';
    this.queue = [];
    this.retryQueue = [];
    this.updateProgress();
    console.log('🛑 Batch processing cancelled');
  }

  getProgress(): BatchProgress {
    return { ...this.progress };
  }

  getTimeRemaining(): number | null {
    if (!this.progress.startTime || this.progress.processed === 0 || this.progress.speed === 0) {
      return null;
    }

    const remaining = this.queue.length + this.retryQueue.length;
    const timeRemaining = remaining / this.progress.speed;
    return Math.round(timeRemaining);
  }

  getSpeed(): number {
    return this.progress.speed;
  }

  private updateSpeed(): void {
    if (!this.progress.startTime || this.progress.processed === 0) {
      this.progress.speed = 0;
      return;
    }

    const elapsed = (Date.now() - this.progress.startTime) / 1000; // seconds
    this.progress.speed = this.progress.processed / elapsed;
  }

  private updateProgress(): void {
    this.options.onProgress?.(this.getProgress());
  }

  // Static method to create processor with callbacks
  static create(options: BatchOptions = {}): BatchAIProcessor {
    return new BatchAIProcessor(options);
  }
}
