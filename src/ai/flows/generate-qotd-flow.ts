/**
 * @fileOverview A Puter.js-powered flow to generate high-fidelity situational LET questions.
 * This flow is used to create the "Question of the Day" shared by all users.
 * Note: This function runs in the browser environment since Puter is loaded via script tag.
 */

import { puter } from '@/ai/puter';
import { z } from 'zod';

const QuestionSchema = z.object({
  text: z.string().describe('A concise situational classroom management or pedagogical scenario (2-3 sentences max).'),
  options: z.array(z.string()).length(4).describe('Four nuanced professional choices.'),
  correctAnswer: z.string().describe('The strategically correct answer.'),
  subject: z.string().describe('Pedagogical track (e.g., Professional Education).'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string().describe('Concise pedagogical reasoning (max 2 sentences).')
});

export type DailyQuestion = z.infer<typeof QuestionSchema>;

/**
 * Generates a fresh SITUATIONAL question using Puter AI.
 * This runs on the client-side.
 */
export async function generateDailyQuestion(): Promise<DailyQuestion> {
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      throw new Error("Puter AI is only available in browser environment");
    }

    if (!puter || !puter.ai) {
      console.warn("Puter AI not available - using fallback question");
      return getFallbackQuestion();
    }

    const prompt = `You are an expert Board Exam (LET) Professor. Generate one unique, concise situational question for Filipino educators.
      
      Requirements:
      1. Scenario: Exactly 2-3 sentences. Focus on professional ethics, classroom management, or modern theories.
      2. Directness: Avoid unnecessary fluff. Mirror the professional, concise style of actual PRC board exam items.
      3. Options: Provide 4 plausible professional choices. 
      4. Language: Clear, professional English as used in the board exams.
      
      Return a JSON object with:
      - text: string (the 2-3 sentence scenario)
      - options: array of exactly 4 strings
      - correctAnswer: string (must be one of the options)
      - subject: "Professional Education"
      - difficulty: "hard"
      - explanation: string (max 2 sentences)
      
      ONLY return JSON object.`;

    const response = await puter.ai.chat(prompt, {
      model: 'gpt-5-nano',
    });

    const rawText = response.toString() || "{}";
    const jsonStr = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
    const result = JSON.parse(jsonStr) as DailyQuestion;

    // Validate result structure roughly
    if (!result.text || !result.options || result.options.length !== 4) {
      throw new Error("Invalid AI response structure");
    }

    return result;
  } catch (e: any) {
    console.error("Puter Daily Question Error:", e);
    return getFallbackQuestion();
  }
}

function getFallbackQuestion(): DailyQuestion {
  return {
    text: "Teacher Anna noticed that some of her Grade 7 students consistently underperform in collaborative tasks but excel individually. Following Vygotsky's Zone of Proximal Development, what should be her first strategic intervention?",
    options: [
      "Provide scaffolding through peer-tutoring with high-performing classmates",
      "Assign more individual projects to capitalize on their current strengths",
      "Request a meeting with parents to discuss behavioral issues in groups",
      "Re-administer the individual assessments to verify the students' scores"
    ],
    correctAnswer: "Provide scaffolding through peer-tutoring with high-performing classmates",
    subject: "Professional Education",
    difficulty: "hard",
    explanation: "Scaffolding within the ZPD involves providing temporary support (peer tutoring) to help students perform tasks they cannot yet do independently."
  };
}
