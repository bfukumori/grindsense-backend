import { Elysia } from 'elysia';
import { authMacro } from '@/plugins/auth.plugin';
import { dbPlugin } from '@/plugins/db.plugin';
import { ProfileModel } from './profile.model';
import { ProfileService } from './profile.service';

export const profileController = new Elysia({ name: 'controller:profile' })
  .use(dbPlugin)
  .use(ProfileModel)
  .derive(({ db }) => ({ profileService: new ProfileService(db) }))
  .get(
    '/leaderboard',
    async ({ profileService }) => {
      return await profileService.getLeaderboard();
    },
    {
      response: {
        200: 'Leaderboard.Response',
        500: 'Shared.ErrorResponse',
      },
      detail: {
        summary: 'Obter Ranking de Usuários',
      },
    },
  )
  .use(authMacro)
  .group('/me', { auth: true }, (app) =>
    app
      .patch(
        '/settings',
        async ({ body, user, profileService }) =>
          await profileService.updateSettings(user.id, body),
        {
          body: 'Profile.UpdateSettingsBody',
          response: {
            200: 'Profile.SettingsResponse',
            400: 'Shared.ErrorResponse',
            404: 'Shared.ErrorResponse',
            500: 'Shared.ErrorResponse',
          },
          detail: { summary: 'Atualizar Configurações do Perfil' },
        },
      )
      .get(
        '/stats',
        async ({ user, profileService }) => {
          const stats = await profileService.getProfileStats(user.id);

          return stats.map((stat) => ({
            hour: stat.hour ? stat.hour.toString() : new Date().toISOString(),
            avgBpm: stat.avgBpm,
            avgSpo2: stat.avgSpo2,
          }));
        },
        {
          response: {
            200: 'Profile.StatsResponse',
            500: 'Shared.ErrorResponse',
          },
          detail: { summary: 'Obter Tendências de Saúde (Analytics)' },
        },
      ),
  );
