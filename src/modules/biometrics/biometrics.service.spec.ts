import { beforeEach, describe, expect, it } from 'bun:test';
import { Temporal } from '@js-temporal/polyfill';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { dailyCheckins, hourlyHealthMetrics } from '@/db/schema';
import { seedTestUser, truncateDb } from '@/tests/db-setup';
import { BiometricsService } from './biometrics.service';

describe('BiometricsService (Integration)', () => {
  let service: BiometricsService;
  const testUserId = 'user-1';

  beforeEach(async () => {
    await truncateDb();
    await seedTestUser(testUserId);
    service = new BiometricsService(db);
  });

  it('it should process the check-in and return HIGH_FOCUS combining IoT data', async () => {
    await db.insert(hourlyHealthMetrics).values({
      userId: testUserId,
      bucketHour: Temporal.Now.instant(),
      avgBpm: 55,
    });

    const result = await service.submitCheckin(testUserId, {
      mood: 'EXCITED',
      subjectiveSleepQuality: 4,
      availableHours: 2,
    });

    expect(result.score).toBe(100);
    expect(result.mode).toBe('HIGH_FOCUS');

    const [savedCheckin] = await db
      .select()
      .from(dailyCheckins)
      .where(eq(dailyCheckins.userId, testUserId));

    if (!savedCheckin) throw new Error('Check-in não persistido no banco.');

    expect(savedCheckin.readinessScore).toBe(100);
    expect(savedCheckin.readinessMode).toBe('HIGH_FOCUS');
  });

  it("it should work even if the user doesn't have a smartwatch (No IoT data)", async () => {
    const result = await service.submitCheckin(testUserId, {
      mood: 'STRESSED',
      subjectiveSleepQuality: 2,
      availableHours: 1,
    });

    expect(result.score).toBe(0);
    expect(result.mode).toBe('RECOVERY');
  });

  it('it should perform an UPSERT if the user updates the check-in on the same day', async () => {
    await service.submitCheckin(testUserId, {
      mood: 'STRESSED',
      subjectiveSleepQuality: 2,
      availableHours: 2,
    });

    const finalResult = await service.submitCheckin(testUserId, {
      mood: 'EXCITED',
      subjectiveSleepQuality: 4,
      availableHours: 2,
    });

    expect(finalResult.score).toBe(80);

    const allCheckins = await db
      .select()
      .from(dailyCheckins)
      .where(eq(dailyCheckins.userId, testUserId));

    expect(allCheckins.length).toBe(1);

    if (!allCheckins[0]) throw new Error('Falha no UPSERT. Check-in inexistente.');
    expect(allCheckins[0].mood).toBe('EXCITED');
  });
});
