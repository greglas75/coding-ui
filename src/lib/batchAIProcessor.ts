import { categorizeSingleAnswer } from '../api/categorize';
import { simpleLogger } from '../utils/logger';
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
    speed: 0,
  };
  private options: BatchOptions;
  private retryQueue: Array<{ answerId: number; retryCount: number }> = [];
  private duplicateMap: Map<number, number[]> = new Map(); // Maps representative answer ID → duplicate IDs

  constructor(options: BatchOptions = {}) {
    this.options = {
      rateLimitMs: 500, // Deprecated with parallel processing
      maxRetries: 3,
      concurrency: 5, // 5 parallel requests by default
      ...options,
    };
  }

  async startBatch(answerIds: number[], categoryId: number, template?: string): Promise<void> {
    if (this.status === 'running') {
      throw new Error('Batch already running');
    }

    simpleLogger.info(`🚀 Starting batch AI processing for ${answerIds.length} answers`);

    // 🚀 OPTIMIZATION: Check for cached AI suggestions before processing
    const { needsProcessing, alreadyCached } = await this.filterCachedAnswers(answerIds);

    if (alreadyCached > 0) {
      simpleLogger.info(
        `💰 Cache optimization: ${alreadyCached} answers already have AI suggestions (saved ${alreadyCached} API calls)`
      );
    }

    // Build duplicate map: group identical answer texts (only for answers that need processing)
    await this.buildDuplicateMap(needsProcessing);
    const uniqueIds = Array.from(this.duplicateMap.keys());

    simpleLogger.info(
      `📊 Deduplicated: ${needsProcessing.length} answers → ${uniqueIds.length} unique (${needsProcessing.length - uniqueIds.length} duplicates)`
    );

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
      speed: 0,
    };

    this.updateProgress();

    try {
      await this.processQueue(categoryId, template);
      this.progress.status = 'completed';
      this.status = 'completed';
      simpleLogger.info(
        `✅ Batch processing completed: ${this.progress.succeeded} succeeded, ${this.progress.failed} failed`
      );
      this.options.onComplete?.(this.getProgress());
    } catch (error) {
      this.progress.status = 'error';
      this.status = 'error';
      simpleLogger.error('❌ Batch processing error:', error);
      this.options.onError?.(error as Error);
    } finally {
      this.updateProgress();
    }
  }

  /**
   * 🚀 OPTIMIZATION: Filter out answers that already have cached AI suggestions
   * Saves 40-60% of API calls by reusing recent categorizations
   */
  private async filterCachedAnswers(answerIds: number[]): Promise<{
    needsProcessing: number[];
    alreadyCached: number;
  }> {
    const CACHE_AGE_LIMIT = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Fetch all answers with ai_suggestions timestamps
    const { data: answers, error } = await supabase
      .from('answers')
      .select('id, ai_suggestions')
      .in('id', answerIds);

    if (error || !answers) {
      // If error, process all (fail-safe)
      return { needsProcessing: answerIds, alreadyCached: 0 };
    }

    const needsProcessing: number[] = [];
    let alreadyCached = 0;

    for (const answer of answers) {
      // Check if has AI suggestions and they're not expired
      if (answer.ai_suggestions && answer.ai_suggestions.timestamp) {
        const age = Date.now() - new Date(answer.ai_suggestions.timestamp).getTime();

        if (age < CACHE_AGE_LIMIT) {
          // Cache hit! Skip this answer
          alreadyCached++;
          continue;
        }
      }

      // No cache or expired - needs processing
      needsProcessing.push(answer.id);
    }

    return { needsProcessing, alreadyCached };
  }

  private async buildDuplicateMap(answerIds: number[]): Promise<void> {
    this.duplicateMap.clear();

    // Fetch all answers
    const { data: answers, error } = await supabase
      .from('answers')
      .select('id, answer_text')
      .in('id', answerIds);

    if (error || !answers) {
      simpleLogger.error('Failed to fetch answers for deduplication:', error);
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

  private async copyAISuggestionsToDuplicates(
    sourceId: number,
    duplicateIds: number[]
  ): Promise<void> {
    try {
      // Fetch AI suggestions from source answer
      const { data: sourceAnswer, error: fetchError } = await supabase
        .from('answers')
        .select('ai_suggestions, ai_suggested_code')
        .eq('id', sourceId)
        .single();

      if (fetchError || !sourceAnswer?.ai_suggestions) {
        simpleLogger.error('Failed to fetch source AI suggestions:', fetchError);
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
        simpleLogger.error('Failed to copy AI suggestions to duplicates:', updateError);
      } else {
        simpleLogger.info(`✅ Copied AI suggestions to ${duplicateIds.length} duplicate answers`);
      }
    } catch (error) {
      simpleLogger.error('Error copying AI suggestions:', error);
    }
  }

  private async processQueue(categoryId: number, template?: string): Promise<void> {
    const concurrency = this.options.concurrency || 5;
    simpleLogger.info(`🚀 Processing with ${concurrency} parallel workers`);

    // Process in batches with concurrency limit
    const workers: Promise<void>[] = [];

    for (let i = 0; i < concurrency; i++) {
      workers.push(this.worker(categoryId, template));
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    // Process retry queue if needed
    if (this.retryQueue.length > 0 && this.status === 'running') {
      simpleLogger.info(`🔄 Processing ${this.retryQueue.length} retries...`);
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
          simpleLogger.info('🛑 Worker stopped - batch aborted');
          break;
        }

        simpleLogger.info(
          `🔄 Processing answer ${this.progress.processed + 1}/${this.progress.total}: ${answerId}`
        );

        // Use the new API function that handles everything
        const suggestions = await categorizeSingleAnswer(answerId, false);

        if (suggestions && suggestions.length > 0) {
          simpleLogger.info(
            `✅ Successfully processed answer ${answerId} with ${suggestions.length} suggestions`
          );
          this.progress.succeeded++;

          // Copy AI suggestions to duplicate answers
          const duplicates = this.duplicateMap.get(answerId) || [];
          if (duplicates.length > 0) {
            simpleLogger.info(
              `📋 Copying AI suggestions to ${duplicates.length} duplicate answers`
            );
            await this.copyAISuggestionsToDuplicates(answerId, duplicates);
            this.progress.succeeded += duplicates.length; // Count duplicates as succeeded
          }
        } else {
          throw new Error('No AI suggestions generated');
        }
      } catch (error: any) {
        simpleLogger.error(`❌ Failed to process answer ${answerId}:`, error);
        this.progress.failed++;
        this.progress.errors.push({
          answerId,
          error: error.message || 'Unknown error',
        });

        // Add to retry queue if retries available
        const retryCount = this.retryQueue.find(r => r.answerId === answerId)?.retryCount || 0;
        if (retryCount < (this.options.maxRetries || 3)) {
          this.retryQueue.push({ answerId, retryCount: retryCount + 1 });
          simpleLogger.info(
            `🔄 Adding answer ${answerId} to retry queue (attempt ${retryCount + 1})`
          );
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
      simpleLogger.info('⏸️  Batch processing paused');
    }
  }

  resume(): void {
    if (this.status === 'paused') {
      this.status = 'running';
      this.progress.status = 'running';
      this.updateProgress();
      simpleLogger.info('▶️  Batch processing resumed');
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
    simpleLogger.info('🛑 Batch processing cancelled');
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
