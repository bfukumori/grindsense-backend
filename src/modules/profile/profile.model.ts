import { Elysia, t } from 'elysia';
import { SharedModel } from '@/models/shared.model';

export const ProfileModel = new Elysia({ name: 'model:profile' })
  .use(SharedModel)
  .model({
    'Profile.UpdateSettingsBody': t.Object({
      themePreference: t.Optional(
        t.Union([t.Literal('DARK'), t.Literal('LIGHT'), t.Literal('SYSTEM')], {
          error: 'Tema inválido. Use DARK, LIGHT ou SYSTEM.',
        }),
      ),
      pushNotifications: t.Optional(
        t.Boolean({ error: 'Notificações deve ser um booleano.' }),
      ),
      isPrivateProfile: t.Optional(
        t.Boolean({ error: 'Perfil privado deve ser um booleano.' }),
      ),
    }),
    'Profile.SettingsResponse': t.Object({
      themePreference: t.Union([
        t.Literal('DARK'),
        t.Literal('LIGHT'),
        t.Literal('SYSTEM'),
      ]),
      isPrivateProfile: t.Boolean(),
      pushNotifications: t.Boolean(),
    }),
    'Leaderboard.Response': t.Array(
      t.Object({
        rank: t.Number(),
        userId: t.String(),
        name: t.String(),
        totalXp: t.Number(),
      }),
    ),
    'Profile.StatsResponse': t.Array(
      t.Object({
        hour: t.String({ description: 'Timestamp da hora agregada' }),
        avgBpm: t.Nullable(
          t.Number({ description: 'Média de batimentos por minuto' }),
        ),
        avgSpo2: t.Nullable(
          t.Number({ description: 'Média de saturação de oxigênio' }),
        ),
      }),
      { description: 'Lista de métricas agregadas por hora' },
    ),
  });
