import { Temporal } from '@js-temporal/polyfill';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { eq, inArray } from 'drizzle-orm';
import type { Database } from '@/db';
import { redis } from '@/db/redis';
import { heartRateLogs, iotDevices } from '@/db/schema';
import { AppError } from '@/utils/app-error';

const tracer = trace.getTracer('iot-service');

export interface TelemetryEvent {
  messageId: string;
  deviceId: string;
  payload: { bpm: number; spo2?: number; timestamp: number };
}

export class IotService {
  constructor(private readonly db: Database) {}

  async claimDevice(userId: string, macAddress: string) {
    const [device] = await this.db
      .update(iotDevices)
      .set({ userId, status: 'ACTIVE' })
      .where(eq(iotDevices.macAddress, macAddress))
      .returning();

    if (!device)
      throw new AppError(404, 'Dispositivo não encontrado ou não fabricado.');
    return { id: device.id, name: device.name, status: device.status };
  }

  async processBatch(events: TelemetryEvent[]) {
    if (events.length === 0) return;

    return await tracer.startActiveSpan(
      `IoT: Process Batch (${events.length})`,
      async (span) => {
        try {
          const uniqueDeviceIds = [...new Set(events.map((e) => e.deviceId))];
          const deviceUserMap = new Map<string, string>();

          const pipeline = redis.pipeline();

          for (const id of uniqueDeviceIds) {
            pipeline.get(`device:user:${id}`);
          }

          const cacheResults = await pipeline.exec();

          const missingDeviceIds: string[] = [];

          uniqueDeviceIds.forEach((id, index) => {
            const userId = cacheResults?.[index]?.[1] as string | null;
            if (userId) {
              deviceUserMap.set(id, userId);
            } else {
              missingDeviceIds.push(id);
            }
          });

          if (missingDeviceIds.length > 0) {
            const dbDevices = await this.db
              .select({ id: iotDevices.id, userId: iotDevices.userId })
              .from(iotDevices)
              .where(inArray(iotDevices.id, missingDeviceIds));

            const cachePipeline = redis.pipeline();
            for (const device of dbDevices) {
              if (device.userId) {
                deviceUserMap.set(device.id, device.userId);
                cachePipeline.set(
                  `device:user:${device.id}`,
                  device.userId,
                  'EX',
                  86400,
                );
              }
            }
            await cachePipeline.exec();
          }

          // 2. Preparar os dados para o Bulk Insert do Drizzle
          const recordsToInsert = events.flatMap((e) => {
            const userId = deviceUserMap.get(e.deviceId);

            if (!userId) return [];

            return [
              {
                userId,
                deviceId: e.deviceId,
                measuredAt: Temporal.Instant.fromEpochMilliseconds(
                  e.payload.timestamp,
                ),
                bpm: e.payload.bpm,
                spo2: e.payload.spo2,
              },
            ];
          });

          if (recordsToInsert.length === 0) return;

          // 3. Bulk Insert (Uma única query no banco para salvar N eventos)
          await this.db
            .insert(heartRateLogs)
            .values(recordsToInsert)
            .onConflictDoNothing({
              target: [heartRateLogs.deviceId, heartRateLogs.measuredAt],
            });
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }
}
