import { z } from 'genkit';

const DailyTaskInputSchema = z.object({
  userId: z.string(),
  dailyQuestionsAnswered: z.number().default(0),
  dailyTestsFinished: z.number().default(0),
  mistakesReviewed: z.number().default(0),
  streakCount: z.number().default(0),
  dailyCreditEarned: z.number().default(0),
  taskLoginClaimed: z.boolean().default(false),
  taskQuestionsClaimed: z.boolean().default(false),
  taskMockClaimed: z.boolean().default(false),
  taskMistakesClaimed: z.boolean().default(false),
  lastActiveDate: z.any().optional(),
  lastTaskReset: z.any().optional(),
  totalSessionTime: z.number().default(0),
  averageQuestionTime: z.number().default(0),
  isPro: z.boolean().default(false),
  userTier: z.string().default('Bronze'),
  deviceFingerprint: z.string().optional(),
  ipAddress: z.string().default('unknown'),
  isStreakRecoveryRequested: z.boolean().default(false),
  lastClaimTime: z.any().optional()
});

type StreakAction = 'none' | 'recovered' | 'lost' | 'maintained';

const DailyTaskOutputSchema = z.object({
  reward: z.number(),
  tasksCompleted: z.array(z.string()),
  streakBonus: z.number(),
  qualityBonus: z.number(),
  trustMultiplier: z.number(),
  error: z.string().optional(),
  warning: z.string().optional(),
  abuseFlags: z.array(z.string()).optional(),
  nextResetTime: z.number(),
  shouldResetDaily: z.boolean(),
  recommendedActions: z.array(z.string()),
  streakAction: z.enum(['none', 'recovered', 'lost', 'maintained']).default('maintained'),
  recoveryCost: z.number().optional(),
  cooldownRemaining: z.number().optional()
});


export async function processDailyTasks(input: z.infer<typeof DailyTaskInputSchema>) {
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
      isStreakRecoveryRequested = false,
      lastClaimTime
    } = input;

    const now = new Date();
    const warnings: string[] = [];
    const recommendedActions: string[] = [];
    const abuseFlags: string[] = [];
    let streakAction: StreakAction = 'maintained';

    // COOLDOWN CHECK - Prevent rapid re-claiming (5 minute cooldown)
    const COOLDOWN_MINUTES = 5;
    if (lastClaimTime) {
      const lastClaim = typeof lastClaimTime === 'string' ? new Date(lastClaimTime) : 
                       lastClaimTime?.toDate ? lastClaimTime.toDate() : 
                       new Date(lastClaimTime);
      const diffMs = now.getTime() - lastClaim.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < COOLDOWN_MINUTES) {
        const cooldownRemaining = (COOLDOWN_MINUTES - diffMinutes) * 60; // seconds
        return {
          reward: 0,
          tasksCompleted: [],
          streakBonus: 0,
          qualityBonus: 0,
          trustMultiplier: 1.0,
          error: `Please wait ${COOLDOWN_MINUTES - diffMinutes} minute(s) before claiming again.`,
          nextResetTime: getNextResetTime(now),
          shouldResetDaily: false,
          recommendedActions: ['Wait for cooldown to expire'],
          streakAction: 'none',
          cooldownRemaining
        };
      }
    }

    // 0. DAILY RESET CHECK
    let shouldResetDaily = false;
    const lastReset = lastTaskReset?.toDate ? lastTaskReset.toDate() : 
                     (typeof lastTaskReset === 'string' ? new Date(lastTaskReset) : 
                     (typeof lastTaskReset === 'number' ? new Date(lastTaskReset) : null));
    if (lastReset) {
      if (now.toDateString() !== lastReset.toDateString()) {
        shouldResetDaily = true;
      }
    }

    // 1. STREAK VALIDATION & RECOVERY
    const lastActive = lastActiveDate?.toDate ? lastActiveDate.toDate() : 
                      (typeof lastActiveDate === 'string' ? new Date(lastActiveDate) : 
                      (typeof lastActiveDate === 'number' ? new Date(lastActiveDate) : null));
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

    // 2. GOALS & REWARDS (Standard Rates)
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

    if (actualReward < totalReward) {
      warnings.push(`Daily limit reached. ${totalReward - actualReward} credits capped.`);
    }

    const nextResetTime = getNextResetTime(now);

    return {
      reward: actualReward,
      tasksCompleted,
      streakBonus: 0,
      qualityBonus: 0,
      trustMultiplier: 1.0,
      nextResetTime,
      shouldResetDaily,
      recommendedActions,
      warning: warnings.join(' ') || undefined,
      abuseFlags: abuseFlags.length > 0 ? abuseFlags : undefined,
      streakAction,
      recoveryCost: streakAction === 'lost' ? recoveryCost : undefined
    };
  } catch (e: any) {
    const errorMessage = e.message || "Failed to process rewards.";
    const now = new Date();
    return {
      reward: 0,
      tasksCompleted: [],
      streakBonus: 0,
      qualityBonus: 0,
      trustMultiplier: 1.0,
      error: errorMessage,
      nextResetTime: getNextResetTime(now),
      shouldResetDaily: false,
      recommendedActions: [],
      streakAction: 'none'
    };
  }
}

function getNextResetTime(now: Date): number {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
}
