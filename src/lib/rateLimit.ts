/**
 * 🚦 Rate Limiter for API Calls
 *
 * Prevents exceeding OpenAI rate limits by queueing requests
 * and processing them at a controlled rate.
 */

/**
 * Generic rate limiter class
 *
 * Queues async functions and executes them at a controlled rate
 * to prevent hitting API rate limits.
 */
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerMinute: number;
  private interval: number;
  private lastRequestTime = 0;

  /**
   * Create a new rate limiter
   *
   * @param requestsPerMinute - Maximum requests allowed per minute (default: 10)
   */
  constructor(requestsPerMinute: number = 10) {
    this.requestsPerMinute = requestsPerMinute;
    this.interval = 60000 / this.requestsPerMinute; // Convert to milliseconds between requests
  }

  /**
   * Add a function to the rate-limited queue
   *
   * @param fn - Async function to execute
   * @returns Promise that resolves with the function's result
   *
   * @example
   * ```typescript
   * const result = await rateLimiter.add(() => fetch('/api/data'));
   * ```
   */
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      // Start processing the queue if not already processing
      this.process();
    });
  }

  /**
   * Process the queue at controlled intervals
   */
  private async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        // Calculate time since last request
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const timeToWait = Math.max(0, this.interval - timeSinceLastRequest);

        // Wait if necessary to maintain rate limit
        if (timeToWait > 0) {
          console.log(`🚦 Rate limiter: Waiting ${timeToWait}ms before next request`);
          await new Promise(resolve => setTimeout(resolve, timeToWait));
        }

        // Execute the function
        await fn();
        this.lastRequestTime = Date.now();
      }
    }

    this.processing = false;
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      requestsPerMinute: this.requestsPerMinute,
      intervalMs: this.interval,
    };
  }

  /**
   * Clear the queue (use with caution)
   */
  clear() {
    this.queue = [];
    this.processing = false;
    console.log('🚦 Rate limiter queue cleared');
  }
}

/**
 * Global rate limiter for OpenAI API calls
 *
 * Default: 10 requests per minute (safe for free tier)
 * Paid tier can increase to 60+ requests per minute
 */
export const openaiRateLimiter = new RateLimiter(10);

/**
 * Higher rate limiter for paid OpenAI accounts
 *
 * Use this if you have a paid OpenAI account with higher limits
 * Uncomment and export to use instead of the default limiter
 */
// export const openaiRateLimiterPaid = new RateLimiter(60);

/**
 * Utility: Wait for a specified duration
 *
 * @param ms - Milliseconds to wait
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Utility: Retry a function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in ms for exponential backoff (default: 1000)
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => fetch('/api/data'),
 *   3,
 *   1000
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        // Don't retry on auth errors (401, 403) or bad requests (400)
        if (status === 401 || status === 403 || status === 400) {
          throw error;
        }
      }

      // Last attempt - throw error
      if (attempt === maxRetries - 1) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await wait(delay);
    }
  }

  throw lastError!;
}
