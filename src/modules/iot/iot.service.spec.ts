import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { heartRateLogs, iotDevices } from '@/db/schema';
import { seedTestUser, truncateDb } from '@/tests/db-setup';
import { AppError } from '@/utils/app-error';
import { IotService, type TelemetryEvent } from './iot.service';

const mockPipelineGet = mock();
const mockPipelineSet = mock();
const mockPipelineExec = mock().mockResolvedValue([]);

const mockPipeline = {
  get: mockPipelineGet,
  set: mockPipelineSet,
  exec: mockPipelineExec,
};

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
      },
    ];

    await service.processBatch(events);

    const logs = await db.select().from(heartRateLogs).where(eq(heartRateLogs.userId, testUserId));
    expect(logs.length).toBe(2);

    const watchLog = logs.find((l) => l.deviceId === deviceId1);
    expect(watchLog?.bpm).toBe(60);

    expect(mockPipelineSet).toHaveBeenCalledTimes(2);
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

    expect(mockPipelineSet).not.toHaveBeenCalled();
  });
});

describe('IotService (Integration) - Claim Device', () => {
  let service: IotService;
  const testUserId = 'user-claim-test';

  beforeEach(async () => {
    await truncateDb();
    await seedTestUser(testUserId);
    service = new IotService(db);
  });

  it('it should successfully claim a provisioned device and set its status to ACTIVE', async () => {
    const claimMacAddress = '11:22:33:44:55:66';

    await db.insert(iotDevices).values({
      id: 'unclaimed-device-1',
      userId: testUserId,
      name: 'Smart Ring Tracker',
      status: 'PROVISIONED',
      secret: 'provision-secret',
      deviceType: 'WEARABLE',
      macAddress: claimMacAddress,
    });

    const result = await service.claimDevice(testUserId, claimMacAddress);

    expect(result.id).toBe('unclaimed-device-1');
    expect(result.name).toBe('Smart Ring Tracker');
    expect(result.status).toBe('ACTIVE');

    const [dbDevice] = await db
      .select()
      .from(iotDevices)
      .where(eq(iotDevices.macAddress, claimMacAddress));

    expect(dbDevice?.userId).toBe(testUserId);
    expect(dbDevice?.status).toBe('ACTIVE');
  });

  it('it should throw AppError 404 (Fail-fast) if the MAC address does not exist', async () => {
    const fakeMacAddress = 'FF:FF:FF:FF:FF:FF';

    expect(service.claimDevice(testUserId, fakeMacAddress)).rejects.toThrow(
      new AppError(404, 'Dispositivo não encontrado ou não fabricado.'),
    );
  });
});
