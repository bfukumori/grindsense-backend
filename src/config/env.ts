import { z } from 'zod';
import { APP_CONFIG } from './app-config';

const envSchema = z.object({
  DATABASE_URL: z.url().default('postgres://usuario:senha@localhost:5432/grindsense'),
  DATABASE_TEST_URL: z.url().default('postgres://usuario:senha@localhost:5432/grindsense_test'),
  PORT: z.coerce.number().default(3000),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.url(),
  REDIS_URL: z.url(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().default('http://localhost:4318/v1/traces'),
  OTEL_SERVICE_NAME: z.string().default(APP_CONFIG.serviceName),
});

export const env = envSchema.parse(process.env);
