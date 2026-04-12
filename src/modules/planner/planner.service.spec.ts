import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { dailyCheckins, tasks } from '@/db/schema';
import { seedTestUser, truncateDb } from '@/tests/db-setup';
import { PlannerService } from './planner.service';

const mockAIResponse = {
  aiSummary: 'Plano simulado pelo Mock tático.',
  tasks: [
    {
      title: 'Treino de Força',
      category: 'HEALTH',
      difficulty: 'HARD',
      estimatedMinutes: 60,
      xpReward: 100,
    },
    {
      title: 'Revisão de Código',
      category: 'WORK',
      difficulty: 'MEDIUM',
      estimatedMinutes: 45,
      xpReward: 50,
    },
  ],
} as const;

mock.module('./ai.engine', () => ({
  generatePlanFromLLM: mock().mockResolvedValue(mockAIResponse),
}));

import { generatePlanFromLLM } from './ai.engine';

describe('PlannerService (Integration)', () => {
  let service: PlannerService;
  const testUserId = 'user-1';
  const today = '2026-04-12';

  beforeEach(async () => {
    await truncateDb();
    await seedTestUser(testUserId);
    service = new PlannerService(db);

    const mockGeneratePlan = generatePlanFromLLM as ReturnType<typeof mock>;
    mockGeneratePlan.mockClear();
  });

  it('it should generate a daily plan with neutral values if the user has not yet completed the Biometric Check-in', async () => {
    const result = await service.generateDailyPlan(testUserId, today, 4, 'NEUTRAL');

    expect(generatePlanFromLLM).toHaveBeenCalledWith({
      availableHours: 4,
      mood: 'NEUTRAL',
      readinessScore: 50,
    });

    expect(result.checkIn.readinessScore).toBe(50);
    expect(result.checkIn.subjectiveSleepQuality).toBe(3);
    expect(result.checkIn.aiSummary).toBe(mockAIResponse.aiSummary);

    expect(result.newTasks.length).toBe(mockAIResponse.tasks.length);
    expect(result.newTasks[0]?.title).toBe(mockAIResponse.tasks[0].title);
  });

  it('it should preserve real biometric data if the Check-in already exists', async () => {
    await db.insert(dailyCheckins).values({
      userId: testUserId,
      dateString: today,
      availableHours: 2,
      mood: 'EXCITED',
      readinessScore: 90,
      subjectiveSleepQuality: 4,
      readinessMode: 'HIGH_FOCUS',
    });

    await service.generateDailyPlan(testUserId, today, 2, 'EXCITED');

    const [dbCheckin] = await db
      .select()
      .from(dailyCheckins)
      .where(eq(dailyCheckins.userId, testUserId));

    if (!dbCheckin) throw new Error('Checkin não encontrado após atualização');

    expect(dbCheckin.readinessScore).toBe(90);
    expect(dbCheckin.subjectiveSleepQuality).toBe(4);
    expect(dbCheckin.aiSummary).toBe(mockAIResponse.aiSummary);
  });

  it('it should delete old incomplete tasks when forcing plan regeneration', async () => {
    const [checkIn] = await db
      .insert(dailyCheckins)
      .values({
        userId: testUserId,
        dateString: today,
        availableHours: 4,
        mood: 'NEUTRAL',
        readinessScore: 50,
        subjectiveSleepQuality: 3,
        readinessMode: 'LIGHT',
      })
      .returning();

    if (!checkIn) throw new Error('Falha ao criar check-in inicial');

    await db.insert(tasks).values([
      {
        userId: testUserId,
        checkInId: checkIn.id,
        title: 'Manter',
        category: 'HEALTH',
        difficulty: 'EASY',
        isCompleted: true,
        targetDate: sql`${today}::date`,
        estimatedMinutes: 30,
      },
      {
        userId: testUserId,
        checkInId: checkIn.id,
        title: 'Remover',
        isCompleted: false,
        targetDate: sql`${today}::date`,
        category: 'WORK',
        difficulty: 'MEDIUM',
      },
    ]);

    await service.generateDailyPlan(testUserId, today, 4, 'NEUTRAL', true);

    const currentTasks = await db.select().from(tasks).where(eq(tasks.userId, testUserId));

    expect(currentTasks.length).toBe(3);

    const titles = currentTasks.map((t) => t.title);
    expect(titles).toContain('Manter');
    expect(titles).toContain(mockAIResponse.tasks[0].title);
    expect(titles).toContain(mockAIResponse.tasks[1].title);
    expect(titles).not.toContain('Remover');
  });
});
