import { SpanStatusCode, type Tracer } from '@opentelemetry/api';
import { AppError } from './app-error';

export async function fetchTracing(
  url: string,
  options: RequestInit,
  spanName: string,
  tracer: Tracer,
) {
  return await tracer.startActiveSpan(spanName, async (span) => {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(3000),
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        span.setAttribute('http.status_code', response.status);
        span.setStatus({ code: SpanStatusCode.ERROR, message: errorText });

        if (response.status === 401) throw new AppError(401, 'Token inválido ou expirado.');
        throw new AppError(502, `Erro na API Externa: ${errorText}`);
      }
      return response;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
