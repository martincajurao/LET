/**
 * @fileOverview A Puter.js-powered flow for extracting questions from raw text (extracted from PDF).
 * Note: This function runs in the browser environment since Puter is loaded via script tag.
 */

import { puter } from '@/ai/puter';
import { z } from 'zod';
import { extractRawTextFromPdf } from '@/lib/pdf-extractor';

const ExtractQuestionsInputSchema = z.object({
  pdfDataUri: z.string().describe("The PDF file as a Base64 data URI."),
  subject: z.string().optional(),
  subCategory: z.string().optional(),
});

export type ExtractQuestionsInput = z.infer<typeof ExtractQuestionsInputSchema>;

const ExtractedQuestionSchema = z.object({
  text: z.string(),
  options: z.array(z.string()).length(4),
  correctAnswer: z.string(),
});

const ExtractQuestionsOutputSchema = z.object({
  questions: z.array(ExtractedQuestionSchema),
  error: z.string().optional(),
});

export type ExtractQuestionsOutput = z.infer<typeof ExtractQuestionsOutputSchema>;

export async function extractQuestionsFromPdf(input: ExtractQuestionsInput): Promise<ExtractQuestionsOutput> {
  try {
    // Check if we're in browser environment and Puter is available
    if (typeof window === 'undefined') {
      return { questions: [], error: "PDF extraction is only available in browser environment" };
    }

    if (!puter || !puter.ai) {
      throw new Error("Puter AI module not initialized. Make sure Puter script is loaded.");
    }

    // Step 1: Extract raw text using programmatic library (non-AI)
    const rawText = await extractRawTextFromPdf(input.pdfDataUri);

    // Step 2: Use Puter to structure of raw text
    const prompt = `You are an expert data extraction tool for LET exam.
    Extract multiple-choice questions from provided text and format them into structured JSON.
    
    Subject Context: ${input.subject || 'LET'}
    Majorship Context: ${input.subCategory || 'General'}

    Return a JSON object with a "questions" array. Each question must have:
    - text: string
    - options: array of exactly 4 strings
    - correctAnswer: string (must be one of the options)

    If no questions are found, return an empty array.

    TEXT TO PROCESS:
    ${rawText.substring(0, 15000)} // Limiting to prevent context overflow
    
    ONLY return: JSON object.`;

    const response = await puter.ai.run({
      model: '@puter/llama-3-8b-instruct',
      prompt,
    });

    const rawOutput = response.output || "{\"questions\": []}";
    const jsonStr = rawOutput.substring(rawOutput.indexOf('{'), rawOutput.lastIndexOf('}') + 1);
    const result = JSON.parse(jsonStr);

    return { questions: result.questions || [] };
  } catch (e: any) {
    console.error("Extract Questions PDF Flow Error:", e);
    return { questions: [], error: e.message || "Failed to process PDF content." };
  }
}
