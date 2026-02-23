'use server';
/**
 * @fileOverview A Puter.js-powered Genkit flow for structuring raw text into LET questions.
 */

import { ai } from '@/ai/genkit';
import { puter } from '@/ai/puter';
import { z } from 'genkit';

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
  return processTextToQuestionsFlow(input);
}

const processTextToQuestionsFlow = ai.defineFlow(
  {
    name: 'processTextToQuestionsFlow',
    inputSchema: ProcessTextToQuestionsInputSchema,
    outputSchema: ProcessTextToQuestionsOutputSchema,
  },
  async (input) => {
    try {
      const prompt = `You are an expert content structurer for the LET exam.
      Extract multiple-choice questions from the provided text and format them into structured JSON.
      Each question must have exactly 4 options.
      
      Context:
      Subject: ${input.subject || 'LET'}
      Majorship: ${input.subCategory || 'General'}
      
      RAW TEXT:
      ${input.rawText}
      
      Return a JSON object with a "questions" array.
      ONLY return the JSON object.`;

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
);
