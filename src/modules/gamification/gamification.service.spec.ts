import { beforeEach, describe, expect, it } from 'bun:test';
import { Temporal } from '@js-temporal/polyfill';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { dailyCheckins, tasks, users } from '@/db/schema';
import { seedTestUser, truncateDb } from '@/tests/db-setup';
import { AppError } from '@/utils/app-error';
import { GamificationService } from './gamification.service';

describe('GamificationService (Integration)', () => {
  let service: GamificationService;
  const testUserId = 'user-1';

  beforeEach(async () => {
    await truncateDb();
    await seedTestUser(testUserId);
    service = new GamificationService(db);
  });

  it('it should create a task in the database with base XP', async () => {
    const today = Temporal.Now.plainDateISO().toString();

    const task = await service.createTask(testUserId, 'Treino de Tiro', 'HARD', today);

    if (!task) throw new Error('Falha: A missão não foi retornada pelo service.');

    expect(task).toBeDefined();
    expect(task.title).toBe('Treino de Tiro');
    expect(task.xpReward).toBe(100);

    const [dbTask] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    if (!dbTask) throw new Error('Falha na persistência da Missão.');
    expect(dbTask.isCompleted).toBe(false);
  });

  it('it should throw AppError 404 when completing a non-existent task', async () => {
    expect(service.completeTask(testUserId, 'id-falso')).rejects.toThrow(
      new AppError(404, 'Missão não encontrada.'),
    );
  });

  it("it should complete a task, apply the Grind Multiplier based on Readiness, and update the User's XP", async () => {
    await db.insert(dailyCheckins).values({
      userId: testUserId,
      dateString: '2026-04-12',
      mood: 'TIRED',
      subjectiveSleepQuality: 2,
      availableHours: 4,
      readinessScore: 35,
      readinessMode: 'RECOVERY',
    });

    const [task] = await db
      .insert(tasks)
      .values({
        userId: testUserId,
        title: 'Limpar Armamento',
        difficulty: 'MEDIUM',
        xpReward: 50,
        targetDate: Temporal.PlainDate.from('2026-04-12'),
      })
      .returning();

    if (!task) throw new Error('Falha no setup da Missão.');

    const updatedTask = await service.completeTask(testUserId, task.id);

    expect(updatedTask.isCompleted).toBe(true);
    expect(updatedTask.completedAt).not.toBeNull();
    expect(updatedTask.xpReward).toBe(75);

    const [user] = await db.select().from(users).where(eq(users.id, testUserId));

    if (!user) throw new Error('Usuário não encontrado na validação de XP.');
    expect(user.totalXp).toBe(75);
  });

  it('it should throw AppError 400 if trying to complete an already completed task', async () => {
    const [task] = await db
      .insert(tasks)
      .values({
        userId: testUserId,
        title: 'Correr 5km',
        xpReward: 50,
        isCompleted: true,
        targetDate: Temporal.PlainDate.from('2026-04-12'),
      })
      .returning();

    if (!task) throw new Error('Falha no setup da Missão.');

    try {
      await service.completeTask(testUserId, task.id);

      throw new Error('A missão foi concluída, mas deveria ter falhado com erro 400.');
    } catch (error: unknown) {
      if (error instanceof AppError) {
        expect(error.message).toBe('Esta missão já foi concluída.');
      }
    }
  });
});
