import { cron, Patterns } from '@elysiajs/cron';
import { Elysia } from 'elysia';
import { APP_CONFIG } from './config/app-config';
import { env } from './config/env';
import { healthCheck } from './config/health-check';
import { biometricsRoutes } from './modules/biometrics/biometrics.routes';
import { aggregateHealthMetrics } from './modules/biometrics/health-aggregator.engine';
import { gamificationRoutes } from './modules/gamification/gamification.routes';
import { iotRoutes } from './modules/iot/iot.routes';
import { plannerRoutes } from './modules/planner/planner.routes';
import { profileRoutes } from './modules/profile/profile.routes';
import { authPlugin } from './plugins/auth.plugin';
import { corsPlugin } from './plugins/cors.plugin';
import { dbPlugin } from './plugins/db.plugin';
import { observabilityPlugin } from './plugins/observability.plugin';
import { openApiPlugin } from './plugins/openapi.plugin';

const app = new Elysia({ name: APP_CONFIG.serviceName })
  .use(corsPlugin)
  .use(healthCheck)
  .use(observabilityPlugin)
  .use(openApiPlugin)
  .use(dbPlugin)
  .use(authPlugin)
  .use(biometricsRoutes)
  .use(gamificationRoutes)
  .use(iotRoutes)
  .use(profileRoutes)
  .use(plannerRoutes)
  .use(
    cron({
      name: 'health-aggregation',
      pattern: Patterns.everyMinutes(15),
      async run() {
        console.log(
          '🚀 Worker de Agregação HealthMetrics iniciado (15m interval)',
        );
        try {
          await aggregateHealthMetrics();
        } catch (error) {
          console.error(
            '❌ [Cron: HealthAggregation] Critical failure:',
            error,
          );
        }
      },
    }),
  )
  .listen({ port: env.PORT, idleTimeout: 10 });

console.log(
  `🦊 GrindSense is running at ${app.server?.hostname}:${app.server?.port}`,
);
