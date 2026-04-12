import { Temporal } from '@js-temporal/polyfill';
import { desc, eq } from 'drizzle-orm';
import type { Database } from '@/db';
import { dailyCheckins, hourlyHealthMetrics, type Mood } from '@/db/schema';
import { calculateReadiness } from '@/modules/biometrics/readiness.engine';
import { AppError } from '@/utils/app-error';
import { aggregateHealthMetrics } from './health-aggregator.engine';

export class BiometricsService {
  constructor(private readonly db: Database) {}

  async submitCheckin(
    userId: string,
    data: {
      mood: Mood;
      subjectiveSleepQuality: number;
      availableHours: number;
    },
  ) {
    await aggregateHealthMetrics(userId);

    const timeZone = 'America/Sao_Paulo';
    const dateString = Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate().toString();

    const [healthMetrics] = await this.db
      .select({ avgBpm: hourlyHealthMetrics.avgBpm })
      .from(hourlyHealthMetrics)
      .where(eq(hourlyHealthMetrics.userId, userId))
      .orderBy(desc(hourlyHealthMetrics.bucketHour))
      .limit(1);

    const readiness = calculateReadiness({
      avgBpm: healthMetrics?.avgBpm ?? null,
      subjectiveSleepQuality: data.subjectiveSleepQuality,
      mood: data.mood,
    });

    const [checkin] = await this.db
      .insert(dailyCheckins)
      .values({
        userId,
        dateString,
        mood: data.mood,
        subjectiveSleepQuality: data.subjectiveSleepQuality,
        availableHours: data.availableHours,
        readinessScore: readiness.score,
        readinessMode: readiness.mode,
      })
      .onConflictDoUpdate({
        target: [dailyCheckins.userId, dailyCheckins.dateString],
        set: {
          mood: data.mood,
          subjectiveSleepQuality: data.subjectiveSleepQuality,
          availableHours: data.availableHours,
          readinessScore: readiness.score,
          readinessMode: readiness.mode,
        },
      })
      .returning({ id: dailyCheckins.id });

    if (!checkin) {
      throw new AppError(500, 'Falha fatal ao persistir o Check-in Biométrico.');
    }

    return {
      score: readiness.score,
      mode: readiness.mode,
      message:
        readiness.mode === 'RECOVERY' ? 'Dia de descanso estratégico.' : 'Pronto para o combate.',
    };
  }
}
