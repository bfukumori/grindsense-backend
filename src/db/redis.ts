import { Redis } from 'ioredis';
import { env } from '@/config/env';
import { LOG_LEVEL } from '@/types/log-level';

const redisConfig = {
  maxRetriesPerRequest: null,

  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

export const redis = new Redis(env.REDIS_URL, redisConfig);

redis.on('connect', () => {
  console.log('🟢 Redis conectado com sucesso.');
});

redis.on('error', (error) => {
  console.error(
    JSON.stringify({
      level: LOG_LEVEL.ERROR,
      service: 'redis-client',
      message: `Falha na conexão com o Redis: ${error.message}`,
    }),
  );
});

redis.on('reconnecting', () => {
  console.warn(
    JSON.stringify({
      level: LOG_LEVEL.WARN,
      service: 'redis-client',
      message: 'Tentando reconectar ao Redis...',
    }),
  );
});
