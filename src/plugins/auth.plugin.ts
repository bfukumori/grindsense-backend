import { Elysia } from 'elysia';
import { auth } from '@/lib/better-auth';
import { AppError } from '@/utils/app-error';

export const authMacro = new Elysia({ name: 'macro:auth' })
  .macro({
    auth: {
      async resolve({ request: { headers } }) {
        const session = await auth.api.getSession({
          headers,
        });

        if (!session) {
          throw new AppError(401, 'Sessão inválida ou expirada.');
        }

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  })
  .as('global');

export const authPlugin = new Elysia({ name: 'routes:auth' }).mount('/auth', auth.handler);
