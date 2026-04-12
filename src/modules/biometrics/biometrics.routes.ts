import { Elysia } from 'elysia';
import { biometricsController } from './biometrics.controller';

export const biometricsRoutes = new Elysia({
  prefix: '/biometrics',
  name: 'routes:biometrics',
  tags: ['Biometrics'],
}).use(biometricsController);
