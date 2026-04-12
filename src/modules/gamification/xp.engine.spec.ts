import { describe, expect, it } from 'bun:test';
import { calculateTaskXp } from './xp.engine';

describe('XP Engine (Pure Domain)', () => {
  it('it should return base XP and 1.0x multiplier when no readiness is provided', () => {
    const result = calculateTaskXp({
      difficulty: 'HARD',
      readinessScore: null,
    });

    expect(result.baseXp).toBe(100);
    expect(result.multiplier).toBe(1.0);
    expect(result.finalXp).toBe(100);
  });

  it('it should apply a 1.5x Grind Multiplier for Extreme Fatigue (Readiness < 40)', () => {
    const result = calculateTaskXp({
      difficulty: 'MEDIUM',
      readinessScore: 35,
    });

    expect(result.baseXp).toBe(50);
    expect(result.multiplier).toBe(1.5);
    expect(result.finalXp).toBe(75);
  });

  it('it should apply a 1.2x Multiplier for Moderate Fatigue (Readiness < 75)', () => {
    const result = calculateTaskXp({ difficulty: 'HARD', readinessScore: 60 });

    expect(result.multiplier).toBe(1.2);
    expect(result.finalXp).toBe(120);
  });

  it('it should apply a 1.0x Multiplier (No Bonus) for Optimal Readiness (>= 75)', () => {
    const result = calculateTaskXp({ difficulty: 'EASY', readinessScore: 90 });

    expect(result.multiplier).toBe(1.0);
    expect(result.finalXp).toBe(20);
  });
});
