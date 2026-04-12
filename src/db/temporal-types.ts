import { Temporal } from '@js-temporal/polyfill';
import { customType } from 'drizzle-orm/pg-core';

// 1. Tipo para Timestamps (Momentos exatos no tempo, independente de fuso)
export const temporalInstant = customType<{
  data: Temporal.Instant;
  driverData: string | Date; // O driver do Postgres pode retornar Date ou string
}>({
  dataType() {
    return 'timestamp with time zone';
  },
  fromDriver(value: string | Date): Temporal.Instant {
    if (value instanceof Date) {
      return Temporal.Instant.fromEpochMilliseconds(value.getTime());
    }
    return Temporal.Instant.from(new Date(value).toISOString());
  },
  toDriver(value: Temporal.Instant): string {
    return value.toString(); // Retorna ISO 8601 (ex: 2026-04-12T15:30:00Z)
  },
});

// 2. Tipo para Datas Puras (Dias no calendário, sem hora associada. Ex: 2026-04-12)
export const temporalPlainDate = customType<{
  data: Temporal.PlainDate;
  driverData: string;
}>({
  dataType() {
    return 'date';
  },
  fromDriver(value: string): Temporal.PlainDate {
    return Temporal.PlainDate.from(value);
  },
  toDriver(value: Temporal.PlainDate): string {
    return value.toString(); // Retorna YYYY-MM-DD
  },
});
