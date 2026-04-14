import { Elysia, t } from 'elysia';
import { SharedModel } from '@/models/shared.model';

export const ProfileModel = new Elysia({ name: 'model:profile' }).use(SharedModel).model({
  'Profile.UpdateSettingsBody': t.Object({
    themePreference: t.Optional(
      t.Union([t.Literal('DARK'), t.Literal('LIGHT'), t.Literal('SYSTEM')], {
        error: 'Tema inválido. Use DARK, LIGHT ou SYSTEM.',
      }),
    ),
    pushNotifications: t.Optional(t.Boolean({ error: 'Notificações deve ser um booleano.' })),
    isPrivateProfile: t.Optional(t.Boolean({ error: 'Perfil privado deve ser um booleano.' })),
  }),
  'Profile.SettingsResponse': t.Object({
    themePreference: t.Union([t.Literal('DARK'), t.Literal('LIGHT'), t.Literal('SYSTEM')]),
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
      avgBpm: t.Nullable(t.Number({ description: 'Média de batimentos por minuto' })),
      avgSpo2: t.Nullable(t.Number({ description: 'Média de saturação de oxigênio' })),
    }),
    { description: 'Lista de métricas agregadas por hora' },
  ),
  'Profile.OnboardingBody': t.Object({
    name: t.String({
      minLength: 2,
      error: 'O nome deve ter pelo menos 2 caracteres.',
    }),
    birthDate: t.String({
      pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$',
      error: 'Data de nascimento inválida. Use o formato YYYY-MM-DD.',
    }),
    studyStyle: t.Union([t.Literal('EARLY_BIRD'), t.Literal('NIGHT_OWL'), t.Literal('IRREGULAR')], {
      error: 'Estilo de estudo inválido. Use EARLY_BIRD, NIGHT_OWL ou IRREGULAR.',
    }),
    guardianEmail: t.Optional(
      t.String({ format: 'email', error: 'E-mail do responsável inválido.' }),
    ),
  }),

  'Profile.OnboardingResponse': t.Object({
    accountStatus: t.String(),
    isMinor: t.Boolean(),
    totalXp: t.Number(),
    message: t.String(),
  }),
  'Profile.MeResponse': t.Object({
    id: t.String(),
    name: t.String(),
    email: t.String(),
    image: t.Nullable(t.String()),
    totalXp: t.Number(),
    studyStyle: t.Nullable(
      t.Union([t.Literal('EARLY_BIRD'), t.Literal('NIGHT_OWL'), t.Literal('IRREGULAR')]),
    ),
    accountStatus: t.Union([
      t.Literal('ONBOARDING_INCOMPLETE'),
      t.Literal('PENDING_GUARDIAN_CONSENT'),
      t.Literal('ACTIVE'),
      t.Literal('SUSPENDED'),
    ]),
    themePreference: t.Union([t.Literal('DARK'), t.Literal('LIGHT'), t.Literal('SYSTEM')]),
    pushNotifications: t.Boolean(),
    isPrivateProfile: t.Boolean(),
    createdAt: t.String(),
  }),
});
