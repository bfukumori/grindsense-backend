import { Elysia } from 'elysia';
import { authMacro } from '@/plugins/auth.plugin';
import { dbPlugin } from '@/plugins/db.plugin';
import { GamificationModel } from './gamification.model';
import { GamificationService } from './gamification.service';

export const gamificationController = new Elysia({
  name: 'controller:gamification',
})
  .use(dbPlugin)
  .use(authMacro)
  .use(GamificationModel)
  .derive(({ db }) => {
    return {
      gamificationService: new GamificationService(db),
    };
  })
  .post(
    '/',
    async function createTaskHandler({ body, user, gamificationService, set }) {
      const task = await gamificationService.createTask(
        user.id,
        body.title,
        body.difficulty,
        body.targetDate,
      );

      set.status = 201;
      return task;
    },
    {
      auth: true,
      body: 'Gamification.CreateTaskBody',
      response: {
        201: 'Gamification.TaskResponse',
        400: 'Shared.ValidationError',
        401: 'Shared.ErrorResponse',
        500: 'Shared.ErrorResponse',
      },
      detail: {
        summary: 'Criar nova missão diária',
        description:
          'Adiciona uma nova tarefa à lista do usuário. A dificuldade definida (EASY, MEDIUM, HARD) servirá de base para o cálculo da recompensa final de XP.',
      },
    },
  )
  .patch(
    '/:taskId/complete',
    async function completeTaskHandler({ params, user, gamificationService }) {
      const task = await gamificationService.completeTask(user.id, params.taskId);

      return task;
    },
    {
      auth: true,
      params: 'Gamification.CompleteTaskParams',
      response: {
        200: 'Gamification.TaskResponse',
        400: 'Shared.ValidationError',
        401: 'Shared.ErrorResponse',
        404: 'Shared.ErrorResponse',
        500: 'Shared.ErrorResponse',
      },
      detail: {
        summary: 'Concluir missão e resgatar XP',
        description:
          'Marca a tarefa como concluída e processa a recompensa em XP. O bônus final é calculado cruzando a dificuldade da tarefa com o Readiness Score diário (biometria), premiando o esforço nos dias de menor recuperação.',
      },
    },
  );
