import { Elysia, t } from 'elysia';

export const SharedModel = new Elysia({ name: 'Model.Shared' }).model({
  'Shared.ErrorResponse': t.Object({
    error: t.String(),
    message: t.String(),
  }),
  'Shared.ValidationError': t.Object({
    error: t.String({ default: 'Validation Failed' }),
    code: t.String({ default: 'BAD_REQUEST' }),
    issues: t.Array(
      t.Object({
        path: t.String(),
        message: t.String(),
        expected_options: t.Optional(t.Any()),
      }),
    ),
  }),
});
