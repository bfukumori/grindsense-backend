import { Temporal } from '@js-temporal/polyfill';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  dailyCheckins,
  heartRateLogs,
  hourlyHealthMetrics,
  iotDevices,
  tasks,
  users,
} from '@/db/schema';

async function runSeed() {
  console.log('🌱 Iniciando Seed de Dados Táticos...');

  // Constantes de Controle
  const testUserId = 'user-bruno-seed';
  const deviceId = 'device-watch-seed';

  // Controle de Tempo Preciso via Temporal API
  const timeZone = 'America/Sao_Paulo';
  const now = Temporal.Now.instant();
  const today = Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate();
  const yesterday = today.subtract({ days: 1 });

  // 1. Teardown (Garante Idempotência ao rodar múltiplas vezes)
  console.log('🧹 Limpando registros antigos...');
  await db.delete(tasks).where(sql`${tasks.userId} = ${testUserId}`);
  await db.delete(heartRateLogs).where(sql`${heartRateLogs.userId} = ${testUserId}`);
  await db.delete(dailyCheckins).where(sql`${dailyCheckins.userId} = ${testUserId}`);
  await db.delete(iotDevices).where(sql`${iotDevices.userId} = ${testUserId}`);
  await db.delete(users).where(sql`${users.id} = ${testUserId}`);

  // 2. Provisionamento de Usuário
  console.log('👤 Criando perfil base...');
  await db.insert(users).values({
    id: testUserId,
    name: 'Bruno (Engenharia)',
    email: 'bruno@grindsense.local',
    emailVerified: true,
    totalXp: 50,
    themePreference: 'DARK',
  });

  // 3. Provisionamento de Hardware IoT
  console.log('⌚ Provisionando Wearable (Apple Watch / Garmin)...');
  await db.insert(iotDevices).values({
    id: deviceId,
    userId: testUserId,
    name: 'Smartwatch Principal',
    macAddress: 'AA:BB:CC:DD:EE:FF',
    secret: 'HMAC_TEST_SECRET_KEY_123',
    deviceType: 'WEARABLE',
    status: 'ACTIVE',
    lastPingAt: now,
  });

  // 4. Ingestão de Telemetria Fisiológica
  console.log('❤️ Injetando logs de frequência cardíaca...');
  await db.insert(heartRateLogs).values([
    {
      userId: testUserId,
      deviceId,
      bpm: 52,
      measuredAt: now.subtract({ minutes: 30 }),
    },
    {
      userId: testUserId,
      deviceId,
      bpm: 55,
      measuredAt: now.subtract({ minutes: 15 }),
    },
    { userId: testUserId, deviceId, bpm: 58, measuredAt: now },
  ]);

  // 5. Geração de Check-ins (Histórico e Atual)
  console.log('📊 Gerando Readiness Scores...');
  const [todayCheckin] = await db
    .insert(dailyCheckins)
    .values([
      {
        userId: testUserId,
        dateString: yesterday.toString(),
        mood: 'NEUTRAL',
        subjectiveSleepQuality: 3,
        availableHours: 4,
        readinessScore: 60,
        readinessMode: 'LIGHT',
        aiSummary: 'Recuperação padrão. Mantenha o foco em tarefas de média complexidade.',
      },
      {
        userId: testUserId,
        dateString: today.toString(),
        mood: 'EXCITED',
        subjectiveSleepQuality: 4,
        availableHours: 5,
        readinessScore: 90,
        readinessMode: 'HIGH_FOCUS',
        aiSummary:
          'Fisiologia excelente. Dia favorável para treino de força pesado e system design.',
      },
    ])
    .returning();

  // 6. Atualização de View Materializada
  console.log('🔄 Inserindo agregações de saúde na tabela (Simulando Worker)...');
  await db.insert(hourlyHealthMetrics).values([
    {
      userId: testUserId,
      bucketHour: now,
      avgBpm: 55, // (52 + 55 + 58) / 3 = 55 (Média exata injetada no Passo 4)
      avgSpo2: 98,
    },
  ]);

  // 7. Definição de Missões (Gamificação)
  console.log('⚔️ Populando Missões (Tasks)...');
  await db.insert(tasks).values([
    {
      userId: testUserId,
      checkInId: todayCheckin?.id,
      title: 'Treino de Hipertrofia Funcional',
      category: 'HEALTH',
      difficulty: 'HARD',
      xpReward: 100,
      targetDate: today,
      isCompleted: false,
    },
    {
      userId: testUserId,
      checkInId: todayCheckin?.id,
      title: 'Mock Interview (System Design)',
      category: 'STUDY',
      difficulty: 'MEDIUM',
      xpReward: 50,
      targetDate: today,
      isCompleted: true,
      completedAt: now.subtract({ hours: 1 }),
    },
    {
      userId: testUserId,
      checkInId: todayCheckin?.id,
      title: 'Revisar PRs do Backend',
      category: 'WORK',
      difficulty: 'EASY',
      xpReward: 20,
      targetDate: today,
      isCompleted: false,
    },
  ]);

  console.log('✅ Seed finalizado com sucesso. Ambiente GrindSense operacional.');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('❌ Falha catastrófica no Seed:', err);
  process.exit(1);
});
