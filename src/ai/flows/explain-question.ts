
/**
 * @fileOverview A Puter.js-powered flow to explain specific LET questions with cost-control.
 * Note: This function runs in the browser environment since Puter is loaded via script tag.
 */

import { puter } from '@/ai/puter';
import { z } from 'zod';

const ExplainQuestionInputSchema = z.object({
  questionText: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.string(),
  userId: z.string().optional(),
  isPro: z.boolean().optional(),
});
export type ExplainQuestionInput = z.infer<typeof ExplainQuestionInputSchema>;

const ExplainQuestionOutputSchema = z.object({
  explanation: z.string(),
  error: z.string().optional(),
});
export type ExplainQuestionOutput = z.infer<typeof ExplainQuestionOutputSchema>;

export async function explainQuestion(input: ExplainQuestionInput): Promise<ExplainQuestionOutput> {
  try {
    // Check if we're in browser environment and Puter is available
    if (typeof window === 'undefined') {
      return { explanation: "", error: "Question explanation is only available in browser environment" };
    }

    if (!puter || !puter.ai) {
      console.warn("Puter AI not available - using fallback");
      return { 
        explanation: "AI explanation is temporarily unavailable. Please try again later when the service is restored.",
        error: "AI not available"
      };
    }

    // Cooldown and Daily Limits are handled on the client-side component 
    // (ExamInterface) before calling this action, but in a production 
    // environment, we would also verify them here using a server-side SDK.

    const { questionText, options, correctAnswer } = input;

    const response = await puter.ai.chat(`You are an expert LET review assistant. Explain briefly (max 250 words). Structure:
Correct Answer: (Answer)
Why Correct: (Pedagogical reasoning)
Why Others Wrong: (Contrast reasoning)

Be concise, structured, and professional.

Question: ${questionText}
Choices: ${options.join(', ')}
Correct Answer: ${correctAnswer}`, {
        model: 'gpt-5-nano'
      });

    const explanation = response.toString() || "Explanation could not be generated.";
    return { explanation };
  } catch (e: any) {
    console.error("Puter AI Explanation Error:", e);
    return { explanation: "", error: e.message };
  }
}
