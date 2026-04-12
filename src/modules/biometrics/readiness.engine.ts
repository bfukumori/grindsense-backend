import type { Mood, ReadinessMode } from '@/db/schema';

export interface ReadinessInput {
  avgBpm?: number | null;
  subjectiveSleepQuality: number;
  mood: Mood;
}

export interface ReadinessResult {
  score: number;
  mode: ReadinessMode;
}

export function calculateReadiness(input: ReadinessInput): ReadinessResult {
  let score = 50; // Base

  // Fatores Positivos
  if (input.avgBpm && input.avgBpm >= 40 && input.avgBpm <= 60) score += 20;
  if (input.subjectiveSleepQuality >= 4) score += 20;
  if (input.mood === 'EXCITED') score += 10;

  // Fatores Negativos
  if (input.mood === 'STRESSED') score -= 30;
  if (input.mood === 'TIRED') score -= 20;
  if (input.subjectiveSleepQuality <= 2) score -= 20;

  score = Math.max(0, Math.min(100, score));

  let mode: ReadinessMode;
  switch (true) {
    case score >= 75:
      mode = 'HIGH_FOCUS';
      break;
    case score >= 40:
      mode = 'LIGHT';
      break;
    default:
      mode = 'RECOVERY';
  }

  return { score, mode };
}
