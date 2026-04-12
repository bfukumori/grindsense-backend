import { Elysia } from 'elysia';
import { plannerController } from './planner.controller';

export const plannerRoutes = new Elysia({
  prefix: '/planner',
  name: 'routes:planner',
  tags: ['Planner'],
}).use(plannerController);
