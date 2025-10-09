import { categorizeAnswer } from './openai';
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
  rateLimitMs?: number; // Delay between requests
  maxRetries?: number; // Max retry attempts for failed requests
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

  constructor(options: BatchOptions = {}) {
    this.options = {
      rateLimitMs: 500, // 2 requests per second
      maxRetries: 3,
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

    this.queue = [...answerIds];
    this.status = 'running';
    this.abortController = new AbortController();
    this.progress = {
      status: 'running',
      total: answerIds.length,
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

  private async processQueue(categoryId: number, template?: string): Promise<void> {
    while (this.queue.length > 0 && this.status === 'running') {
      const answerId = this.queue.shift()!;
      this.progress.currentAnswerId = answerId;
      this.updateProgress();

      try {
        // Check if aborted
        if (this.abortController?.signal.aborted) {
          console.log('🛑 Batch processing aborted');
          break;
        }

        console.log(`🔄 Processing answer ${this.progress.processed + 1}/${this.progress.total}: ${answerId}`);

        // Fetch answer data
        const { data: answer, error: fetchError } = await supabase
          .from('answers')
          .select(`
            id,
            answer_text,
            translation_en,
            category_id,
            categories!inner(id, name)
          `)
          .eq('id', answerId)
          .single();

        if (fetchError || !answer) {
          throw new Error(`Failed to fetch answer: ${fetchError?.message || 'Answer not found'}`);
        }

        // Check if answer already has AI suggestions
        const { data: existingSuggestions } = await supabase
          .from('answers')
          .select('ai_suggestions')
          .eq('id', answerId)
          .single();

        if (existingSuggestions?.ai_suggestions?.suggestions?.length > 0) {
          console.log(`⏭️  Answer ${answerId} already has AI suggestions, skipping`);
          this.progress.succeeded++;
        } else {
          // Call AI categorization
          const suggestions = await categorizeAnswer({
            answer: answer.answer_text,
            answerTranslation: answer.translation_en,
            categoryName: (answer.categories as any).name,
            template: template || 'Default categorization template',
            codes: [], // Will be fetched by categorizeAnswer
            context: {
              language: 'unknown',
              country: 'unknown'
            }
          });

          if (suggestions && suggestions.length > 0) {
            // Update answer with AI suggestions
            const { error: updateError } = await supabase
              .from('answers')
              .update({
                ai_suggestions: {
                  suggestions: suggestions,
                  generated_at: new Date().toISOString(),
                  model: 'gpt-4',
                  confidence: suggestions.reduce((acc: number, s: any) => acc + s.confidence, 0) / suggestions.length
                }
              })
              .eq('id', answerId);

            if (updateError) {
              throw new Error(`Failed to update answer: ${updateError.message}`);
            }

            console.log(`✅ Successfully processed answer ${answerId} with ${suggestions.length} suggestions`);
            this.progress.succeeded++;
          } else {
            throw new Error('No AI suggestions generated');
          }
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

      this.progress.processed++;
      this.updateSpeed();
      this.updateProgress();

      // Rate limiting
      if (this.options.rateLimitMs && this.options.rateLimitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, this.options.rateLimitMs));
      }
    }

    // Process retry queue
    if (this.retryQueue.length > 0 && this.status === 'running') {
      console.log(`🔄 Processing ${this.retryQueue.length} retries...`);
      this.queue = [...this.retryQueue.map(r => r.answerId)];
      this.retryQueue = [];
      await this.processQueue(categoryId, template);
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
