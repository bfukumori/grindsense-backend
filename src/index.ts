import cluster from 'node:cluster';
import os from 'node:os';
import process from 'node:process';
import { Temporal } from '@js-temporal/polyfill';
import { APP_CONFIG } from './config/app-config';
import { LOG_LEVEL } from './types/log-level';

const logFatal = (error: Error | unknown, type: string) => {
  console.error(
    JSON.stringify({
      level: LOG_LEVEL.FATAL,
      service: APP_CONFIG.serviceName,
      timestamp: Temporal.Now.instant().toString(),
      type,
      message: error instanceof Error ? error?.message : String(error),
      stack: error instanceof Error ? error?.stack : String(error),
    }),
  );
  process.exit(1);
};

process.on('uncaughtException', (error) => logFatal(error, 'uncaughtException'));
process.on('unhandledRejection', (reason) => logFatal(reason, 'unhandledRejection'));

const isProduction = Bun.env.NODE_ENV === 'production';

if (isProduction && cluster.isPrimary) {
  const numCPUs = os.availableParallelism();
  console.log(`Master ${process.pid} is running. Forking ${numCPUs} workers...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died. Forking a new one...`);
    cluster.fork();
  });
} else {
  await import('./server');

  if (isProduction) {
    console.log(`Worker ${process.pid} started`);
  }
}
