'use server';
/**
 * @fileOverview Refined daily task processing with Adaptive Trust Scoring and Streak Recovery.
 * Implements trust-based multipliers and pedagogical pacing guidance.
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
        totalSessionTime = 0,
        averageQuestionTime = 0,
        isPro = false,
        userTier = 'Bronze',
        isStreakRecoveryRequested = false
      } = input;

      const now = new Date();
      const abuseFlags: string[] = [];
      const warnings: string[] = [];
      const recommendedActions: string[] = [];
      let trustMultiplier = 1.0;
      let streakAction: 'none' | 'recovered' | 'lost' | 'maintained' = 'maintained';
      
      // 0. DAILY RESET CHECK (Calendar Day logic)
      let shouldResetDaily = false;
      const lastReset = lastTaskReset?.toDate ? lastTaskReset.toDate() : (typeof lastTaskReset === 'number' ? new Date(lastTaskReset) : null);
      if (lastReset) {
        if (now.toDateString() !== lastReset.toDateString()) {
          shouldResetDaily = true;
        }
      }

      // 1. TRUST SCORE & ABUSE DETECTION
      if (dailyQuestionsAnswered > 5) {
        if (averageQuestionTime < 4) {
          abuseFlags.push('suspicious_speed');
          warnings.push('Speed too fast: Quality penalty applied.');
          trustMultiplier = 0.3;
          recommendedActions.push('Spend at least 15s per question to restore reward levels.');
        } else if (averageQuestionTime >= 15 && averageQuestionTime <= 90) {
          trustMultiplier = 1.2; // Bonus for high-quality deep focus
          recommendedActions.push('Excellent pacing! Keep this analytical flow.');
        }
      }

      // 2. STREAK VALIDATION & RECOVERY (Profitability Hack)
      const lastActive = lastActiveDate?.toDate ? lastActiveDate.toDate() : (typeof lastActiveDate === 'number' ? new Date(lastActiveDate) : null);
      const recoveryCost = 50; 

      if (lastActive) {
        const diffMs = now.getTime() - lastActive.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays > 1) {
          if (isStreakRecoveryRequested && !taskLoginClaimed) {
            streakAction = 'recovered';
            recommendedActions.push('Streak saved! 50 Credits spent on recovery.');
          } else if (diffDays > 2) {
            streakAction = 'lost';
            abuseFlags.push('streak_broken');
            warnings.push('Long inactivity: Streak has been reset.');
          }
        }
      }

      // 3. GOALS & REWARDS (Adaptive by Tier)
      const tasksCompleted: string[] = [];
      let totalReward = 0;
      let qualityBonus = 0;

      const tierMultipliers = {
        'Bronze': { questions: 20, tests: 1, mistakes: 10, rewardMultiplier: 1.0 },
        'Silver': { questions: 25, tests: 1, mistakes: 12, rewardMultiplier: 1.1 },
        'Gold': { questions: 30, tests: 2, mistakes: 15, rewardMultiplier: 1.2 },
        'Platinum': { questions: 35, tests: 2, mistakes: 18, rewardMultiplier: 1.3 }
      };

      const config = tierMultipliers[userTier as keyof typeof tierMultipliers] || tierMultipliers.Bronze;

      // Only process rewards if no reset is pending (reset clears these anyway)
      if (!shouldResetDaily) {
        // Login (Calibrated for baseline)
        if (!taskLoginClaimed) {
          totalReward += Math.floor(5 * trustMultiplier);
          tasksCompleted.push('login');
        }

        // Question Goal
        if (dailyQuestionsAnswered >= config.questions && !taskQuestionsClaimed) {
          totalReward += Math.floor(10 * config.rewardMultiplier * trustMultiplier);
          tasksCompleted.push('questions');
          if (trustMultiplier >= 1.2) qualityBonus += 5;
        }

        // Mock Test Goal
        if (dailyTestsFinished >= config.tests && !taskMockClaimed) {
          totalReward += Math.floor(15 * config.rewardMultiplier * trustMultiplier);
          tasksCompleted.push('mock');
        }

        // Mistakes Goal
        if (mistakesReviewed >= config.mistakes && !taskMistakesClaimed) {
          totalReward += Math.floor(10 * config.rewardMultiplier * trustMultiplier);
          tasksCompleted.push('mistakes');
        }

        // Perfect Day Bonus
        if (tasksCompleted.length >= 4) {
          qualityBonus += 10;
          recommendedActions.push('Perfect daily performance! Maximum calibration reached.');
        }
      }

      // 4. PROGRESSIVE LIMITS
      let maxDaily = isPro ? 200 : (userTier === 'Platinum' ? 120 : 80);
      if (abuseFlags.includes('suspicious_speed')) maxDaily = 30;

      const potentialTotal = totalReward + qualityBonus;
      const actualReward = (dailyCreditEarned + potentialTotal > maxDaily) 
        ? Math.max(0, maxDaily - dailyCreditEarned) 
        : potentialTotal;

      if (actualReward === 0 && potentialTotal > 0) {
        warnings.push('Daily earning limit reached. Simulations remain free.');
      }

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      return {
        reward: actualReward,
        tasksCompleted,
        streakBonus: 0, 
        qualityBonus,
        trustMultiplier,
        nextResetTime: tomorrow.getTime(),
        shouldResetDaily,
        recommendedActions,
        warning: warnings.join(' '),
        abuseFlags: abuseFlags.length > 0 ? abuseFlags : undefined,
        streakAction,
        recoveryCost: streakAction === 'lost' ? recoveryCost : undefined
      };
    } catch (e: any) {
      return { 
        reward: 0, 
        tasksCompleted: [], 
        streakBonus: 0, 
        qualityBonus: 0,
        trustMultiplier: 1.0,
        error: e.message || "Failed to process rewards.",
        streakAction: 'none'
      };
    }
  }
);
