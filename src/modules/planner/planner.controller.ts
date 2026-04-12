import { Temporal } from '@js-temporal/polyfill';
import { Elysia } from 'elysia';
import { authMacro } from '@/plugins/auth.plugin';
import { dbPlugin } from '@/plugins/db.plugin';
import { PlannerModel } from './planner.model';
import { PlannerService } from './planner.service';

export const plannerController = new Elysia({ name: 'controller:planner' })
  .use(dbPlugin)
  .use(authMacro)
  .use(PlannerModel)
  .derive(({ db }) => ({ plannerService: new PlannerService(db) }))
  .post(
    '/generate',
    async ({ user, body, plannerService }) => {
      const todayString = Temporal.Now.zonedDateTimeISO('America/Sao_Paulo')
        .toPlainDate()
        .toString();

      const plan = await plannerService.generateDailyPlan(
        user.id,
        todayString,
        body.availableHours,
        body.mood,
        body.forceRegenerate,
      );

      return {
        message: 'Plano diário tático gerado com sucesso.',
        data: {
          checkIn: {
            id: plan.checkIn.id,
            dateString: plan.checkIn.dateString,
            availableHours: plan.checkIn.availableHours,
            mood: plan.checkIn.mood,
            readinessScore: plan.checkIn.readinessScore ?? 50,
            subjectiveSleepQuality: plan.checkIn.subjectiveSleepQuality ?? 3,
            readinessMode: plan.checkIn.readinessMode ?? 'LIGHT',
            aiSummary: plan.checkIn.aiSummary ?? null,
          },
          newTasks: plan.newTasks.map((task) => ({
            id: task.id,
            targetDate: task.targetDate.toString(),
            title: task.title,
            category: task.category,
            difficulty: task.difficulty,
            estimatedMinutes: task.estimatedMinutes ?? 0,
            xpReward: task.xpReward,
            isCompleted: task.isCompleted,
          })),
        },
      };
    },
    {
      auth: true,
      body: 'Planner.GenerateBody',
      response: {
        200: 'Planner.GenerateResponse',
        500: 'Shared.ErrorResponse',
      },
      detail: { summary: 'Gerar Plano IA com base na Prontidão' },
    },
  );
