import type { Elysia } from 'elysia';
import { db } from '@/db';

export const dbPlugin = (app: Elysia) => app.decorate('db', db).as('global');
