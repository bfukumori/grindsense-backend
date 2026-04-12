import { Elysia, t } from 'elysia';
import { SharedModel } from '@/models/shared.model';

export const PlannerModel = new Elysia({ name: 'model:planner' }).use(SharedModel).model({
  'Planner.GenerateBody': t.Object({
    availableHours: t.Number({
      minimum: 1,
      maximum: 24,
      description: 'Horas disponíveis para o dia',
    }),
    mood: t.Union(
      [t.Literal('EXCITED'), t.Literal('NEUTRAL'), t.Literal('TIRED'), t.Literal('STRESSED')],
      { description: 'Estado de humor atual' },
    ),
    forceRegenerate: t.Optional(
      t.Boolean({
        default: false,
        description: 'Se true, apaga as tarefas não concluídas de hoje e gera um novo plano',
      }),
    ),
  }),
  'Planner.GenerateResponse': t.Object({
    message: t.String(),
    data: t.Object({
      checkIn: t.Object({
        id: t.String(),
        dateString: t.String(),
        availableHours: t.Number(),
        mood: t.String(),
        readinessScore: t.Number(),
        subjectiveSleepQuality: t.Number(),
        readinessMode: t.Union([
          t.Literal('HIGH_FOCUS'),
          t.Literal('LIGHT'),
          t.Literal('RECOVERY'),
        ]),
        aiSummary: t.Union([t.String(), t.Null()]),
      }),
      newTasks: t.Array(
        t.Object({
          id: t.String(),
          targetDate: t.String(),
          title: t.String(),
          category: t.Union([
            t.Literal('STUDY'),
            t.Literal('WORK'),
            t.Literal('HEALTH'),
            t.Literal('REST'),
          ]),
          difficulty: t.Union([t.Literal('EASY'), t.Literal('MEDIUM'), t.Literal('HARD')]),
          estimatedMinutes: t.Number(),
          xpReward: t.Number(),
          isCompleted: t.Boolean(),
        }),
      ),
    }),
  }),
});
