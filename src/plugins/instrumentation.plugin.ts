import { opentelemetry } from '@elysiajs/opentelemetry';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import {
  BatchSpanProcessor,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import { env } from '@/config/env';

export const instrumentation = opentelemetry({
  serviceName: env.OTEL_SERVICE_NAME,
  instrumentations: [
    new PgInstrumentation({
      enhancedDatabaseReporting: true,
    }),
  ],
  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: env.OTEL_EXPORTER_OTLP_ENDPOINT,
      }),
    ),
  ],
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(1.0),
  }),
});
