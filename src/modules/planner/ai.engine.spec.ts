import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { AppError } from '@/utils/app-error';

const mockGenerateObject = mock();

mock.module('ai', () => ({
  generateObject: mockGenerateObject,
}));

mock.module('@ai-sdk/google', () => ({
  google: mock().mockReturnValue('mocked-google-model'),
}));

import { type AiPlan, generatePlanFromLLM } from './ai.engine';

describe('AI Engine (Unit)', () => {
  beforeEach(() => {
    mockGenerateObject.mockClear();
  });

  it('should successfully call the LLM and return the parsed AI Plan', async () => {
    const expectedMockPlan: AiPlan = {
      aiSummary: 'Hora de esmagar seus objetivos, recruta!',
      tasks: [
        {
          title: 'Estudar TypeScript',
          category: 'STUDY',
          difficulty: 'MEDIUM',
          estimatedMinutes: 60,
          xpReward: 50,
        },
      ],
    };

    mockGenerateObject.mockResolvedValueOnce({
      object: expectedMockPlan,
    });

    const result = await generatePlanFromLLM({
      availableHours: 4,
      mood: 'EXCITED',
      readinessScore: 90,
    });

    expect(result).toEqual(expectedMockPlan);
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('4h'),
      }),
    );
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('EXCITED'),
      }),
    );
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('90/100'),
      }),
    );
  });

  it('should catch API errors, log them, and throw an AppError 503 (Fail-fast)', async () => {
    const mockApiError = new Error('Google Generative AI Timeout');
    mockGenerateObject.mockRejectedValueOnce(mockApiError);

    const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      generatePlanFromLLM({
        availableHours: 2,
        mood: 'TIRED',
        readinessScore: 30,
      }),
    ).rejects.toThrow(
      new AppError(503, 'A IA Tática está indisponível no momento. Tente novamente.'),
    );

    // Asserts do Log
    expect(consoleSpy).toHaveBeenCalledWith('[AI_ENGINE_ERROR]', mockApiError);

    // Limpa o espião
    consoleSpy.mockRestore();
  });
});
