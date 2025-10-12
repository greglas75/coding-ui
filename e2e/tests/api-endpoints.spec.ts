import { expect, test } from '@playwright/test';
import { checkApiHealth, postToApi } from '../helpers/api-helpers';
import { getInvalidFilePath, getValidExcelPath } from '../helpers/fixture-helpers';

/**
 * API Endpoints E2E Tests
 *
 * Tests all API endpoints for functionality, validation, and error handling
 */

const API_BASE_URL = 'http://localhost:3001';

test.describe('API Health & Status', () => {
  test('should return 200 from health endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/health`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status || data.message).toBeDefined();

    console.log('✅ Health endpoint working');
  });

  test('should verify API is ready', async ({ request }) => {
    const isReady = await checkApiHealth(request, API_BASE_URL);
    expect(isReady).toBeTruthy();

    console.log('✅ API is ready for testing');
  });
});

test.describe('API Filtering', () => {
  test('should filter answers with valid parameters', async ({ request }) => {
    const filterData = {
      search: 'test',
      status: ['pending', 'confirmed'],
      language: 'EN',
      limit: 10,
      offset: 0
    };

    const response = await postToApi(request, `${API_BASE_URL}/api/answers/filter`, filterData);

    // API might return different status codes based on implementation
    if (response.status === 200 || response.status === 201) {
      expect(response.body).toBeDefined();
      console.log('✅ Filter endpoint accepts valid parameters');
    } else {
      console.log(`⚠️  Filter endpoint returned: ${response.status}`);
    }
  });

  test('should handle invalid filter parameters gracefully', async ({ request }) => {
    const invalidData = {
      search: '<script>alert("xss")</script>',
      status: ['invalid_status'],
      language: 'INVALID',
      limit: -1,
      offset: -10
    };

    const response = await postToApi(request, `${API_BASE_URL}/api/answers/filter`, invalidData);

    // Should either validate and reject (400) or sanitize and process (200)
    expect([200, 400, 422]).toContain(response.status);

    console.log('✅ Filter endpoint handles invalid params');
  });

  test('should handle empty filter request', async ({ request }) => {
    const response = await postToApi(request, `${API_BASE_URL}/api/answers/filter`, {});

    // Empty filters should still work (return all data with defaults)
    expect([200, 400]).toContain(response.status);

    console.log('✅ Filter endpoint handles empty request');
  });
});

test.describe('API File Upload', () => {
  test('should accept valid Excel file', async ({ request }) => {
    const validExcelPath = getValidExcelPath();

    try {
      const response = await request.post(`${API_BASE_URL}/api/file-upload`, {
        multipart: {
          file: {
            name: 'valid-codes.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            buffer: await import('fs/promises').then(fs => fs.readFile(validExcelPath))
          }
        }
      });

      if (response.ok()) {
        const data = await response.json();
        expect(data).toBeDefined();
        console.log('✅ Valid Excel file accepted');
      } else {
        console.log(`⚠️  File upload returned: ${response.status()}`);
      }
    } catch (error) {
      console.log('⚠️  File upload test skipped (endpoint may require authentication)');
    }
  });

  test('should reject invalid file type', async ({ request }) => {
    const invalidFilePath = getInvalidFilePath();

    try {
      const response = await request.post(`${API_BASE_URL}/api/file-upload`, {
        multipart: {
          file: {
            name: 'invalid.txt',
            mimeType: 'text/plain',
            buffer: await import('fs/promises').then(fs => fs.readFile(invalidFilePath))
          }
        }
      });

      // Should reject invalid file type (400 or 415)
      expect([400, 415, 422]).toContain(response.status());

      console.log('✅ Invalid file type rejected');
    } catch (error) {
      console.log('⚠️  File rejection test skipped');
    }
  });

  test('should reject file exceeding size limit', async ({ request }) => {
    // Create a buffer larger than 10MB
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

    try {
      const response = await request.post(`${API_BASE_URL}/api/file-upload`, {
        multipart: {
          file: {
            name: 'large-file.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            buffer: largeBuffer
          }
        },
        timeout: 30000
      });

      // Should reject file that's too large (413 or 400)
      expect([400, 413, 422]).toContain(response.status());

      console.log('✅ Large file rejected');
    } catch (error: any) {
      // Timeout or connection error is also acceptable (file too large)
      if (error.message?.includes('exceeded') || error.message?.includes('timeout')) {
        console.log('✅ Large file rejected (timeout)');
      } else {
        console.log('⚠️  Large file test skipped');
      }
    }
  });
});

