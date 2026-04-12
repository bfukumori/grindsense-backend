/** biome-ignore-all lint/suspicious/noExplicitAny: <tests> */
import { afterEach, beforeEach, describe, expect, it, type Mock, mock, spyOn } from 'bun:test';
import type { Tracer } from '@opentelemetry/api';
import { AppError } from './app-error';
import { fetchTracing } from './fetch-tracing';

describe('#fetchTracing utility (unit test)', () => {
  let mockSpan: any;
  let mockTracer: Tracer;

  let fetchSpy: Mock<typeof fetch>;

  beforeEach(() => {
    mockSpan = {
      setAttribute: mock(),
      setStatus: mock(),
      recordException: mock(),
      end: mock(),
    };

    mockTracer = {
      startActiveSpan: mock(async (_name: string, callback: (span: any) => Promise<any>) => {
        return await callback(mockSpan);
      }),
    } as unknown as Tracer;

    fetchSpy = spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should perform the request successfully and end the span (Happy Path)', async () => {
    fetchSpy.mockResolvedValue(new Response('{"data": "ok"}', { status: 200 }));

    const response = await fetchTracing('https://api.fitbit.com/test', {}, 'TestSpan', mockTracer);

    expect(response.status).toBe(200);
    expect(mockTracer.startActiveSpan).toHaveBeenCalled();
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('should throw AppError(401) if the API returns status 401 (Expired Token)', async () => {
    fetchSpy.mockResolvedValue(new Response('Unauthorized', { status: 401 }));

    try {
      await fetchTracing('https://api.fitbit.com/test', {}, 'TestSpan', mockTracer);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      if (error instanceof AppError) {
        expect(error.statusCode).toBe(401);
      }
    }
  });

  it('should throw AppError(502) for other external API HTTP errors', async () => {
    fetchSpy.mockResolvedValue(new Response('Internal Server Error', { status: 500 }));

    try {
      await fetchTracing('https://api.fitbit.com/test', {}, 'TestSpan', mockTracer);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      if (error instanceof AppError) {
        expect(error.statusCode).toBe(502);
      }
    }
  });

  it('should rethrow the original error and set the span status to ERROR in case of network failure or timeout', async () => {
    const networkError = new Error('Connection failure or Timeout');

    fetchSpy.mockRejectedValue(networkError);

    try {
      await fetchTracing('https://api.fitbit.com/test', {}, 'TestSpan', mockTracer);
      expect.unreachable();
    } catch (error) {
      expect(error).toBe(networkError);
    }
  });
});
