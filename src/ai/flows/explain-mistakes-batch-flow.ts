/**
 * @fileOverview A Puter.js-powered flow for batched pedagogical explanations using GPT-5 Nano.
 * Note: This function runs in the browser environment since Puter is loaded via script tag.
 * OPTIMIZED: Explanations are cached in Firestore - first call costs credits, subsequent calls are FREE!
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

    // Build context - OPTIMIZED for shorter prompts (reduces API costs)
    const context = input.mistakes.map(m => 
      `Q: ${m.text.substring(0, 150)}... | Correct: ${m.correctAnswer} | Wrong: ${m.userAnswer} | Subject: ${m.subject}`
    ).join('\n');

    // STREAMLINED PROMPT: More concise for faster processing & lower costs
    const response = await puter.ai.chat(`Generate brief pedagogical explanations for each mistake.
      Format: JSON array with "questionId" and "aiExplanation" (max 2 sentences each).
      Focus on: 1) What the correct answer is, 2) Why the answer is correct, 3) Key concept to remember.
      
      Questions:
      ${context}
      
      JSON:`, {
      model: 'gpt-5-nano',
      max_tokens: 2048
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

    const sanitizedExplanations = input.mistakes.map((m, idx) => {
      const aiItem = Array.isArray(parsed) ? (parsed[idx] || parsed.find((p: any) => p.questionId === m.questionId)) : null;
      return {
        questionId: m.questionId,
        aiExplanation: aiItem?.aiExplanation || "Review the core concepts related to this subject track."
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

