
'use server';
/**
 * @fileOverview A Puter.js-powered Genkit flow for batched pedagogical explanations using GPT-5 Nano.
 */

import { ai } from '@/ai/genkit';
import { puter } from '@/ai/puter';
import { z } from 'genkit';

const MistakeItemSchema = z.object({
  questionId: z.string(),
  text: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.string(),
  userAnswer: z.string(),
  subject: z.string(),
});

const ExplainMistakesInputSchema = z.object({
  mistakes: z.array(MistakeItemSchema),
});

export type ExplainMistakesInput = z.infer<typeof ExplainMistakesInputSchema>;

const ExplanationResultSchema = z.object({
  questionId: z.string(),
  aiExplanation: z.string().describe('A very concise pedagogical explanation (max 1 sentence).'),
});

const ExplainMistakesOutputSchema = z.object({
  explanations: z.array(ExplanationResultSchema),
});

export type ExplainMistakesOutput = z.infer<typeof ExplainMistakesOutputSchema>;

export async function explainMistakesBatch(
  input: ExplainMistakesInput
): Promise<ExplainMistakesOutput> {
  return explainMistakesBatchFlow(input);
}

const explainMistakesBatchFlow = ai.defineFlow(
  {
    name: 'explainMistakesBatchFlow',
    inputSchema: ExplainMistakesInputSchema,
    outputSchema: ExplainMistakesOutputSchema,
  },
  async input => {
    if (input.mistakes.length === 0) return { explanations: [] };
    if (!puter || !puter.ai) throw new Error("AI not initialized");

    try {
      const context = input.mistakes.map(m => `Q: ${m.text}\nCorrect: ${m.correctAnswer}\nUser: ${m.userAnswer}`).join('\n---\n');
      
      const response = await puter.ai.chat(`For each of these LET mistakes, provide a 1-sentence pedagogical explanation. 
        Return a JSON array of objects with fields "questionId" and "aiExplanation".
        
        Mistakes:
        ${context}
        
        ONLY return the JSON array, nothing else.`, {
        model: 'gpt-5-nano'
      });

      const rawText = response.toString() || "[]";
      let parsed: any[] = [];
      
      try {
        const jsonStr = rawText.substring(rawText.indexOf('['), rawText.lastIndexOf(']') + 1);
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        try {
          const jsonStr = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
          const obj = JSON.parse(jsonStr);
          parsed = obj.explanations || [obj];
        } catch (innerE) {
          parsed = [];
        }
      }

      // Ensure every item has a questionId and matches schema
      const sanitizedExplanations = input.mistakes.map((m, idx) => {
        const aiItem = Array.isArray(parsed) ? (parsed[idx] || parsed.find((p: any) => p.questionId === m.questionId)) : null;
        return {
          questionId: m.questionId,
          aiExplanation: aiItem?.aiExplanation || aiItem?.explanation || "Review the board-preferred standard for this track."
        };
      });

      return { explanations: sanitizedExplanations };
    } catch (e) {
      console.error("Puter Batch Explanation Error:", e);
      return { 
        explanations: input.mistakes.map(m => ({ 
          questionId: m.questionId, 
          aiExplanation: "Review the board-preferred standard for this track." 
        })) 
      };
    }
  }
);
