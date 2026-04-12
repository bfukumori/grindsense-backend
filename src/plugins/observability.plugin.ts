import { Temporal } from '@js-temporal/polyfill';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { type Elysia, InvertedStatusMap, ValidationError } from 'elysia';
import { APP_CONFIG } from '@/config/app-config';
import { instrumentation } from '@/plugins/instrumentation.plugin';
import { LOG_LEVEL } from '@/types/log-level';
import { AppError } from '@/utils/app-error';
import { formatElysiaValidationError } from '@/utils/format-elysia-validation-error';
import { metrics } from './metrics.plugin';

const excludePaths = ['/metrics', '/health', '/docs'];

export const observabilityPlugin = (app: Elysia) =>
  app
    .use(instrumentation)
    .use(metrics)
    .onError(({ request, error, code, path, set }) => {
      if (excludePaths.some((p) => path.startsWith(p))) return;
      console.log(error);

      if (error instanceof AppError) {
        set.status = error.statusCode;

        return {
          error:
            InvertedStatusMap[
              error.statusCode as keyof typeof InvertedStatusMap
            ] || 'UNKNOWN_ERROR',
          message: error.message,
        };
      }

      if (code === 'VALIDATION' && error instanceof ValidationError) {
        set.status = 400;
        return formatElysiaValidationError(error);
      }

      if (code === 'NOT_FOUND') {
        set.status = 404;
        return {
          error: 'NOT_FOUND',
          message: `The requested route (${path}) does not exist.`,
        };
      }

      const isAppError = error instanceof AppError;
      const statusCode = isAppError ? error.statusCode : 500;
      const message = isAppError ? error.message : 'Unknown server error.';
      const activeSpan = trace.getActiveSpan();

      console.error(
        JSON.stringify({
          level: statusCode >= 500 ? LOG_LEVEL.ERROR : LOG_LEVEL.WARN,
          timestamp: Temporal.Now.instant().toString(),
          service: APP_CONFIG.serviceName,
          method: request.method,
          path,
          status: statusCode,
          error_code: code,
          message,
          traceId: activeSpan?.spanContext().traceId,
        }),
      );

      if (activeSpan) {
        activeSpan.recordException(new Error(message));
        if (statusCode >= 500) {
          activeSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message,
          });
        }
      }

      set.status = statusCode;
      return { error: message, message: 'Unknown server error.' };
    })
    .onAfterResponse(({ request, path, set }) => {
      if (excludePaths.some((p) => path.startsWith(p))) return;

      const statusCode = typeof set.status === 'number' ? set.status : 200;
      if (statusCode >= 400) return;

      const activeSpan = trace.getActiveSpan();

      console.log(
        JSON.stringify({
          level: LOG_LEVEL.INFO,
          service: APP_CONFIG.serviceName,
          timestamp: Temporal.Now.instant().toString(),
          method: request.method,
          path,
          status: statusCode,
          traceId: activeSpan?.spanContext().traceId,
        }),
      );
    })
    .as('global');