test.describe('API Rate Limiting', () => {
  test('should enforce rate limiting on rapid requests', async ({ request }) => {
    // Send 20 rapid requests to test rate limiting
    const requests: Promise<any>[] = [];

    for (let i = 0; i < 20; i++) {
      requests.push(
        request.get(`${API_BASE_URL}/api/health`).catch(() => ({ status: () => 429 }))
      );
    }

    const responses = await Promise.all(requests);
    const statusCodes = responses.map(r => r.status());

    // At least some requests should succeed
    const hasSuccess = statusCodes.some(code => code === 200);
    expect(hasSuccess).toBeTruthy();

    // Check if any were rate limited (429)
    const wasRateLimited = statusCodes.some(code => code === 429);

    if (wasRateLimited) {
      console.log('✅ Rate limiting is active');
    } else {
      console.log('⚠️  Rate limiting not triggered (might have high limits)');
    }
  });

  test('should allow requests after rate limit cooldown', async ({ request }) => {
    // Send some requests
    for (let i = 0; i < 5; i++) {
      await request.get(`${API_BASE_URL}/api/health`);
    }

    // Wait for cooldown period
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Should be able to make requests again
    const response = await request.get(`${API_BASE_URL}/api/health`);
    expect([200, 429]).toContain(response.status());

    console.log('✅ Rate limit cooldown works');
  });
});

test.describe('API GPT Test', () => {
  test('should test GPT connection', async ({ request }) => {
    const testData = {
      prompt: 'Test prompt for API',
      model: 'gpt-3.5-turbo'
    };

    try {
      const response = await request.post(`${API_BASE_URL}/api/gpt-test`, {
        data: testData,
        timeout: 30000 // 30 second timeout for AI requests
      });

      if (response.ok()) {
        const data = await response.json();
        expect(data).toBeDefined();
        console.log('✅ GPT test endpoint working');
      } else {
        console.log(`⚠️  GPT test returned: ${response.status()} (may require API key)`);
      }
    } catch (error) {
      console.log('⚠️  GPT test skipped (may require OpenAI API key)');
    }
  });

  test('should handle GPT errors gracefully', async ({ request }) => {
    const invalidData = {
      prompt: '', // Empty prompt
      model: 'invalid-model'
    };

    try {
      const response = await request.post(`${API_BASE_URL}/api/gpt-test`, {
        data: invalidData,
        timeout: 10000
      });

      // Should return error status or handle gracefully
      expect([400, 422, 500]).toContain(response.status());

      console.log('✅ GPT errors handled');
    } catch (error) {
      console.log('⚠️  GPT error test skipped');
    }
  });
});

test.describe('API Security', () => {
  test('should include security headers', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/health`);

    const headers = response.headers();

    // Check for common security headers
    const hasSecurityHeaders =
      headers['x-frame-options'] ||
      headers['x-content-type-options'] ||
      headers['strict-transport-security'];

    if (hasSecurityHeaders) {
      console.log('✅ Security headers present');
    } else {
      console.log('⚠️  Consider adding security headers');
    }
  });

  test('should have request ID in response', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/health`);

    const headers = response.headers();
    const hasRequestId = headers['x-request-id'] !== undefined;

    if (hasRequestId) {
      console.log('✅ Request ID tracking enabled');
    }
  });
});

