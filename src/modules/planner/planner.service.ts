import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@/db';
import { dailyCheckins, type Mood, tasks } from '@/db/schema';
import { AppError } from '@/utils/app-error';
import { generatePlanFromLLM } from './ai.engine';

export class PlannerService {
  constructor(private readonly db: Database) {}

  async generateDailyPlan(
    userId: string,
    dateString: string,
    availableHours: number,
    mood: Mood,
    forceRegenerate: boolean = false,
  ) {
    const [existingCheckin] = await this.db
      .select()
      .from(dailyCheckins)
      .where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.dateString, dateString)))
      .limit(1);

    const readinessScore = existingCheckin?.readinessScore ?? 50;
    const subjectiveSleepQuality = existingCheckin?.subjectiveSleepQuality ?? 3;
    const readinessMode = existingCheckin?.readinessMode ?? 'LIGHT';

    const aiPlan = await generatePlanFromLLM({
      availableHours,
      mood,
      readinessScore,
    });

    return await this.db.transaction(async (tx) => {
      const [checkIn] = await tx
        .insert(dailyCheckins)
        .values({
          userId,
          dateString,
          availableHours,
          mood,
          readinessScore,
          subjectiveSleepQuality,
          readinessMode,
          aiSummary: aiPlan.aiSummary,
        })
        .onConflictDoUpdate({
          target: [dailyCheckins.userId, dailyCheckins.dateString],
          set: {
            availableHours,
            mood,
            readinessScore,
            aiSummary: aiPlan.aiSummary,
          },
        })
        .returning();

      if (!checkIn) throw new AppError(500, 'Falha fatal ao persistir o Check-in.');

      const targetDateSql = sql`${dateString}::date`;

      if (forceRegenerate) {
        await tx
          .delete(tasks)
          .where(
            and(
              eq(tasks.userId, userId),
              eq(tasks.targetDate, targetDateSql),
              eq(tasks.isCompleted, false),
            ),
          );
      }

      let savedTasks: (typeof tasks.$inferSelect)[] = [];

      if (aiPlan.tasks.length > 0) {
        const tasksToInsert = aiPlan.tasks.map((task) => ({
          userId,
          checkInId: checkIn.id,
          targetDate: targetDateSql,
          title: task.title,
          category: task.category,
          difficulty: task.difficulty,
          estimatedMinutes: task.estimatedMinutes,
          xpReward: task.xpReward,
        }));

        savedTasks = await tx.insert(tasks).values(tasksToInsert).returning();
      }

      return { checkIn, newTasks: savedTasks };
    });
  }
}
