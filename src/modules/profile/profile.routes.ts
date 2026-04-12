import { Elysia } from 'elysia';
import { profileController } from './profile.controller';

export const profileRoutes = new Elysia({
  prefix: '/profile',
  name: 'routes:profile',
  tags: ['Profile'],
}).use(profileController);
