
/**
 * @fileOverview A Puter.js-powered flow for adaptive question generation using GPT-5 Nano.
 * Note: This function runs in the browser environment since Puter is loaded via script tag.
 */

import { puter } from '@/ai/puter';
import { z } from 'zod';

const AdaptiveQuestionSelectionInputSchema = z.object({
  previousAttempts: z.array(
    z.object({
      questionId: z.string(),
      subject: z.string(),
      subCategory: z.string().optional(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      isCorrect: z.boolean(),
    })
  ).optional(),
  numberOfQuestionsToGenerate: z.number().int().positive().default(5).optional(),
});
export type AdaptiveQuestionSelectionInput = z.infer<typeof AdaptiveQuestionSelectionInputSchema>;

const QuestionSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  options: z.array(z.string()).min(4).max(4),
  correctAnswer: z.string(),
  explanation: z.string().describe('Short explanation (max 1 sentence).'),
  subject: z.string(),
  subCategory: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

const AdaptiveQuestionSelectionOutputSchema = z.object({
  questions: z.array(QuestionSchema),
});
export type AdaptiveQuestionSelectionOutput = z.infer<typeof AdaptiveQuestionSelectionOutputSchema>;

export async function adaptiveQuestionSelection(input: AdaptiveQuestionSelectionInput): Promise<AdaptiveQuestionSelectionOutput> {
  try {
    // Check if we're in browser environment and Puter is available
    if (typeof window === 'undefined') {
      return { questions: [] };
    }

    if (!puter || !puter.ai) throw new Error("AI not initialized");

    const weakAreas = input.previousAttempts
      ?.filter(a => !a.isCorrect)
      .map(a => `${a.subCategory || ''} ${a.subject}`)
      .join(', ') || 'General Education';

    const prompt = `You are an expert LET educator. Generate ${input.numberOfQuestionsToGenerate || 5} unique multiple-choice questions focusing on these weak areas: ${weakAreas}. 
    
    Return a JSON object with a "questions" array. Each question must have:
    - text: string
    - options: array of 4 strings
    - correctAnswer: string (must be one of the options)
    - explanation: string (max 1 sentence)
    - subject: string
    - difficulty: "easy", "medium", or "hard"
    
    ONLY return JSON object.`;

    const response = await puter.ai.chat(prompt, {
      model: 'gpt-5-nano',
    });

    const rawText = response.toString() || "{\"questions\": []}";
    const jsonStr = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
    const result = JSON.parse(jsonStr) as AdaptiveQuestionSelectionOutput;

    if (result && result.questions) {
      result.questions.forEach(q => { if (!q.id) q.id = crypto.randomUUID(); });
    }
    return result;
  } catch (e: any) {
    console.error("Adaptive Question Selection Error:", e);
    return { questions: [] };
  }
}
