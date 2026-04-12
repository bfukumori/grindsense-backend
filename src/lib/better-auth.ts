/** biome-ignore-all lint/suspicious/noExplicitAny: <works> */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { openAPI } from 'better-auth/plugins';
import { env } from '@/config/env';
import { db } from '@/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api',
  plugins: [openAPI()],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
});

let _schema: ReturnType<typeof auth.api.generateOpenAPISchema>;
const getSchema = async () => (_schema ??= auth.api.generateOpenAPISchema());

export const OpenAPI = {
  getPaths: (prefix = '/auth/api') =>
    getSchema().then(({ paths }) => {
      const reference: Record<string, any> = Object.create(null);

      for (const path of Object.keys(paths)) {
        const key = prefix + path;

        if (paths[path]) {
          reference[key] = paths[path];

          for (const method of Object.keys(paths[path])) {
            const operation = reference[key][method];

            operation.tags = ['Better Auth'];
          }
        }
      }

      return reference;
    }) as Promise<any>,
  components: getSchema().then(({ components }) => components) as Promise<any>,
} as const;
