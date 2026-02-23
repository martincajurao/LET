
'use server';
/**
 * @fileOverview A Puter.js-powered Genkit flow to explain specific LET questions with cost-control.
 */

import { ai } from '@/ai/genkit';
import { puter } from '@/ai/puter';
import { z } from 'genkit';

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
  return explainQuestionFlow(input);
}

const explainQuestionFlow = ai.defineFlow(
  {
    name: 'explainQuestionFlow',
    inputSchema: ExplainQuestionInputSchema,
    outputSchema: ExplainQuestionOutputSchema,
  },
  async (payload) => {
    try {
      // Cooldown and Daily Limits are handled on the client-side component 
      // (ExamInterface) before calling this action, but in a production 
      // environment, we would also verify them here using a server-side SDK.

      const { questionText, options, correctAnswer } = payload;

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
);
