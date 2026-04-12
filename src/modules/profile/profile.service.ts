import { desc, eq } from 'drizzle-orm';
import type { Database } from '@/db';
import { redis } from '@/db/redis';
import { hourlyHealthMetrics, type ThemePreference, users } from '@/db/schema';
import { AppError } from '@/utils/app-error';

const LEADERBOARD_CACHE_KEY = 'leaderboard:top10';
const CACHE_TTL_SECONDS = 300;

export class ProfileService {
  constructor(private readonly db: Database) {}

  async updateSettings(
    userId: string,
    data: Partial<{
      themePreference: ThemePreference;
      pushNotifications: boolean;
      isPrivateProfile: boolean;
    }>,
  ) {
    if (Object.keys(data).length === 0) {
      throw new AppError(400, 'Nenhum dado fornecido para atualização.');
    }

    const [user] = await this.db.update(users).set(data).where(eq(users.id, userId)).returning({
      themePreference: users.themePreference,
      isPrivateProfile: users.isPrivateProfile,
    });

    if (!user) throw new AppError(404, 'Usuário não encontrado.');
    return user;
  }

  async getLeaderboard() {
    const cached = await redis.get(LEADERBOARD_CACHE_KEY);
    if (cached) return JSON.parse(cached);

    const lockKey = `${LEADERBOARD_CACHE_KEY}:lock`;
    const acquiredLock = await redis.set(lockKey, '1', 'EX', 10, 'NX');

    if (!acquiredLock) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const retryCache = await redis.get(LEADERBOARD_CACHE_KEY);
      if (retryCache) return JSON.parse(retryCache);
    }

    try {
      const topUsers = await this.db
        .select({
          id: users.id,
          name: users.name,
          totalXp: users.totalXp,
        })
        .from(users)
        .where(eq(users.isPrivateProfile, false))
        .orderBy(desc(users.totalXp))
        .limit(10);

      const result = topUsers.map((u, index) => ({
        rank: index + 1,
        userId: u.id,
        name: u.name,
        totalXp: u.totalXp,
      }));

      await redis.set(LEADERBOARD_CACHE_KEY, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
      return result;
    } catch (e) {
      console.log(e);
    } finally {
      if (acquiredLock) await redis.del(lockKey);
    }
  }

  async getProfileStats(userId: string) {
    return await this.db
      .select({
        hour: hourlyHealthMetrics.bucketHour,
        avgBpm: hourlyHealthMetrics.avgBpm,
        avgSpo2: hourlyHealthMetrics.avgSpo2,
      })
      .from(hourlyHealthMetrics)
      .where(eq(hourlyHealthMetrics.userId, userId))
      .orderBy(desc(hourlyHealthMetrics.bucketHour))
      .limit(24);
  }
}
