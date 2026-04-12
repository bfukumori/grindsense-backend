import { Elysia, t } from 'elysia';
import { SharedModel } from '@/models/shared.model';

export const GamificationModel = new Elysia({ name: 'model:gamification' }).use(SharedModel).model({
  'Gamification.CreateTaskBody': t.Object({
    title: t.String({ minLength: 3, maxLength: 100 }),
    difficulty: t.Union([t.Literal('EASY'), t.Literal('MEDIUM'), t.Literal('HARD')]),
    targetDate: t.String({
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'YYYY-MM-DD',
    }),
  }),
  'Gamification.CompleteTaskParams': t.Object({
    taskId: t.String({ format: 'uuid' }),
  }),
  'Gamification.TaskResponse': t.Object({
    id: t.String(),
    title: t.String(),
    xpReward: t.Number(),
    isCompleted: t.Boolean(),
  }),
});
