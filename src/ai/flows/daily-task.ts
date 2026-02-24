'use server';
/**
 * @fileOverview Enhanced daily task processing with abuse prevention and profitability controls.
 * Implements advanced validation, anti-abuse mechanisms, and dynamic reward calculations.
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
  totalSessionTime: z.number().optional().describe('Total time spent in app today (seconds)'),
  averageQuestionTime: z.number().optional().describe('Average time per question (seconds)'),
  isPro: z.boolean().optional().describe('Whether user has Pro subscription'),
  userTier: z.string().optional().describe('User tier based on activity'),
  deviceFingerprint: z.string().optional().describe('Device fingerprint for abuse detection'),
  ipAddress: z.string().optional().describe('IP address for rate limiting'),
});
export type DailyTaskInput = z.infer<typeof DailyTaskInputSchema>;

const DailyTaskOutputSchema = z.object({
  reward: z.number().describe('The amount of credits earned.'),
  tasksCompleted: z.array(z.string()).describe('List of completed tasks'),
  streakBonus: z.number().describe('Streak bonus if applicable'),
  qualityBonus: z.number().describe('Quality bonus for genuine engagement'),
  error: z.string().optional(),
  warning: z.string().optional(),
  abuseFlags: z.array(z.string()).optional().describe('Potential abuse detected'),
  nextResetTime: z.number().optional().describe('Timestamp for next daily reset'),
  recommendedActions: z.array(z.string()).optional().describe('Recommended actions for user'),
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
        totalSessionTime = 0,
        averageQuestionTime = 0,
        isPro = false,
        userTier = 'Bronze',
        deviceFingerprint,
        ipAddress
      } = input;

      // ABUSE PREVENTION CHECKS
      const abuseFlags: string[] = [];
      const warnings: string[] = [];
      
      // 1. Speed abuse detection - users completing tasks too quickly
      if (dailyQuestionsAnswered > 0 && averageQuestionTime > 0 && averageQuestionTime < 3) {
        abuseFlags.push('suspicious_speed');
        warnings.push('Questions answered unusually quickly');
      }
      
      // 2. Volume abuse detection - excessive activity in short time
      if (totalSessionTime > 0 && dailyQuestionsAnswered > 50 && totalSessionTime < 1800) { // 50 questions in < 30 mins
        abuseFlags.push('excessive_volume');
        warnings.push('Unusually high activity detected');
      }
      
      // 3. Streak validation - check for streak manipulation
      const now = new Date();
      const lastActive = lastActiveDate?.toDate ? lastActiveDate.toDate() : null;
      let validStreak = true;
      
      if (streakCount > 0 && lastActive) {
        const daysSinceLastActive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastActive > 2) {
          validStreak = false;
          abuseFlags.push('streak_manipulation');
          warnings.push('Streak data inconsistent');
        }
      }
      
      // 4. Credit farming detection
      if (dailyCreditEarned > 80 && !isPro) { // Tightened for profitability
        abuseFlags.push('credit_farming');
        warnings.push('Approaching daily credit limit');
      }

      // DYNAMIC TASK CALCULATIONS WITH QUALITY METRICS
      const tasksCompleted: string[] = [];
      let totalReward = 0;
      let qualityBonus = 0;

      // Enhanced task goals based on user tier
      const tierMultipliers = {
        'Bronze': { questions: 20, tests: 1, mistakes: 10, rewardMultiplier: 1.0 },
        'Silver': { questions: 25, tests: 1, mistakes: 12, rewardMultiplier: 1.1 },
        'Gold': { questions: 30, tests: 2, mistakes: 15, rewardMultiplier: 1.2 },
        'Platinum': { questions: 35, tests: 2, mistakes: 18, rewardMultiplier: 1.3 }
      };

      const userTierConfig = tierMultipliers[userTier as keyof typeof tierMultipliers] || tierMultipliers.Bronze;

      // 0. Daily Login Reward (Calibrated for Profitability)
      if (!taskLoginClaimed) {
        const loginReward = 5; 
        totalReward += loginReward;
        tasksCompleted.push('login');
      }

      // 1. Questions task with quality validation
      if (dailyQuestionsAnswered >= userTierConfig.questions && !taskQuestionsClaimed) {
        if (averageQuestionTime >= 10 && averageQuestionTime <= 120) { 
          qualityBonus += 2;
        }
        
        const questionReward = Math.floor(5 * userTierConfig.rewardMultiplier);
        totalReward += questionReward;
        tasksCompleted.push('questions');
      }

      // 2. Mock test task
      if (dailyTestsFinished >= userTierConfig.tests && !taskMockClaimed) {
        const testReward = Math.floor(10 * userTierConfig.rewardMultiplier);
        totalReward += testReward;
        tasksCompleted.push('mock');
      }

      // 3. Mistakes review
      if (mistakesReviewed >= userTierConfig.mistakes && !taskMistakesClaimed) {
        if (mistakesReviewed >= userTierConfig.mistakes * 1.5) {
          qualityBonus += 3;
        }
        
        const mistakesReward = Math.floor(5 * userTierConfig.rewardMultiplier);
        totalReward += mistakesReward;
        tasksCompleted.push('mistakes');
      }

      // 4. Focus challenge bonus (30-60 minute sessions)
      if (totalSessionTime >= 1800 && totalSessionTime <= 3600) {
        qualityBonus += 3;
        tasksCompleted.push('focus_challenge');
      }

      // 5. Perfect day challenge bonus
      const allTasksCompleted = dailyQuestionsAnswered >= userTierConfig.questions && 
                              dailyTestsFinished >= userTierConfig.tests && 
                              mistakesReviewed >= userTierConfig.mistakes;
      if (allTasksCompleted && !taskQuestionsClaimed && !taskMockClaimed && !taskMistakesClaimed) {
        qualityBonus += 5;
        tasksCompleted.push('perfect_day');
      }

      // Enhanced streak system
      let streakBonus = 0;
      if (validStreak) {
        if (streakCount >= 30) {
          streakBonus = 50; 
          tasksCompleted.push('streak_30');
        } else if (streakCount >= 14) {
          streakBonus = 30; 
          tasksCompleted.push('streak_14');
        } else if (streakCount >= 7) {
          streakBonus = 20;
          tasksCompleted.push('streak_7');
        } else if (streakCount >= 3) {
          streakBonus = 10;
          tasksCompleted.push('streak_3');
        }
      }

      totalReward += streakBonus + qualityBonus;

      // Progressive daily limits with abuse prevention
      let maxDailyCredits = 80; 
      
      if (isPro) {
        maxDailyCredits = 200; 
      } else if (abuseFlags.length > 0) {
        maxDailyCredits = 30; 
      } else if (userTier === 'Platinum') {
        maxDailyCredits = 120;
      }
      
      if (dailyCreditEarned + totalReward > maxDailyCredits) {
        const remainingCredits = Math.max(0, maxDailyCredits - dailyCreditEarned);
        totalReward = remainingCredits;
        
        if (remainingCredits === 0) {
          warnings.push('Daily earning limit reached');
        }
      }

      // Apply abuse penalties
      if (abuseFlags.length > 0) {
        totalReward = Math.floor(totalReward * 0.2); // 80% penalty for abuse
      }

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const nextResetTime = tomorrow.getTime();

      const recommendedActions: string[] = [];
      if (tasksCompleted.length === 0) {
        if (!taskLoginClaimed) recommendedActions.push('Claim your Daily Login Bonus');
        recommendedActions.push(`Complete ${userTierConfig.questions - dailyQuestionsAnswered} more questions`);
      }

      return {
        reward: totalReward,
        tasksCompleted,
        streakBonus,
        qualityBonus,
        nextResetTime,
        recommendedActions,
        warning: warnings.length > 0 ? warnings.join('; ') : undefined,
        abuseFlags: abuseFlags.length > 0 ? abuseFlags : undefined
      };
    } catch (e: any) {
      return { 
        reward: 0, 
        tasksCompleted: [], 
        streakBonus: 0, 
        qualityBonus: 0,
        error: e.message || "Failed to process rewards." 
      };
    }
  }
);
