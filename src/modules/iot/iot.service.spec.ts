import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { heartRateLogs, iotDevices } from '@/db/schema';
import { seedTestUser, truncateDb } from '@/tests/db-setup';
import { IotService, type TelemetryEvent } from './iot.service';

// 1. Definição do Mock de Pipeline (Chainable API Segura)
const mockPipelineGet = mock();
const mockPipelineSet = mock();
const mockPipelineExec = mock().mockResolvedValue([]); // Simula Cache Miss em todos os testes

const mockPipeline = {
  get: mockPipelineGet,
  set: mockPipelineSet,
  exec: mockPipelineExec,
};

// Faz com que os métodos retornem o próprio objeto para permitir: pipeline.get().set().exec()
mockPipelineGet.mockReturnValue(mockPipeline);
mockPipelineSet.mockReturnValue(mockPipeline);

mock.module('@/db/redis', () => ({
  redis: {
    pipeline: mock().mockReturnValue(mockPipeline),
  },
}));

describe('IotService (Integration) - Micro-batching', () => {
  let service: IotService;
  const testUserId = 'user-1';
  const deviceId1 = 'device-1';
  const deviceId2 = 'device-2';

  beforeEach(async () => {
    await truncateDb();
    await seedTestUser(testUserId);

    // 2. Prevenção de Leak: Limpa as chamadas do mock antes de cada teste
    mockPipelineGet.mockClear();
    mockPipelineSet.mockClear();
    mockPipelineExec.mockClear();

    await db.insert(iotDevices).values([
      {
        id: deviceId1,
        userId: testUserId,
        name: 'Apple Watch',
        status: 'ACTIVE',
        secret: 'secret1',
        deviceType: 'STATION',
        macAddress: '00:11:22:33:44:55',
      },
      {
        id: deviceId2,
        userId: testUserId,
        name: 'Polar H10',
        status: 'ACTIVE',
        secret: 'secret2',
        deviceType: 'STATION',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      },
    ]);

    service = new IotService(db);
  });

  it('it should perform bulk insert, ignore duplicates, and hydrate the Redis cache', async () => {
    const timestamp = Date.now();
    const events: TelemetryEvent[] = [
      {
        messageId: '1-0',
        deviceId: deviceId1,
        payload: { bpm: 60, timestamp },
      },
      {
        messageId: '2-0',
        deviceId: deviceId2,
        payload: { bpm: 65, timestamp: timestamp + 1000 },
      },
      {
        messageId: '3-0',
        deviceId: deviceId1,
        payload: { bpm: 60, timestamp },
      }, // Duplicata intencional
    ];

    await service.processBatch(events);

    // Assert: Banco de Dados (Idempotência)
    const logs = await db.select().from(heartRateLogs).where(eq(heartRateLogs.userId, testUserId));
    expect(logs.length).toBe(2);

    const watchLog = logs.find((l) => l.deviceId === deviceId1);
    expect(watchLog?.bpm).toBe(60);

    // 3. Assert: Infraestrutura (Redis Cache Hydration)
    // Garante que o fallback populou o cache para evitar consultas repetidas no banco no próximo batch
    expect(mockPipelineSet).toHaveBeenCalledTimes(2); // 1x para cada device único
    expect(mockPipelineSet).toHaveBeenCalledWith(
      `device:user:${deviceId1}`,
      testUserId,
      'EX',
      86400,
    );
    expect(mockPipelineSet).toHaveBeenCalledWith(
      `device:user:${deviceId2}`,
      testUserId,
      'EX',
      86400,
    );
  });

  it('it should ignore events from orphaned hardware (without associated user)', async () => {
    const events: TelemetryEvent[] = [
      {
        messageId: '1-0',
        deviceId: 'HACKER-DEVICE-99',
        payload: { bpm: 120, timestamp: Date.now() },
      },
    ];

    await service.processBatch(events);

    const logs = await db.select().from(heartRateLogs);
    expect(logs.length).toBe(0);

    // Como o device não existe no DB, ele não deve tentar hidratar o cache com null/undefined
    expect(mockPipelineSet).not.toHaveBeenCalled();
  });
});
