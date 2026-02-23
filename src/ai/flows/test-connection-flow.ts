
'use server';
/**
 * @fileOverview A Puter.js-powered Genkit flow to test the AI connection using GPT-5 Nano.
 */

import { ai } from '@/ai/genkit';
import { puter } from '@/ai/puter';
import { z } from 'genkit';

const TestConnectionOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  timestamp: z.number(),
});

export type TestConnectionOutput = z.infer<typeof TestConnectionOutputSchema>;

export async function testAIConnection(): Promise<TestConnectionOutput> {
  return testAIConnectionFlow();
}

const testAIConnectionFlow = ai.defineFlow(
  {
    name: 'testAIConnectionFlow',
    outputSchema: TestConnectionOutputSchema,
  },
  async () => {
    try {
      if (!puter || !puter.ai) {
        throw new Error("Puter AI module not initialized.");
      }

      const response = await puter.ai.chat("Say 'Puter AI (GPT-5 Nano) is online.' in 5 words or less.", {
        model: 'gpt-5-nano'
      });

      return {
        success: true,
        message: response.toString() || "Connected.",
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error("Puter Connection Test Error:", error);
      return {
        success: false,
        message: `Failed: ${error.message || "Unknown error"}`,
        timestamp: Date.now(),
      };
    }
  }
);
