/**
 * @fileOverview A Puter.js-powered flow for batched pedagogical explanations using GPT-5 Nano.
 * Note: This function runs in the browser environment since Puter is loaded via script tag.
 */

import { puter } from '@/ai/puter';
import { z } from 'zod';

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
  aiExplanation: z.string().describe('A concise pedagogical explanation (max 2 sentences).'),
});

const ExplainMistakesOutputSchema = z.object({
  explanations: z.array(ExplanationResultSchema),
});

export type ExplainMistakesOutput = z.infer<typeof ExplainMistakesOutputSchema>;

export async function explainMistakesBatch(
  input: ExplainMistakesInput
): Promise<ExplainMistakesOutput> {
  try {
    // Check if we're in browser environment and Puter is available
    if (typeof window === 'undefined') {
      return { explanations: [] };
    }

    if (input.mistakes.length === 0) return { explanations: [] };
    
    if (!puter || !puter.ai) {
      console.warn("Puter AI not available - using fallback");
      return { 
        explanations: input.mistakes.map(m => ({ 
          questionId: m.questionId, 
          aiExplanation: "Review the core concepts related to this subject track." 
        })) 
      };
    }

    const context = input.mistakes.map(m => `Q: ${m.text}\nCorrect: ${m.correctAnswer}\nUser: ${m.userAnswer}`).join('\n---\n');
    
    const response = await puter.ai.chat(`For each of these LET mistakes, provide a 2-sentence pedagogical explanation. 
      First sentence: Identify the correct answer.
      Second sentence: Explain why the user's answer was wrong and the key concept they missed.
      Return a JSON array of objects with fields "questionId" and "aiExplanation".
      
      Mistakes:
      ${context}
      
      ONLY return JSON array, nothing else.`, {
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
        aiExplanation: aiItem?.aiExplanation || aiItem?.explanation || "Review the core concepts related to this subject track."
      };
    });

    return { explanations: sanitizedExplanations };
  } catch (e) {
    console.error("Puter Batch Explanation Error:", e);
    return { 
      explanations: input.mistakes.map(m => ({ 
        questionId: m.questionId, 
        aiExplanation: "Review the core concepts related to this subject track." 
      })) 
    };
  }
}
