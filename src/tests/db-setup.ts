import { sql } from 'drizzle-orm';
import { db } from '@/db';

export async function truncateDb() {
  await db.execute(sql`
    TRUNCATE TABLE 
      tasks, 
      users, 
      daily_checkins, 
      hourly_health_metrics, 
      heart_rate_logs, 
      iot_devices 
    CASCADE;
  `);
}

export async function seedTestUser(userId: string = 'user-1') {
  const { users } = await import('@/db/schema');
  const [user] = await db
    .insert(users)
    .values({
      id: userId,
      name: 'Test Soldier',
      email: `test-${Bun.randomUUIDv7()}@test.com`,
      totalXp: 0,
    })
    .returning();
  return user;
}
