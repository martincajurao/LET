/**
 * @fileOverview A Puter.js-powered flow for structuring raw text into LET questions.
 * Note: This function runs in the browser environment since Puter is loaded via script tag.
 */

import { puter } from '@/ai/puter';
import { z } from 'zod';

const ProcessTextToQuestionsInputSchema = z.object({
  rawText: z.string().describe("The raw text extracted from a PDF."),
  subject: z.string().optional(),
  subCategory: z.string().optional(),
});
export type ProcessTextToQuestionsInput = z.infer<typeof ProcessTextToQuestionsInputSchema>;

const ExtractedQuestionSchema = z.object({
  text: z.string(),
  options: z.array(z.string()).length(4),
  correctAnswer: z.string(),
});

const ProcessTextToQuestionsOutputSchema = z.object({
  questions: z.array(ExtractedQuestionSchema),
});
export type ProcessTextToQuestionsOutput = z.infer<typeof ProcessTextToQuestionsOutputSchema>;

export async function processTextToQuestions(input: ProcessTextToQuestionsInput): Promise<ProcessTextToQuestionsOutput> {
  try {
    // Check if we're in browser environment and Puter is available
    if (typeof window === 'undefined') {
      return { questions: [] };
    }

    if (!puter || !puter.ai) {
      throw new Error("Puter AI module not initialized. Make sure Puter script is loaded.");
    }

    const prompt = `You are an expert content structurer for LET exam.
    Extract multiple-choice questions from provided text and format them into structured JSON.
    Each question must have exactly 4 options.
    
    Context:
    Subject: ${input.subject || 'LET'}
    Majorship: ${input.subCategory || 'General'}
    
    RAW TEXT:
    ${input.rawText}
    
    Return a JSON object with a "questions" array.
    ONLY return JSON object.`;

    const response = await puter.ai.run({
      model: '@puter/llama-3-8b-instruct',
      prompt,
    });

    const rawOutput = response.output || "{\"questions\": []}";
    const jsonStr = rawOutput.substring(rawOutput.indexOf('{'), rawOutput.lastIndexOf('}') + 1);
    const result = JSON.parse(jsonStr);

    return { questions: result.questions || [] };
  } catch (e: any) {
    console.error("Process Text To Questions Error:", e);
    return { questions: [] };
  }
}
