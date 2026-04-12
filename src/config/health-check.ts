import { Temporal } from '@js-temporal/polyfill';
import { sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { dbPlugin } from '@/plugins/db.plugin';
import { LOG_LEVEL } from '@/types/log-level';
import { APP_CONFIG } from './app-config';

export const healthCheck = new Elysia({ name: 'controller:health-check' }).use(dbPlugin).get(
  '/health',
  async ({ set, db }) => {
    try {
      await db.execute(sql`SELECT 1`);
      return {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Temporal.Now.instant().toString(),
      };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.warn(
        JSON.stringify({
          level: LOG_LEVEL.WARN,
          service: APP_CONFIG.serviceName,
          path: '/health',
          message: `Health check failed: ${errorMessage}`,
          timestamp: Temporal.Now.instant().toString(),
        }),
      );
      set.status = 503;
      return { status: 'error', reason: 'database_unreachable' };
    }
  },
  {
    response: {
      200: t.Object({
        status: t.String({ default: 'ok' }),
        uptime: t.Number({
          description: 'Tempo em segundos que o servidor está no ar',
        }),
        timestamp: t.String({ description: 'Momento exato da checagem' }),
      }),
      503: t.Object({
        status: t.String({ default: 'error' }),
        reason: t.String({ default: 'database_unreachable' }),
      }),
    },
    detail: {
      tags: ['API Status'],
      summary: 'Status do Sistema (Health Check)',
      description:
        'Verifica se a API está online e consegue se comunicar com o banco de dados. Rota essencial para orquestradores (como Docker/Kubernetes) e serviços de monitoramento.',
    },
  },
);
