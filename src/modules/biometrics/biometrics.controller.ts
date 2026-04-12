import { Elysia } from 'elysia';
import { authMacro } from '@/plugins/auth.plugin';
import { dbPlugin } from '@/plugins/db.plugin';
import { BiometricsModel } from './biometrics.model';
import { BiometricsService } from './biometrics.service';

export const biometricsController = new Elysia({
  name: 'controller:biometrics',
})
  .use(dbPlugin)
  .use(authMacro)
  .use(BiometricsModel)
  .derive(({ db }) => ({ biometricsService: new BiometricsService(db) }))
  .post(
    '/checkin',
    async function checkinHandler({ body, user, biometricsService }) {
      return await biometricsService.submitCheckin(user.id, body);
    },
    {
      auth: true,
      body: 'Biometrics.CheckinBody',
      response: {
        200: 'Biometrics.ReadinessResponse',
        400: 'Shared.ValidationError',
        401: 'Shared.ErrorResponse',
        500: 'Shared.ErrorResponse',
        502: 'Shared.ErrorResponse',
      },
      detail: {
        summary: 'Realizar Check-in Biométrico Diário',
        description:
          'Permite que o usuário envie suas métricas biométricas diárias (como frequência cardíaca, qualidade do sono, etc.) para calcular um Readiness Score. O sistema valida os dados, armazena o check-in e retorna o score atualizado, que pode ser usado para ajustar planos de estudo e atividades recomendadas.',
      },
    },
  );
