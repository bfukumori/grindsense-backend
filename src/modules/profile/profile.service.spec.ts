import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Temporal } from '@js-temporal/polyfill';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { hourlyHealthMetrics, users } from '@/db/schema';
import { seedTestUser, truncateDb } from '@/tests/db-setup';
import { AppError } from '@/utils/app-error';

const mockRedisGet = mock();
const mockRedisSet = mock();

mock.module('@/db/redis', () => ({
  redis: {
    get: mockRedisGet,
    set: mockRedisSet,
    del: mock(),
  },
}));

import { redis } from '@/db/redis';
import { ProfileService } from './profile.service';

describe('ProfileService (Integration)', () => {
  let service: ProfileService;
  const testUserId = 'user-1';

  beforeEach(async () => {
    await truncateDb();
    await seedTestUser(testUserId);
    service = new ProfileService(db);

    mockRedisGet.mockClear();
    mockRedisSet.mockClear();
    (redis.del as ReturnType<typeof mock>).mockClear();
  });

  describe('updateSettings', () => {
    it('it should update user settings and return the updated data', async () => {
      const result = await service.updateSettings(testUserId, {
        themePreference: 'DARK',
        isPrivateProfile: true,
      });

      expect(result.themePreference).toBe('DARK');
      expect(result.isPrivateProfile).toBe(true);

      const [dbUser] = await db.select().from(users).where(eq(users.id, testUserId));

      if (!dbUser) throw new Error('Usuário não persistido corretamente.');

      expect(dbUser.themePreference).toBe('DARK');
      expect(dbUser.isPrivateProfile).toBe(true);
    });

    it('it should throw AppError 400 (Fail-fast) if the payload is empty', async () => {
      expect(service.updateSettings(testUserId, {})).rejects.toThrow(
        new AppError(400, 'Nenhum dado fornecido para atualização.'),
      );
    });

    it('it should throw AppError 404 if the user does not exist', async () => {
      expect(service.updateSettings('hacker-id-99', { themePreference: 'LIGHT' })).rejects.toThrow(
        new AppError(404, 'Usuário não encontrado.'),
      );
    });
  });

  describe('getLeaderboard', () => {
    it('it should return the leaderboard data, ordered by XP, ignoring private profiles, and caching the result', async () => {
      mockRedisGet.mockResolvedValue(null);

      mockRedisSet.mockImplementation((_: string, ...args: unknown[]) => {
        if (args.includes('NX')) return Promise.resolve('OK');
        return Promise.resolve('OK');
      });

      await truncateDb();

      await db.insert(users).values([
        {
          id: 'user-a',
          name: 'Alpha',
          email: 'a@a.com',
          totalXp: 100,
          isPrivateProfile: false,
          emailVerified: true,
        },
        {
          id: 'user-b',
          name: 'Bravo',
          email: 'b@b.com',
          totalXp: 500,
          isPrivateProfile: false,
          emailVerified: true,
        },
        {
          id: 'user-c',
          name: 'Charlie',
          email: 'c@c.com',
          totalXp: 999,
          isPrivateProfile: true,
          emailVerified: true,
        },
        {
          id: 'user-d',
          name: 'Delta',
          email: 'd@d.com',
          totalXp: 300,
          isPrivateProfile: false,
          emailVerified: true,
        },
      ]);

      const leaderboard = await service.getLeaderboard();

      expect(leaderboard.length).toBe(3);
      expect(leaderboard[0].name).toBe('Bravo');
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[0].totalXp).toBe(500);

      expect(mockRedisSet).toHaveBeenCalledTimes(2);
      expect(mockRedisSet).toHaveBeenLastCalledWith(
        'leaderboard:top10',
        JSON.stringify(leaderboard),
        'EX',
        300,
      );
    });

    it('it should return data directly from Redis in O(1) for Cache Hit', async () => {
      const cachedData = [{ rank: 1, userId: 'cache-user', name: 'Cached King', totalXp: 9999 }];
      mockRedisGet.mockResolvedValue(JSON.stringify(cachedData));

      const leaderboard = await service.getLeaderboard();

      expect(leaderboard).toEqual(cachedData);
      expect(mockRedisSet).not.toHaveBeenCalled();
    });
  });

  describe('getProfileStats', () => {
    it('it should return empty health trends if no data is available or after a refresh', async () => {
      const stats = await service.getProfileStats(testUserId);
      expect(stats).toBeInstanceOf(Array);
      expect(stats.length).toBe(0);
    });

    it('it should read aggregated data from the metrics table/view', async () => {
      const now = Temporal.Now.instant();

      await db.insert(hourlyHealthMetrics).values([
        {
          userId: testUserId,
          bucketHour: now,
          avgBpm: 90,
          avgSpo2: 98,
        },
      ]);

      const stats = await service.getProfileStats(testUserId);

      expect(stats.length).toBeGreaterThan(0);

      const latestHour = stats[0];
      expect(latestHour?.avgBpm).toBe(90);
      expect(latestHour?.avgSpo2).toBe(98);
      expect(latestHour?.hour).toBeDefined();
    });
  });
});
