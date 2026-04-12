import { Temporal } from '@js-temporal/polyfill';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { heartRateLogs, hourlyHealthMetrics } from '@/db/schema';

/**
 * Agrega dados brutos de BPM/SpO2 em buckets de 1 hora.
 */
export async function aggregateHealthMetrics(specificUserId?: string) {
  const now = Temporal.Now.instant();
  const lookbackLimit = now.subtract({ hours: 2 });

  console.log(`[${now.toString()}] Iniciando agregação de métricas...`);

  try {
    const aggregations = await db
      .select({
        userId: heartRateLogs.userId,
        hour: sql<string>`date_trunc('hour', ${heartRateLogs.measuredAt})`.as('hour'),
        avgBpm: sql<number>`round(avg(${heartRateLogs.bpm}))`.mapWith(Number),
        avgSpo2: sql<number>`round(avg(${heartRateLogs.spo2}))`.mapWith(Number),
      })
      .from(heartRateLogs)
      .where(
        specificUserId
          ? and(
              gte(heartRateLogs.measuredAt, lookbackLimit),
              eq(heartRateLogs.userId, specificUserId),
            )
          : gte(heartRateLogs.measuredAt, lookbackLimit),
      )
      .groupBy(heartRateLogs.userId, sql`date_trunc('hour', ${heartRateLogs.measuredAt})`);

    if (aggregations.length === 0) return;

    for (const row of aggregations) {
      const bucketHour = Temporal.Instant.from(row.hour);

      await db
        .insert(hourlyHealthMetrics)
        .values({
          userId: row.userId,
          bucketHour,
          avgBpm: row.avgBpm,
          avgSpo2: row.avgSpo2,
        })
        .onConflictDoUpdate({
          target: [hourlyHealthMetrics.userId, hourlyHealthMetrics.bucketHour],
          set: {
            avgBpm: row.avgBpm,
            avgSpo2: row.avgSpo2,
          },
        });
    }

    console.log(`✅ Agregação concluída: ${aggregations.length} buckets atualizados.`);
  } catch (error) {
    console.error('❌ Falha na execução do Cron de Saúde:', error);
  }
}
