import { describe, expect, it } from 'bun:test';
import { calculateReadiness } from './readiness.engine';

describe('Readiness Engine (Pure Domain)', () => {
  it('deve retornar HIGH_FOCUS e calcular score máximo corretamente', () => {
    const result = calculateReadiness({
      avgBpm: 55,
      subjectiveSleepQuality: 4,
      mood: 'EXCITED',
    });
    expect(result.score).toBe(100);
    expect(result.mode).toBe('HIGH_FOCUS');
  });

  it('deve retornar LIGHT para score neutro (50)', () => {
    const result = calculateReadiness({
      avgBpm: 65,
      subjectiveSleepQuality: 3,
      mood: 'NEUTRAL',
    });
    expect(result.score).toBe(50);
    expect(result.mode).toBe('LIGHT');
  });

  it('deve retornar RECOVERY e aplicar penalidades cumulativas', () => {
    const result = calculateReadiness({
      avgBpm: 80,
      subjectiveSleepQuality: 2,
      mood: 'STRESSED',
    });

    expect(result.score).toBe(0);
    expect(result.mode).toBe('RECOVERY');
  });

  it('Edge Case: deve aplicar Clamping Superior e nunca passar de 100', () => {
    const result = calculateReadiness({
      avgBpm: 45,
      subjectiveSleepQuality: 5,
      mood: 'EXCITED',
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('Edge Case: deve ignorar métricas de BPM inválidas (Erro de Sensor)', () => {
    const result = calculateReadiness({
      avgBpm: 0,
      subjectiveSleepQuality: 3,
      mood: 'NEUTRAL',
    });
    expect(result.score).toBe(50);
  });
});
