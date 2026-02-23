'use server';
/**
 * @fileOverview A server action for daily task processing logic using Genkit 1.x.
 * Server-side validation and reward calculation for daily tasks.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DailyTaskInputSchema = z.object({
  userId: z.string().describe('The ID of the user.'),
  dailyQuestionsAnswered: z.number().optional().describe('Number of questions answered today'),
  dailyTestsFinished: z.number().optional().describe('Number of mock tests finished today'),
  mistakesReviewed: z.number().optional().describe('Number of wrong answers reviewed today'),
  streakCount: z.number().optional().describe('Current streak count'),
  dailyCreditEarned: z.number().optional().describe('Credits earned today'),
  taskQuestionsClaimed: z.boolean().optional().describe('Whether questions task reward was already claimed'),
  taskMockClaimed: z.boolean().optional().describe('Whether mock test task reward was already claimed'),
  taskMistakesClaimed: z.boolean().optional().describe('Whether mistakes review task reward was already claimed'),
});
export type DailyTaskInput = z.infer<typeof DailyTaskInputSchema>;

const DailyTaskOutputSchema = z.object({
  reward: z.number().describe('The amount of credits earned.'),
  tasksCompleted: z.array(z.string()).describe('List of completed tasks'),
  streakBonus: z.number().describe('Streak bonus if applicable'),
  error: z.string().optional(),
});
export type DailyTaskOutput = z.infer<typeof DailyTaskOutputSchema>;

export async function processDailyTasks(input: DailyTaskInput): Promise<DailyTaskOutput> {
  return dailyTaskFlow(input);
}

const dailyTaskFlow = ai.defineFlow(
  {
    name: 'dailyTaskFlow',
    inputSchema: DailyTaskInputSchema,
    outputSchema: DailyTaskOutputSchema,
  },
  async (input) => {
    try {
      const { 
        userId, 
        dailyQuestionsAnswered, 
        dailyTestsFinished, 
        mistakesReviewed,
        streakCount = 0,
        dailyCreditEarned = 0,
        taskQuestionsClaimed, 
        taskMockClaimed, 
        taskMistakesClaimed 
      } = input;

      // Calculate rewards based on tasks
      // Task rewards from README:
      // Complete 20 questions → +5 credits
      // Finish 1 mock test → +10 credits
      // Review 10 wrong answers → +5 credits
      // 3-day streak → +15 credits
      // 7-day streak → +30 credits

      const tasksCompleted: string[] = [];
      let totalReward = 0;

      // Check questions task (20 questions = +5 credits)
      const questionsGoal = 20;
      if (dailyQuestionsAnswered && dailyQuestionsAnswered >= questionsGoal && !taskQuestionsClaimed) {
        totalReward += 5;
        tasksCompleted.push('questions');
      }

      // Check mock test task (1 test = +10 credits)
      const mockTestGoal = 1;
      if (dailyTestsFinished && dailyTestsFinished >= mockTestGoal && !taskMockClaimed) {
        totalReward += 10;
        tasksCompleted.push('mock');
      }

      // Check mistakes review task (10 mistakes = +5 credits)
      const mistakesGoal = 10;
      if (mistakesReviewed && mistakesReviewed >= mistakesGoal && !taskMistakesClaimed) {
        totalReward += 5;
        tasksCompleted.push('mistakes');
      }

      // Calculate streak bonus
      let streakBonus = 0;
      
      if (streakCount >= 7) {
        streakBonus = 30;
        tasksCompleted.push('streak_7');
      } else if (streakCount >= 3) {
        streakBonus = 15;
        tasksCompleted.push('streak_3');
      }

      totalReward += streakBonus;

      // Apply daily credit limit (max 50 credits earnable per day)
      const maxDailyCredits = 50;
      
      if (dailyCreditEarned + totalReward > maxDailyCredits) {
        const remainingCredits = Math.max(0, maxDailyCredits - dailyCreditEarned);
        totalReward = remainingCredits;
      }

      // If no tasks completed, return 0
      if (tasksCompleted.length === 0) {
        return { reward: 0, tasksCompleted: [], streakBonus: 0 };
      }

      return { 
        reward: totalReward, 
        tasksCompleted,
        streakBonus 
      };
    } catch (e: any) {
      return { reward: 0, tasksCompleted: [], streakBonus: 0, error: e.message || "Failed to process rewards." };
    }
  }
);
