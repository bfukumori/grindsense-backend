import type { TaskDifficulty } from '@/db/schema';

export interface XpCalculationInput {
  difficulty: TaskDifficulty;
  readinessScore?: number | null;
}

export interface XpCalculationResult {
  baseXp: number;
  multiplier: number;
  finalXp: number;
}

/**
 * Calcula o XP de uma tarefa premiando o esforço em dias de baixo Readiness (Grind Multiplier).
 */
export function calculateTaskXp(input: XpCalculationInput): XpCalculationResult {
  let baseXp = 0;

  switch (input.difficulty) {
    case 'HARD':
      baseXp = 100;
      break;
    case 'MEDIUM':
      baseXp = 50;
      break;
    case 'EASY':
      baseXp = 20;
      break;
  }

  let multiplier = 1.0;

  // Grind Multiplier (Mecânica GrindSense): Se a pessoa fez uma tarefa pesada
  // em um dia em que o IoT apontou fadiga (Readiness baixo), ela ganha mais XP.
  if (input.readinessScore !== undefined && input.readinessScore !== null) {
    if (input.readinessScore < 40) {
      multiplier = 1.5; // +50% bônus de "Hardcore Grind"
    } else if (input.readinessScore < 75) {
      multiplier = 1.2; // +20% bônus de esforço moderado
    }
    // Readiness 75-100 = Condição ideal, mutiplicador base 1.0 (Zero bônus)
  }

  const finalXp = Math.floor(baseXp * multiplier);

  return { baseXp, multiplier, finalXp };
}
