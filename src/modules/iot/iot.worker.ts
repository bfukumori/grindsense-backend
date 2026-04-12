import { APP_CONFIG } from '@/config/app-config';
import { db } from '@/db';
import { redis } from '@/db/redis';
import { LOG_LEVEL } from '@/types/log-level';
import { IotService, type TelemetryEvent } from './iot.service';

type RedisStreamMessage = [string, string[]];
type RedisStreamEntry = [string, RedisStreamMessage[]];
type XReadGroupResponse = RedisStreamEntry[] | null;

const STREAM_KEY = 'stream:iot_telemetry';
const GROUP_NAME = 'iot_workers';
const CONSUMER_NAME = `worker_${Bun.randomUUIDv7()}`;

const iotService = new IotService(db);
let isShuttingDown = false;

async function processStreamResults(results: XReadGroupResponse) {
  if (!results || results.length === 0) return false;

  const firstStream = results[0];
  if (!firstStream) return false;

  const messages = firstStream[1];
  if (messages.length === 0) return false;

  const batch: TelemetryEvent[] = [];

  for (const [messageId, fields] of messages) {
    const dataMap = new Map();
    for (let i = 0; i < fields.length; i += 2) dataMap.set(fields[i], fields[i + 1]);

    batch.push({
      messageId,
      deviceId: dataMap.get('deviceId'),
      payload: JSON.parse(dataMap.get('payload')),
    });
  }

  await iotService.processBatch(batch);

  const messageIds = batch.map((b) => b.messageId);
  await redis.xack(STREAM_KEY, GROUP_NAME, ...messageIds);

  return true;
}

async function recoverPendingMessages() {
  console.log(`♻️ Recuperando mensagens não confirmadas (PEL) para ${CONSUMER_NAME}...`);
  let hasPending = true;

  while (hasPending && !isShuttingDown) {
    try {
      // ID '0' solicita as mensagens pendentes (já entregues a este consumer, mas não com XACK)
      const results = (await redis.xreadgroup(
        'GROUP',
        GROUP_NAME,
        CONSUMER_NAME,
        'COUNT',
        500,
        'STREAMS',
        STREAM_KEY,
        '0',
      )) as XReadGroupResponse;

      hasPending = await processStreamResults(results);
    } catch (error) {
      console.error('[Worker: PEL Recovery]', error);
      await Bun.sleep(2000);
    }
  }
}

async function initGroup() {
  try {
    await redis.xgroup('CREATE', STREAM_KEY, GROUP_NAME, '0', 'MKSTREAM');
    console.log('📦 Redis Consumer Group criado.');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes('BUSYGROUP')) throw error;
  }
}

async function startWorker() {
  await initGroup();
  console.log(`🚀 Worker IoT Iniciado: ${CONSUMER_NAME}`);

  await recoverPendingMessages();

  while (!isShuttingDown) {
    try {
      const results = (await redis.xreadgroup(
        'GROUP',
        GROUP_NAME,
        CONSUMER_NAME,
        'COUNT',
        500,
        'BLOCK',
        2000,
        'STREAMS',
        STREAM_KEY,
        '>', // '>' significa "me dê mensagens que nunca foram entregues"
      )) as XReadGroupResponse;

      await processStreamResults(results);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(
        JSON.stringify({
          level: LOG_LEVEL.ERROR,
          service: APP_CONFIG.serviceName,
          path: 'Worker: Stream',
          message: `Falha ao processar Batch: ${errorMessage}`,
        }),
      );
      // Se der erro, não damos o XACK. As mensagens ficam na PEL (Pending Entries List).
      // Um sleep aqui evita que o loop quebre a CPU se o banco cair
      await Bun.sleep(1000);
    }
  }
}

startWorker();

// Graceful Shutdown
process.on('SIGINT', () => {
  isShuttingDown = true;
});
process.on('SIGTERM', () => {
  isShuttingDown = true;
});
