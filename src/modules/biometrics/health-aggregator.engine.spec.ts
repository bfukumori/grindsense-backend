/** biome-ignore-all lint/style/noNonNullAssertion: <tests> */
import { beforeEach, describe, expect, it } from 'bun:test';
import { Temporal } from '@js-temporal/polyfill';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { heartRateLogs, hourlyHealthMetrics } from '@/db/schema';
import { seedTestUser, truncateDb } from '@/tests/db-setup';
import { aggregateHealthMetrics } from './health-aggregator.engine';

describe('Health Aggregator Worker (Integration)', () => {
  const testUserId = 'user-aggregator-test';

  beforeEach(async () => {
    await truncateDb();
    await seedTestUser(testUserId);
  });

  it('should group multiple raw logs from the same hour into a single bucket', async () => {
    const baseTime = Temporal.Now.instant().subtract({ minutes: 30 });
    const hourStart = `${baseTime.toString().split(':')[0]}:00:00Z`;
    const expectedBucket = Temporal.Instant.from(hourStart);

    await db.insert(heartRateLogs).values([
      {
        userId: testUserId,
        bpm: 60,
        spo2: 98,
        measuredAt: baseTime.subtract({ minutes: 5 }),
      },
      { userId: testUserId, bpm: 80, spo2: 96, measuredAt: baseTime },
      {
        userId: testUserId,
        bpm: 100,
        spo2: 100,
        measuredAt: baseTime.add({ minutes: 5 }),
      },
    ]);

    await aggregateHealthMetrics();

    const metrics = await db
      .select()
      .from(hourlyHealthMetrics)
      .where(
        and(
          eq(hourlyHealthMetrics.userId, testUserId),
          eq(hourlyHealthMetrics.bucketHour, expectedBucket),
        ),
      );

    expect(metrics.length).toBe(1);
    expect(metrics[0]!.avgBpm).toBe(80);
    expect(metrics[0]!.avgSpo2).toBe(98);
  });

  it('should update the existing bucket (Upsert) when new logs arrive for the same hour', async () => {
    const baseTime = Temporal.Now.instant().subtract({ minutes: 10 });

    await db.insert(heartRateLogs).values({
      userId: testUserId,
      bpm: 100,
      measuredAt: baseTime,
    });
    await aggregateHealthMetrics();

    const [firstPass] = await db.select().from(hourlyHealthMetrics);
    expect(firstPass!.avgBpm).toBe(100);

    await db.insert(heartRateLogs).values({
      userId: testUserId,
      bpm: 60,
      measuredAt: baseTime.subtract({ minutes: 1 }),
    });
    await aggregateHealthMetrics();

    const totalRows = await db.select().from(hourlyHealthMetrics);
    expect(totalRows.length).toBe(1);
    expect(totalRows[0]!.avgBpm).toBe(80);
  });

  it('it should not process logs outside the lookback window (2 hours)', async () => {
    const oldTime = Temporal.Now.instant().subtract({ hours: 5 });

    await db.insert(heartRateLogs).values({
      userId: testUserId,
      bpm: 70,
      measuredAt: oldTime,
    });

    await aggregateHealthMetrics();

    const metrics = await db.select().from(hourlyHealthMetrics);
    expect(metrics.length).toBe(0);
  });
});
