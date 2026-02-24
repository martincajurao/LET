/**
 * @fileOverview A Puter.js-powered flow to test the AI connection using GPT-5 Nano.
 * Note: This function runs in the browser environment since Puter is loaded via script tag.
 */

import { puter } from '@/ai/puter';
import { z } from 'zod';

const TestConnectionOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  timestamp: z.number(),
});

export type TestConnectionOutput = z.infer<typeof TestConnectionOutputSchema>;

export async function testAIConnection(): Promise<TestConnectionOutput> {
  try {
    // Check if we're in browser environment and Puter is available
    if (typeof window === 'undefined') {
      return {
        success: false,
        message: "Puter AI is only available in browser environment",
        timestamp: Date.now(),
      };
    }

    if (!puter || !puter.ai) {
      console.warn("Puter AI not available - using fallback");
      return {
        success: false,
        message: "Puter AI module not initialized. Make sure Puter script is loaded.",
        timestamp: Date.now(),
      };
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
