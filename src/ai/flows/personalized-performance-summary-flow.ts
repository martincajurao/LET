
/**
 * @fileOverview A Puter.js-powered flow for personalized performance summaries using GPT-5 Nano.
 * Note: This function runs in the browser environment since Puter is loaded via script tag.
 */

import { puter } from '@/ai/puter';
import { z } from 'zod';

const PersonalizedPerformanceSummaryInputSchema = z.object({
  testResults: z.array(z.object({
    subjectName: z.string(),
    totalQuestions: z.number().int(),
    correctAnswers: z.number().int(),
    incorrectAnswers: z.number().int(),
    scorePercentage: z.number(),
    timeSpentSeconds: z.number().int().optional(),
  })),
  overallScorePercentage: z.number(),
  overallTimeSpentSeconds: z.number().int().optional(),
});

export type PersonalizedPerformanceSummaryInput = z.infer<typeof PersonalizedPerformanceSummaryInputSchema>;

const PersonalizedPerformanceSummaryOutputSchema = z.object({
  summary: z.string().describe('A very short summary (max 15 words).'),
  strengths: z.array(z.string()).describe('Top 2 strengths.'),
  weaknesses: z.array(z.string()).describe('Top 2 weaknesses.'),
  recommendations: z.string().describe('One concise actionable step.'),
});

export type PersonalizedPerformanceSummaryOutput = z.infer<typeof PersonalizedPerformanceSummaryOutputSchema>;

export async function generatePersonalizedPerformanceSummary(
  input: PersonalizedPerformanceSummaryInput
): Promise<PersonalizedPerformanceSummaryOutput> {
  try {
    // Check if we're in browser environment and Puter is available
    if (typeof window === 'undefined') {
      return {
        summary: `Score: ${input.overallScorePercentage}%.`,
        strengths: [],
        weaknesses: [],
        recommendations: "Continue practicing."
      };
    }

    if (!puter || !puter.ai) {
      console.warn("Puter AI not available - using fallback");
      return {
        summary: `Score: ${input.overallScorePercentage}%.`,
        strengths: [],
        weaknesses: [],
        recommendations: "Continue practicing all tracks."
      };
    }

    const breakdown = input.testResults.map(r => `${r.subjectName}: ${r.scorePercentage}%`).join(', ');
    
    const response = await puter.ai.chat(`Analyze this LET board simulation performance and return a JSON object with fields: summary (string, max 15 words), strengths (string array, max 2), weaknesses (string array, max 2), recommendations (string, max 1 sentence).
      
      Overall Score: ${input.overallScorePercentage}%
      Breakdown: ${breakdown}
      
      ONLY return JSON object, nothing else.`, {
      model: 'gpt-5-nano'
    });

    // Simple JSON extraction in case model adds markers
    const rawText = response.toString() || "{}";
    const jsonStr = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
    const output = JSON.parse(jsonStr);

    return {
      summary: output.summary || `Finished with ${input.overallScorePercentage}%.`,
      strengths: output.strengths || [],
      weaknesses: output.weaknesses || [],
      recommendations: output.recommendations || "Continue practicing all tracks."
    };
  } catch (e) {
    console.error("Puter Performance Summary Error:", e);
    return {
      summary: `Simulation complete. Board Rating: ${input.overallScorePercentage}%.`,
      strengths: [],
      weaknesses: [],
      recommendations: "Target your weakest track to stabilize your average."
    };
  }
}
