/**
 * @fileOverview Standardized daily task processing.
 * Restored to original rates by removing speed-based penalties and trust multipliers.
 * 
 * NOTE: This file has been modified to work with static export.
 * The 'use server' directive was removed as it doesn't work with Next.js static output.
 * For server-side processing, use Firebase Cloud Functions instead.
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
  taskLoginClaimed: z.boolean().optional().describe('Whether login reward was already claimed'),
  taskQuestionsClaimed: z.boolean().optional().describe('Whether questions task reward was already claimed'),
  taskMockClaimed: z.boolean().optional().describe('Whether mock test task reward was already claimed'),
  taskMistakesClaimed: z.boolean().optional().describe('Whether mistakes review task reward was already claimed'),
  lastActiveDate: z.any().optional().describe('Last active date for streak validation'),
  lastTaskReset: z.any().optional().describe('Last time daily tasks were reset'),
  totalSessionTime: z.number().optional().describe('Total time spent in app today (seconds)'),
  averageQuestionTime: z.number().optional().describe('Average time per question (seconds)'),
  isPro: z.boolean().optional().describe('Whether user has Pro subscription'),
  userTier: z.string().optional().describe('User tier based on activity'),
  deviceFingerprint: z.string().optional().describe('Device fingerprint for abuse detection'),
  ipAddress: z.string().optional().describe('IP address for rate limiting'),
  isStreakRecoveryRequested: z.boolean().optional().describe('Whether user wants to spend credits to save streak'),
});
export type DailyTaskInput = z.infer<typeof DailyTaskInputSchema>;

type StreakAction = 'none' | 'recovered' | 'lost' | 'maintained';

const DailyTaskOutputSchema = z.object({
  reward: z.number().describe('The amount of credits earned.'),
  tasksCompleted: z.array(z.string()).describe('List of completed tasks'),
  streakBonus: z.number().describe('Streak bonus if applicable'),
  qualityBonus: z.number().describe('Quality bonus for genuine engagement'),
  trustMultiplier: z.number().describe('Multiplier based on user behavior trust'),
  error: z.string().optional(),
  warning: z.string().optional(),
  abuseFlags: z.array(z.string()).optional().describe('Potential abuse detected'),
  nextResetTime: z.number().optional().describe('Timestamp for next daily reset'),
  shouldResetDaily: z.boolean().optional().describe('Whether the daily tasks should be reset now'),
  recommendedActions: z.array(z.string()).optional().describe('Recommended actions for user'),
  streakAction: z.enum(['none', 'recovered', 'lost', 'maintained']).default('maintained'),
  recoveryCost: z.number().optional().describe('Cost to recover a broken streak'),
});
export type DailyTaskOutput = z.infer<typeof DailyTaskOutputSchema>;

/**
 * Process daily tasks for a user.
 * NOTE: This function now runs client-side. For production use with static export,
 * use Firebase Cloud Functions (dailyTask) for server-side processing.
 */
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
        dailyQuestionsAnswered = 0, 
        dailyTestsFinished = 0, 
        mistakesReviewed = 0,
        streakCount = 0,
        dailyCreditEarned = 0,
        taskLoginClaimed = false,
        taskQuestionsClaimed = false, 
        taskMockClaimed = false, 
        taskMistakesClaimed = false,
        lastActiveDate,
        lastTaskReset,
        isPro = false,
        userTier = 'Bronze',
        isStreakRecoveryRequested = false
      } = input;

      const now = new Date();
      const warnings: string[] = [];
      const recommendedActions: string[] = [];
      let streakAction: StreakAction = 'maintained';
      
      // 0. DAILY RESET CHECK
      let shouldResetDaily = false;
      const lastReset = lastTaskReset?.toDate ? lastTaskReset.toDate() : (typeof lastTaskReset === 'number' ? new Date(lastTaskReset) : null);
      if (lastReset) {
        if (now.toDateString() !== lastReset.toDateString()) {
          shouldResetDaily = true;
        }
      }

      // 1. STREAK VALIDATION & RECOVERY
      const lastActive = lastActiveDate?.toDate ? lastActiveDate.toDate() : (typeof lastActiveDate === 'number' ? new Date(lastActiveDate) : null);
      const recoveryCost = 50; 

      if (lastActive) {
        const diffMs = now.getTime() - lastActive.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays > 1) {
          if (isStreakRecoveryRequested && !taskLoginClaimed) {
            streakAction = 'recovered';
            recommendedActions.push('Streak saved!');
          } else if (diffDays > 2) {
            streakAction = 'lost';
            warnings.push('Inactivity: Streak reset.');
          }
        }
      }

      // 2. GOALS & REWARDS (Standard Rates Restored)
      const tasksCompleted: string[] = [];
      let totalReward = 0;

      const tierGoals = {
        'Bronze': { questions: 20, tests: 1, mistakes: 10 },
        'Silver': { questions: 25, tests: 1, mistakes: 12 },
        'Gold': { questions: 30, tests: 2, mistakes: 15 },
        'Platinum': { questions: 35, tests: 2, mistakes: 18 }
      };

      const config = tierGoals[userTier as keyof typeof tierGoals] || tierGoals.Bronze;

      if (!shouldResetDaily) {
        if (!taskLoginClaimed) {
          totalReward += 5;
          tasksCompleted.push('login');
        }

        if (dailyQuestionsAnswered >= config.questions && !taskQuestionsClaimed) {
          totalReward += 10;
          tasksCompleted.push('questions');
        }

        if (dailyTestsFinished >= config.tests && !taskMockClaimed) {
          totalReward += 15;
          tasksCompleted.push('mock');
        }

        if (mistakesReviewed >= config.mistakes && !taskMistakesClaimed) {
          totalReward += 10;
          tasksCompleted.push('mistakes');
        }
      }

      // 3. PROGRESSIVE LIMITS
      const maxDaily = isPro ? 200 : 80;
      const actualReward = (dailyCreditEarned + totalReward > maxDaily) 
        ? Math.max(0, maxDaily - dailyCreditEarned) 
        : totalReward;

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      return {
        reward: actualReward,
        tasksCompleted,
        streakBonus: 0, 
        qualityBonus: 0,
        trustMultiplier: 1.0,
        nextResetTime: tomorrow.getTime(),
        shouldResetDaily,
        recommendedActions,
        warning: warnings.join(' '),
        streakAction,
        recoveryCost: streakAction === 'lost' ? recoveryCost : undefined
      };
    } catch (e: any) {
      const errorMessage = e.message || "Failed to process rewards.";
      return { 
        reward: 0, 
        tasksCompleted: [], 
        streakBonus: 0, 
        qualityBonus: 0,
        trustMultiplier: 1.0,
        error: errorMessage,
        streakAction: 'none' as StreakAction
      };
    }
  }
);
