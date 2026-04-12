import { Temporal } from '@js-temporal/polyfill';
import { and, desc, eq, sql } from 'drizzle-orm';
import { calculateTaskXp } from '@/modules/gamification/xp.engine';
import { AppError } from '@/utils/app-error';
import type { Database } from '../../db';
import { dailyCheckins, type TaskDifficulty, tasks, users } from '../../db/schema';

export class GamificationService {
  constructor(private readonly db: Database) {}

  async createTask(
    userId: string,
    title: string,
    difficulty: TaskDifficulty,
    targetDateString: string,
  ) {
    const targetDate = Temporal.PlainDate.from(targetDateString);

    const [task] = await this.db
      .insert(tasks)
      .values({
        userId,
        title,
        difficulty,
        targetDate,
        xpReward: calculateTaskXp({ difficulty }).baseXp,
      })
      .returning();

    return task;
  }

  async completeTask(userId: string, taskId: string) {
    return await this.db.transaction(async (tx) => {
      const [task] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
        .limit(1);

      if (!task) throw new AppError(404, 'Missão não encontrada.');
      if (task.isCompleted) throw new AppError(400, 'Esta missão já foi concluída.');

      const [latestCheckin] = await tx
        .select({ score: dailyCheckins.readinessScore })
        .from(dailyCheckins)
        .where(eq(dailyCheckins.userId, userId))
        .orderBy(desc(dailyCheckins.dateString))
        .limit(1);

      const { finalXp } = calculateTaskXp({
        difficulty: task.difficulty,
        readinessScore: latestCheckin?.score ?? null,
      });

      const now = Temporal.Now.instant();

      const [updatedTask] = await tx
        .update(tasks)
        .set({
          isCompleted: true,
          completedAt: now,
          xpReward: finalXp,
        })
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updatedTask) throw new AppError(500, 'Erro interno ao concluir a missão.');

      await tx
        .update(users)
        .set({ totalXp: sql`${users.totalXp} + ${finalXp}` })
        .where(eq(users.id, userId));

      return updatedTask;
    });
  }
}
