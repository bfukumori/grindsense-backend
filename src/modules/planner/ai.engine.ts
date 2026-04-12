import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { AppError } from '@/utils/app-error';

export const aiPlanSchema = z.object({
  aiSummary: z.string().describe('Mensagem motivacional estilo treinador militar.'),
  tasks: z
    .array(
      z.object({
        title: z.string().describe('Ação clara e direta.'),
        category: z.enum(['STUDY', 'WORK', 'HEALTH', 'REST']),
        difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
        estimatedMinutes: z.number().describe('Duração (múltiplos de 15).'),
        xpReward: z.number().min(10).max(100),
      }),
    )
    .max(5),
});

export type AiPlan = z.infer<typeof aiPlanSchema>;

export async function generatePlanFromLLM(ctx: {
  availableHours: number;
  mood: string;
  readinessScore: number;
}): Promise<AiPlan> {
  try {
    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: aiPlanSchema,
      system: `Você é a IA tática do GrindSense. Planeje o dia com foco em performance.`,
      prompt: `Disponibilidade: ${ctx.availableHours}h. Humor: ${ctx.mood}. Prontidão: ${ctx.readinessScore}/100.`,
      temperature: 0.4,
      abortSignal: AbortSignal.timeout(15000),
    });

    return object;
  } catch (error) {
    console.error('[AI_ENGINE_ERROR]', error);
    throw new AppError(503, 'A IA Tática está indisponível no momento. Tente novamente.');
  }
}
