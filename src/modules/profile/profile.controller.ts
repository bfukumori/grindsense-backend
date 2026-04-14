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
        description: 'Retorna os 10 usuários com mais XP, excluindo perfis privados.',
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
          detail: {
            summary: 'Atualizar Configurações do Perfil',
            description:
              'Permite ao usuário atualizar suas preferências de tema, notificações e visibilidade do perfil.',
          },
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
          detail: {
            summary: 'Obter Tendências de Saúde (Analytics)',
            description: 'Retorna os dados de saúde agregados por hora para análise.',
          },
        },
      )
      .patch(
        '/onboarding',
        async ({ body, user, profileService }) => {
          const result = await profileService.completeOnboarding(user.id, body);

          return {
            message: 'Onboarding concluído com sucesso.',
            ...result,
          };
        },
        {
          body: 'Profile.OnboardingBody',
          response: {
            200: 'Profile.OnboardingResponse',
            400: 'Shared.ErrorResponse',
            404: 'Shared.ErrorResponse',
            500: 'Shared.ErrorResponse',
          },
          detail: {
            summary: 'Finalizar Onboarding (Compliance & Initial XP)',
            description:
              'Completa o processo de onboarding, calculando a idade do usuário para compliance LGPD e concedendo XP inicial.',
          },
        },
      )
      .get(
        '/',
        async ({ user, profileService }) => {
          return await profileService.getMyProfile(user.id);
        },
        {
          response: {
            200: 'Profile.MeResponse',
            401: 'Shared.ErrorResponse',
            404: 'Shared.ErrorResponse',
            500: 'Shared.ErrorResponse',
          },
          detail: {
            summary: 'Obter Perfil do Usuário Logado (Hydration)',
            description: 'Retorna os dados do perfil do usuário autenticado.',
          },
        },
      ),
  );
