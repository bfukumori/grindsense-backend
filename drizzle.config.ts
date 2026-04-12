import { defineConfig } from 'drizzle-kit';

const isTest = Bun.env.NODE_ENV === 'test';
const dbUrl = isTest ? Bun.env.DATABASE_TEST_URL : Bun.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    'DATABASE_URL ou DATABASE_TEST_URL não encontrada no arquivo .env',
  );
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: dbUrl,
  },
  verbose: true,
  strict: true,
});
