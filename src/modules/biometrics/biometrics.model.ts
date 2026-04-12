import { Elysia, t } from 'elysia';
import { SharedModel } from '@/models/shared.model';

export const BiometricsModel = new Elysia({ name: 'model:biometrics' }).use(SharedModel).model({
  'Biometrics.CheckinBody': t.Object({
    mood: t.Union([
      t.Literal('EXCITED'),
      t.Literal('NEUTRAL'),
      t.Literal('TIRED'),
      t.Literal('STRESSED'),
    ]),
    subjectiveSleepQuality: t.Number({ minimum: 1, maximum: 5 }),
    availableHours: t.Number({ minimum: 1, maximum: 24 }),
  }),
  'Biometrics.ReadinessResponse': t.Object({
    score: t.Number(),
    mode: t.Union([t.Literal('HIGH_FOCUS'), t.Literal('LIGHT'), t.Literal('RECOVERY')]),
    message: t.String(),
  }),
});
