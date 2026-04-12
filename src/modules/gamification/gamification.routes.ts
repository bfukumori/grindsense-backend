import { Elysia } from 'elysia';
import { gamificationController } from './gamification.controller';

export const gamificationRoutes = new Elysia({
  prefix: '/gamification',
  name: 'routes:gamification',
  tags: ['Gamification & Tasks'],
}).use(gamificationController);
