import type { Elysia } from 'elysia';
import prometheusPlugin from 'elysia-prometheus';
import pkg from '../../package.json';

export const metrics = (app: Elysia) =>
  app.guard(
    {
      detail: {
        summary: 'Expor Métricas (Prometheus)',
        description:
          'Endpoint técnico que expõe métricas de performance da API (latência, contagem de requisições, uso de memória) no formato compatível com Prometheus. Inclui labels dinâmicos para identificação de User-Agent.',
      },
      tags: ['API Status'],
    },
    (safeApp) =>
      safeApp.use(
        prometheusPlugin({
          metricsPath: '/metrics',
          staticLabels: { service: pkg.name },
          dynamicLabels: {
            userAgent: (ctx) => ctx.request.headers.get('user-agent') ?? 'unknown',
          },
        }),
      ),
  );
