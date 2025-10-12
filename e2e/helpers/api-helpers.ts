import { APIRequestContext, expect } from '@playwright/test';

/**
 * Test an API endpoint and verify status code
 */
export async function testApiEndpoint(
  request: APIRequestContext,
  endpoint: string,
  expectedStatus: number
): Promise<any> {
  const response = await request.get(endpoint);
  expect(response.status()).toBe(expectedStatus);

  if (response.ok()) {
    return await response.json();
  }

  return null;
}

/**
 * Test rate limiting by sending multiple rapid requests
 */
export async function testRateLimit(
  request: APIRequestContext,
  endpoint: string,
  requestCount: number
): Promise<boolean> {
  const responses: number[] = [];

  // Send rapid requests
  for (let i = 0; i < requestCount; i++) {
    try {
      const response = await request.get(endpoint);
      responses.push(response.status());
    } catch (error) {
      // Request failed, might be rate limited
      responses.push(429);
    }
  }

  // Check if at least one request was rate limited (429)
  return responses.some(status => status === 429);
}

/**
 * Post data to API endpoint
 */
export async function postToApi(
  request: APIRequestContext,
  endpoint: string,
  data: any
): Promise<any> {
  const response = await request.post(endpoint, {
    data: data,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  return {
    status: response.status(),
    body: response.ok() ? await response.json() : await response.text()
  };
}

/**
 * Upload file to API endpoint
 */
export async function uploadFileToApi(
  request: APIRequestContext,
  endpoint: string,
  filePath: string,
  fieldName: string = 'file'
): Promise<any> {
  const response = await request.post(endpoint, {
    multipart: {
      [fieldName]: filePath
    }
  });

  return {
    status: response.status(),
    body: response.ok() ? await response.json() : await response.text()
  };
}

/**
 * Check API health
 */
export async function checkApiHealth(
  request: APIRequestContext,
  baseUrl: string = 'http://localhost:3001'
): Promise<boolean> {
  try {
    const response = await request.get(`${baseUrl}/api/health`);
    return response.ok();
  } catch (error) {
    return false;
  }
}

/**
 * Wait for API to be ready
 */
export async function waitForApiReady(
  request: APIRequestContext,
  baseUrl: string = 'http://localhost:3001',
  maxAttempts: number = 10
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkApiHealth(request, baseUrl)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

