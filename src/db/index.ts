import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { APP_CONFIG } from '@/config/app-config';
import { env } from '@/config/env';
import { LOG_LEVEL } from '@/types/log-level';
import * as schema from './schema';

const isTest = Bun.env.NODE_ENV === 'test';
const connectionString = isTest ? env.DATABASE_TEST_URL : env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Database URL não encontrada para este ambiente.');
}

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 10000,
  max: 40,
  allowExitOnIdle: false,
});

pool.on('error', (err) => {
  console.error(
    JSON.stringify({
      level: LOG_LEVEL.ERROR,
      service: APP_CONFIG.serviceName,
      message: 'Postgres Pool Error',
      error: err.message,
    }),
  );
});

export const db = drizzle(pool, { schema, casing: 'snake_case' });
export type Database = NodePgDatabase<typeof schema>;
