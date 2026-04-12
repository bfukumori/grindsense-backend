import { Temporal } from '@js-temporal/polyfill';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { temporalInstant, temporalPlainDate } from './temporal-types';

// ==========================================
// DOMÍNIO: CORE & AUTH
// ==========================================
export const themePreferenceEnum = pgEnum('theme_preference', ['DARK', 'LIGHT', 'SYSTEM']);
export type ThemePreference = (typeof themePreferenceEnum.enumValues)[number];

export const users = pgTable(
  'users',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => Bun.randomUUIDv7()),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    totalXp: integer().notNull().default(0),
    themePreference: themePreferenceEnum().default('DARK').notNull(),
    pushNotifications: boolean().default(true).notNull(),
    isPrivateProfile: boolean().default(false).notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp()
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('leaderboard_idx').on(t.isPrivateProfile, t.totalXp)],
);

export const sessions = pgTable('sessions', {
  id: text().primaryKey(),
  expiresAt: timestamp().notNull(),
  token: text().notNull().unique(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  ipAddress: text(),
  userAgent: text(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('accounts', {
  id: text().primaryKey(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: timestamp(),
  refreshTokenExpiresAt: timestamp(),
  scope: text(),
  password: text(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const verifications = pgTable('verifications', {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ==========================================
// DOMÍNIO: GAMIFICAÇÃO & TAREFAS
// ==========================================
export const taskCategoryEnum = pgEnum('task_category', ['STUDY', 'WORK', 'HEALTH', 'REST']);
export const taskDifficultyEnum = pgEnum('task_difficulty', ['EASY', 'MEDIUM', 'HARD']);
export type TaskCategory = (typeof taskCategoryEnum.enumValues)[number];
export type TaskDifficulty = (typeof taskDifficultyEnum.enumValues)[number];

export const tasks = pgTable(
  'tasks',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => Bun.randomUUIDv7()),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    checkInId: text().references(() => dailyCheckins.id),
    title: text().notNull(),
    category: taskCategoryEnum().notNull().default('WORK'),
    difficulty: taskDifficultyEnum().notNull().default('MEDIUM'),
    isCompleted: boolean().notNull().default(false),
    xpReward: integer().notNull().default(0),
    targetDate: temporalPlainDate('target_date').notNull(),
    estimatedMinutes: integer('estimated_minutes').default(30),
    completedAt: temporalInstant('completed_at'),
    createdAt: temporalInstant('created_at')
      .notNull()
      .$defaultFn(() => Temporal.Now.instant()),
  },
  (t) => [index('tasks_user_date_idx').on(t.userId, t.targetDate)],
);

// ==========================================
// DOMÍNIO: BIOMETRIA & PRONTIDÃO
// ==========================================
export const moodEnum = pgEnum('mood', ['EXCITED', 'NEUTRAL', 'TIRED', 'STRESSED']);
export const readinessModeEnum = pgEnum('readiness_mode', ['HIGH_FOCUS', 'LIGHT', 'RECOVERY']);
export type ReadinessMode = (typeof readinessModeEnum.enumValues)[number];
export type Mood = (typeof moodEnum.enumValues)[number];

export const dailyCheckins = pgTable(
  'daily_checkins',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => Bun.randomUUIDv7()),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    dateString: text().notNull(), // YYYY-MM-DD
    mood: moodEnum().notNull(),
    subjectiveSleepQuality: integer().notNull(),
    availableHours: integer().notNull(),
    readinessScore: integer(),
    readinessMode: readinessModeEnum(),
    aiSummary: text(),
    createdAt: temporalInstant('created_at')
      .notNull()
      .$defaultFn(() => Temporal.Now.instant()),
  },
  (t) => [uniqueIndex('daily_checkins_unq').on(t.userId, t.dateString)],
);

export const sleepLogs = pgTable(
  'sleep_logs',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => Bun.randomUUIDv7()),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    dateString: text().notNull(), // YYYY-MM-DD
    durationMinutes: integer().notNull(),
    efficiency: integer(),
    source: text({ enum: ['GOOGLE_FIT', 'MANUAL'] }).default('GOOGLE_FIT'),
    createdAt: temporalInstant('created_at')
      .notNull()
      .$defaultFn(() => Temporal.Now.instant()),
  },
  (t) => [
    uniqueIndex('sleep_logs_unq').on(t.userId, t.dateString),
    index('sleep_logs_user_date_idx').on(t.userId, t.dateString),
  ],
);

export const heartRateLogs = pgTable(
  'heart_rate_logs',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => Bun.randomUUIDv7()),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceId: text().references(() => iotDevices.id, { onDelete: 'set null' }),
    measuredAt: temporalInstant('measured_at').notNull(),
    bpm: integer().notNull(),
    spo2: integer(),
    createdAt: temporalInstant('created_at')
      .notNull()
      .$defaultFn(() => Temporal.Now.instant()),
  },
  (t) => [
    uniqueIndex('heart_rate_logs_idempotency_idx').on(t.deviceId, t.measuredAt),
    index('heart_rate_logs_user_measured_at_idx').on(t.userId, t.measuredAt),
  ],
);

// ==========================================
// DOMÍNIO: INFRAESTRUTURA IoT (Station/Wearable)
// ==========================================
export const deviceStatusEnum = pgEnum('device_status', ['PROVISIONED', 'ACTIVE', 'REVOKED']);
export type DeviceStatus = (typeof deviceStatusEnum.enumValues)[number];

export const iotDevices = pgTable(
  'iot_devices',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => Bun.randomUUIDv7()),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    macAddress: varchar({ length: 17 }).unique().notNull(), // Identificador do hardware
    secret: text().notNull(), // Chave HMAC provisionada
    deviceType: text({ enum: ['STATION', 'WEARABLE'] }).notNull(),
    status: deviceStatusEnum().default('PROVISIONED').notNull(),
    lastPingAt: temporalInstant('last_ping_at'),
    createdAt: temporalInstant('created_at')
      .notNull()
      .$defaultFn(() => Temporal.Now.instant()),
  },
  (t) => [
    index('iot_devices_user_id_idx').on(t.userId),
    index('iot_devices_mac_address_idx').on(t.macAddress),
  ],
);

// ==========================================
// MATERIALIZED VIEWS
// ==========================================
export const hourlyHealthMetrics = pgTable(
  'hourly_health_metrics',
  {
    userId: text(),
    bucketHour: temporalInstant('bucket_hour'),
    avgBpm: integer(),
    avgSpo2: integer(),
  },
  (t) => [
    uniqueIndex('hourly_health_metrics_unq').on(t.userId, t.bucketHour),
    index('hourly_health_metrics_user_hour_idx').on(t.userId, t.bucketHour),
  ],
);
