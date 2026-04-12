import { Elysia } from 'elysia';
import { iotController } from './iot.controller';

export const iotRoutes = new Elysia({
  prefix: '/iot',
  name: 'routes:iot',
  tags: ['IoT Hardware'],
}).use(iotController);
