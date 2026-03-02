'use server';
/**
 * @fileOverview A Genkit flow to generate high-fidelity situational LET questions.
 * This flow is used to create the "Question of the Day" shared by all users.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const QuestionSchema = z.object({
  text: z.string().describe('A comprehensive situational classroom management or pedagogical scenario.'),
  options: z.array(z.string()).length(4).describe('Four nuanced professional choices.'),
  correctAnswer: z.string().describe('The strategically correct answer.'),
  subject: z.string().describe('Pedagogical track (e.g., Professional Education).'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string().describe('Concise pedagogical reasoning (max 2 sentences).')
});

export async function generateDailyQuestion() {
  return generateQotdFlow();
}

const generateQotdFlow = ai.defineFlow(
  {
    name: 'generateQotdFlow',
    inputSchema: z.void(),
    outputSchema: QuestionSchema,
  },
  async () => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      output: { schema: QuestionSchema },
      prompt: `You are an expert Board Exam (LET) Professor. Generate one unique, high-fidelity situational question for Filipino educators.
      
      Requirements:
      1. Scenario: Focus on professional ethics, classroom management, or modern pedagogical theories (Vygotsky, Piaget, Differentiated Instruction).
      2. Complexity: The scenario must be comprehensive and require analytical reasoning (HOTS).
      3. Options: Provide 4 plausible choices. Distractors should be common teacher mistakes or partially correct but not the best practice.
      4. Language: Clear, professional English as used in the board exams.
      
      Return as a structured JSON object.`,
    });

    if (!output) throw new Error('AI failed to generate daily insight.');
    return output;
  }
);
