import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the sleep between retries to be instant
vi.mock('../client.js', async (importOriginal) => {
  // We need to test the actual module, but we can't easily mock the internal
  // sleep function. Instead, we'll test with the real module and mock fetch.
  const mod = await importOriginal<typeof import('../client')>();
  return mod;
});

// Mock fetch globally before importing the module
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Need to mock the shared module for the import
vi.mock('@ckpt/shared', () => ({
  DEFAULT_API_URL: 'https://test-api.example.com',
}));

import { apiGet, apiPost, healthCheck, ApiError, NetworkError } from '../client';

function mockResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe('apiGet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('makes GET request to correct URL', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { data: 'test' }));

    const result = await apiGet('/api/v1/health');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://test-api.example.com/api/v1/health');
    expect(result).toEqual({ data: 'test' });
  });

  it('throws ApiError on 4xx response without retrying', async () => {
    mockFetch.mockResolvedValue(mockResponse(404, 'not found'));

    await expect(apiGet('/api/v1/missing')).rejects.toThrow(ApiError);
    // 4xx should not retry — only 1 call
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws ApiError on 5xx after retries', async () => {
    mockFetch.mockResolvedValue(mockResponse(500, 'server error'));

    await expect(apiGet('/api/v1/health')).rejects.toThrow(ApiError);
    // Should have retried 3 times
    expect(mockFetch).toHaveBeenCalledTimes(3);
  }, 15_000);

  it('throws NetworkError when fetch fails after retries', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'));

    await expect(apiGet('/api/v1/health')).rejects.toThrow(NetworkError);
    // Should have retried 3 times
    expect(mockFetch).toHaveBeenCalledTimes(3);
  }, 15_000);

  it('passes AbortController signal to fetch', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, {}));

    await apiGet('/api/v1/health');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('apiPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends JSON body with POST method', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: '1' }));

    const result = await apiPost('/api/v1/reasoning/sync', { records: [] });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://test-api.example.com/api/v1/reasoning/sync');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ records: [] });
    expect(result).toEqual({ id: '1' });
  });

  it('throws ApiError on 400 without retrying', async () => {
    mockFetch.mockResolvedValue(mockResponse(400, 'bad request'));

    await expect(
      apiPost('/api/v1/reasoning/sync', { bad: true }),
    ).rejects.toThrow(ApiError);

    // Should only call fetch once — no retries for 4xx
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('healthCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when API is healthy', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { status: 'healthy' }));

    const result = await healthCheck();

    expect(result).toBe(true);
  });

  it('returns false when API is down', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'));

    const result = await healthCheck();

    expect(result).toBe(false);
  }, 15_000);
});
