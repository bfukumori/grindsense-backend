import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Temporal } from '@js-temporal/polyfill';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { hourlyHealthMetrics, tasks, users } from '@/db/schema';
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
import { CACHE_TTL_SECONDS, ProfileService } from './profile.service';

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
        CACHE_TTL_SECONDS,
      );
    });

    it('it should return data directly from Redis in O(1) for Cache Hit', async () => {
      const cachedData = [{ rank: 1, userId: 'cache-user', name: 'Cached King', totalXp: 9999 }];
      mockRedisGet.mockResolvedValue(JSON.stringify(cachedData));

      const leaderboard = await service.getLeaderboard();

      expect(leaderboard).toEqual(cachedData);
      expect(mockRedisSet).not.toHaveBeenCalled();
    });

    it('it should wait and return cached data if another process holds the lock (Retry Mechanism)', async () => {
      const cachedData = [{ rank: 1, userId: 'user-lock', name: 'Lock Winner', totalXp: 1000 }];

      mockRedisGet.mockResolvedValueOnce(null).mockResolvedValueOnce(JSON.stringify(cachedData));

      mockRedisSet.mockImplementation((_: string, ...args: unknown[]) => {
        if (args.includes('NX')) return Promise.resolve(null);
        return Promise.resolve('OK');
      });

      const leaderboard = await service.getLeaderboard();

      expect(leaderboard).toEqual(cachedData);
      expect(mockRedisGet).toHaveBeenCalledTimes(2);
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

  describe('completeOnboarding', () => {
    it('it should complete onboarding for an adult (>= 16), activate account, and inject initial tasks', async () => {
      const payload = {
        name: 'John Adult',
        birthDate: '1990-05-15',
        studyStyle: 'EARLY_BIRD' as const,
      };

      const result = await service.completeOnboarding(testUserId, payload);

      expect(result.accountStatus).toBe('ACTIVE');
      expect(result.isMinor).toBe(false);
      expect(result.totalXp).toBe(10);

      const [dbUser] = await db.select().from(users).where(eq(users.id, testUserId));
      expect(dbUser?.name).toBe('John Adult');
      expect(dbUser?.accountStatus).toBe('ACTIVE');
      expect(dbUser?.guardianEmail).toBeNull();

      const userTasks = await db.select().from(tasks).where(eq(tasks.userId, testUserId));
      expect(userTasks.length).toBe(2);
      expect(userTasks[0]?.title).toBe('Fazer o primeiro check-in');
    });

    it('it should require guardianEmail and set status to PENDING_GUARDIAN_CONSENT for minors (< 16)', async () => {
      const payload = {
        name: 'Timmy Minor',
        birthDate: '2015-10-10',
        studyStyle: 'NIGHT_OWL' as const,
        guardianEmail: 'parent@domain.com',
      };

      const result = await service.completeOnboarding(testUserId, payload);

      expect(result.accountStatus).toBe('PENDING_GUARDIAN_CONSENT');
      expect(result.isMinor).toBe(true);

      const [dbUser] = await db.select().from(users).where(eq(users.id, testUserId));
      expect(dbUser?.accountStatus).toBe('PENDING_GUARDIAN_CONSENT');
      expect(dbUser?.guardianEmail).toBe('parent@domain.com');
    });

    it('it should throw AppError 400 (Fail-fast) if user is minor and no guardianEmail is provided', async () => {
      const payload = {
        name: 'Timmy Minor',
        birthDate: '2015-10-10',
        studyStyle: 'IRREGULAR' as const,
      };

      expect(service.completeOnboarding(testUserId, payload)).rejects.toThrow(
        new AppError(400, 'E-mail do responsável é obrigatório para menores de 16 anos.'),
      );

      const userTasks = await db.select().from(tasks).where(eq(tasks.userId, testUserId));
      expect(userTasks.length).toBe(0);
    });

    it('it should throw AppError 404 if the user does not exist', async () => {
      const payload = {
        name: 'Ghost User',
        birthDate: '1990-01-01',
        studyStyle: 'EARLY_BIRD' as const,
      };

      expect(service.completeOnboarding('invalid-id', payload)).rejects.toThrow(
        new AppError(404, 'Usuário não encontrado.'),
      );
    });
  });

  describe('getMyProfile', () => {
    it('it should return the user profile data mapped correctly with ISO dates', async () => {
      const profile = await service.getMyProfile(testUserId);

      expect(profile.id).toBe(testUserId);
      expect(profile.totalXp).toBe(0);
      expect(profile.themePreference).toBe('DARK');

      expect(typeof profile.createdAt).toBe('string');
      expect(profile.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('it should throw AppError 404 if the user does not exist', async () => {
      expect(service.getMyProfile('ghost-user-id')).rejects.toThrow(
        new AppError(404, 'Usuário não encontrado.'),
      );
    });
  });
});
