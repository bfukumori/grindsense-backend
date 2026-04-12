import { Elysia, t } from 'elysia';
import { SharedModel } from '@/models/shared.model';

export const GamificationModel = new Elysia({ name: 'model:gamification' })
  .use(SharedModel)
  .model({
    'Gamification.CreateTaskBody': t.Object({
      title: t.String({
        minLength: 3,
        maxLength: 100,
        error: 'O título deve ter entre 3 e 100 caracteres.',
      }),
      difficulty: t.Union(
        [t.Literal('EASY'), t.Literal('MEDIUM'), t.Literal('HARD')],
        {
          error: 'Dificuldade inválida. Escolha entre EASY, MEDIUM ou HARD.',
        },
      ),
      targetDate: t.String({
        pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$',
        error: 'Data inválida. Use o formato YYYY-MM-DD (ex: 2026-04-12).',
      }),
    }),
    'Gamification.CompleteTaskParams': t.Object({
      taskId: t.String({
        format: 'uuid',
        error: 'ID da tarefa a ser completada, deve ser um UUID válido.',
      }),
    }),
    'Gamification.TaskResponse': t.Object({
      id: t.String(),
      title: t.String(),
      xpReward: t.Number(),
      isCompleted: t.Boolean(),
    }),
  });
