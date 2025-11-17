/**
 * 🧪 Unit Tests for Batch AI Processor
 *
 * Tests batch processing logic including:
 * - Deduplication
 * - Cache checking (NEW!)
 * - Parallel processing
 * - Retry logic
 * - Progress tracking
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BatchAIProcessor } from '../../lib/batchAIProcessor';

function createSupabaseMock() {
  const supabaseMock: any = {};
  supabaseMock.from = vi.fn(() => supabaseMock);
  supabaseMock.select = vi.fn(() => supabaseMock);
  supabaseMock.eq = vi.fn(() => supabaseMock);
  supabaseMock.in = vi.fn(() => supabaseMock);
  supabaseMock.update = vi.fn(() => supabaseMock);
  supabaseMock.single = vi.fn(() => ({ data: null, error: null }));
  return supabaseMock;
}

let supabase: ReturnType<typeof createSupabaseMock>;
var supabaseInstance: ReturnType<typeof createSupabaseMock> | undefined;

function getSupabaseMock() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseMock();
  }
  return supabaseInstance;
}

const resetSupabaseMock = () => {
  const supabase = getSupabaseMock();
  supabase.from.mockReset();
  supabase.from.mockImplementation(() => supabase);
  supabase.select.mockReset();
  supabase.select.mockImplementation(() => supabase);
  supabase.eq.mockReset();
  supabase.eq.mockImplementation(() => supabase);
  supabase.in.mockReset();
  supabase.in.mockImplementation(() => supabase);
  supabase.update.mockReset();
  supabase.update.mockImplementation(() => supabase);
  supabase.single.mockReset();
  supabase.single.mockImplementation(() => ({ data: null, error: null }));
};

vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: () => {
    return getSupabaseMock();
  },
}));

// Mock categorize API
vi.mock('../../api/categorize', () => ({
  categorizeSingleAnswer: vi.fn(async (id: number) => {
    // Simulate successful categorization
    await new Promise(resolve => setTimeout(resolve, 10));
    return [
      {
        code_id: '1',
        code_name: 'Nike',
        confidence: 0.95,
        reasoning: 'Mock suggestion',
      },
    ];
  }),
}));

describe('BatchAIProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupabaseMock();
    supabase = getSupabaseMock();
  });

  describe('Deduplication', () => {
    it('should deduplicate identical answers before processing', async () => {
      // Mock answers with duplicates
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.in
        .mockResolvedValueOnce({
          data: [
            { id: 1, ai_suggestions: null },
            { id: 2, ai_suggestions: null },
            { id: 3, ai_suggestions: null },
            { id: 4, ai_suggestions: null },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
        data: [
          { id: 1, answer_text: 'Nike shoes' },
          { id: 2, answer_text: 'Nike shoes' }, // Duplicate
          { id: 3, answer_text: 'Adidas shoes' },
          { id: 4, answer_text: 'Nike shoes' }, // Duplicate
        ],
        error: null,
      });

      const processor = new BatchAIProcessor({
        concurrency: 2,
      });

      const progressCallback = vi.fn();
      processor['options'].onProgress = progressCallback;

      await processor.startBatch([1, 2, 3, 4], 1);

      // Should only process 2 unique answers (not 4)
      const { categorizeSingleAnswer } = await import('../../api/categorize');

      // Nike shoes appears 3 times, but should only process once
      // Adidas shoes appears 1 time
      // Total: 2 unique answers
      expect(vi.mocked(categorizeSingleAnswer)).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Checking (Performance Optimization)', () => {
    it('should skip answers with recent AI suggestions', async () => {
      const recentTimestamp = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago

      // Mock answers: 2 with cache, 2 without
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.in.mockResolvedValueOnce({
        data: [
          {
            id: 1,
            ai_suggestions: {
              suggestions: [{ code_id: '1', code_name: 'Nike', confidence: 0.9 }],
              timestamp: recentTimestamp, // RECENT - should skip
            },
          },
          {
            id: 2,
            ai_suggestions: null, // NO CACHE - should process
          },
          {
            id: 3,
            ai_suggestions: {
              suggestions: [],
              timestamp: recentTimestamp, // RECENT - should skip
            },
          },
          {
            id: 4,
            ai_suggestions: null, // NO CACHE - should process
          },
        ],
        error: null,
      });

      // Mock for buildDuplicateMap
      supabase.in.mockResolvedValueOnce({
        data: [
          { id: 2, answer_text: 'Adidas' },
          { id: 4, answer_text: 'Puma' },
        ],
        error: null,
      });

      const processor = new BatchAIProcessor();
      await processor.startBatch([1, 2, 3, 4], 1);

      const { categorizeSingleAnswer } = await import('../../api/categorize');

      // Should only process 2 answers (2 and 4), skip 1 and 3 (cached)
      expect(vi.mocked(categorizeSingleAnswer)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(categorizeSingleAnswer)).toHaveBeenCalledWith(2, false);
      expect(vi.mocked(categorizeSingleAnswer)).toHaveBeenCalledWith(4, false);
    });

    it('should process answers with expired cache', async () => {
      const oldTimestamp = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days ago (expired)

      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.in.mockResolvedValueOnce({
        data: [
          {
            id: 1,
            ai_suggestions: {
              suggestions: [],
              timestamp: oldTimestamp, // EXPIRED (>7 days) - should process
            },
          },
        ],
        error: null,
      });

      supabase.in.mockResolvedValueOnce({
        data: [{ id: 1, answer_text: 'Nike' }],
        error: null,
      });

      const processor = new BatchAIProcessor();
      await processor.startBatch([1], 1);

      const { categorizeSingleAnswer } = await import('../../api/categorize');

      // Should process (cache expired)
      expect(vi.mocked(categorizeSingleAnswer)).toHaveBeenCalledWith(1, false);
    });
  });

  describe('Parallel Processing', () => {
    it('should process requests in parallel up to concurrency limit', async () => {
      const processor = new BatchAIProcessor({
        concurrency: 3, // Max 3 parallel
      });

      // Mock 10 answers to process
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.in.mockResolvedValueOnce({
        data: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          ai_suggestions: null,
        })),
        error: null,
      });

      supabase.in.mockResolvedValueOnce({
        data: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          answer_text: `Answer ${i}`,
        })),
        error: null,
      });

      const startTime = Date.now();
      await processor.startBatch(
        Array.from({ length: 10 }, (_, i) => i + 1),
        1
      );
      const duration = Date.now() - startTime;

      // With concurrency=3 and 10ms per request:
      // Sequential: 100ms
      // Parallel (3): ~40ms (10/3 batches * 10ms)
      // Should be significantly faster than sequential
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests up to maxRetries', async () => {
      const { categorizeSingleAnswer } = await import('../../api/categorize');

      // Mock to fail twice, then succeed
      let callCount = 0;
      vi.mocked(categorizeSingleAnswer).mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Temporary error');
        }
        return [{ code_id: '1', code_name: 'Nike', confidence: 0.9, reasoning: 'Test' }];
      });

      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.in.mockResolvedValueOnce({
        data: [{ id: 1, ai_suggestions: null }],
        error: null,
      });

      supabase.in.mockResolvedValueOnce({
        data: [{ id: 1, answer_text: 'Nike' }],
        error: null,
      });

      const processor = new BatchAIProcessor({
        maxRetries: 3,
      });

      await processor.startBatch([1], 1);

      const progress = processor.getProgress();

      // Should succeed after retries, but keep failure count for transparency
      expect(progress.succeeded).toBe(1);
      expect(progress.failed).toBe(2);
      expect(progress.status).toBe('completed');
    });
  });

  describe('Progress Tracking', () => {
    it('should track progress correctly', async () => {
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.in.mockResolvedValueOnce({
        data: [
          { id: 1, ai_suggestions: null },
          { id: 2, ai_suggestions: null },
        ],
        error: null,
      });

      supabase.in.mockResolvedValueOnce({
        data: [
          { id: 1, answer_text: 'Nike' },
          { id: 2, answer_text: 'Adidas' },
        ],
        error: null,
      });

      const progressUpdates: any[] = [];
      const processor = new BatchAIProcessor({
        onProgress: progress => {
          progressUpdates.push({ ...progress });
        },
      });

      await processor.startBatch([1, 2], 1);

      const finalProgress = processor.getProgress();

      expect(finalProgress.total).toBe(2);
      expect(finalProgress.processed).toBe(2);
      expect(finalProgress.status).toBe('completed');
      expect(progressUpdates.length).toBeGreaterThan(0);
    });

    it('should calculate processing speed', async () => {
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.in.mockResolvedValueOnce({
        data: [{ id: 1, ai_suggestions: null }],
        error: null,
      });

      supabase.in.mockResolvedValueOnce({
        data: [{ id: 1, answer_text: 'Nike' }],
        error: null,
      });

      const processor = new BatchAIProcessor();
      await processor.startBatch([1], 1);

      const speed = processor.getSpeed();

      // Speed should be > 0 (answers per second)
      expect(speed).toBeGreaterThan(0);
    });
  });

  describe('Pause/Resume/Cancel', () => {
    it('should pause processing', () => {
      const processor = new BatchAIProcessor();
      processor['status'] = 'running';

      processor.pause();

      expect(processor.getProgress().status).toBe('paused');
    });

    it('should resume processing', () => {
      const processor = new BatchAIProcessor();
      processor['status'] = 'paused';

      processor.resume();

      expect(processor.getProgress().status).toBe('running');
    });

    it('should cancel processing', () => {
      const processor = new BatchAIProcessor();
      processor['status'] = 'running';
      processor['queue'] = [1, 2, 3];

      processor.cancel();

      expect(processor.getProgress().status).toBe('idle');
      expect(processor['queue']).toHaveLength(0);
    });
  });
});
