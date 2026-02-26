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
  lastActiveDate: z.string().optional(),
  lastTaskReset: z.string().optional(),
  totalSessionTime: z.number().default(0),
  averageQuestionTime: z.number().default(0),
  isPro: z.boolean().default(false),
  userTier: z.string().default('Bronze'),
  deviceFingerprint: z.string().optional(),
  ipAddress: z.string().default('unknown'),
  isStreakRecoveryRequested: z.boolean().default(false)
});

const DailyTaskOutputSchema = z.object({
  reward: z.number(),
  breakdown: z.object({
    loginBonus: z.number(),
    questionsBonus: z.number(),
    mockBonus: z.number(),
    mistakesBonus: z.number(),
    streakBonus: z.number(),
    timeBonus: z.number(),
    accuracyBonus: z.number()
  }),
  nextResetTime: z.number(),
  streakRecoveryAvailable: z.boolean(),
  message: z.string()
});

export async function processDailyTasks(input: z.infer<typeof DailyTaskInputSchema>) {
  const {
    userId,
    dailyQuestionsAnswered,
    dailyTestsFinished,
    mistakesReviewed,
    streakCount,
    dailyCreditEarned,
    taskLoginClaimed,
    taskQuestionsClaimed,
    taskMockClaimed,
    taskMistakesClaimed,
    lastActiveDate,
    lastTaskReset,
    totalSessionTime,
    averageQuestionTime,
    isPro,
    userTier,
    deviceFingerprint,
    ipAddress,
    isStreakRecoveryRequested
  } = input;

  // Calculate rewards
  let totalReward = 0;
  const breakdown = {
    loginBonus: 0,
    questionsBonus: 0,
    mockBonus: 0,
    mistakesBonus: 0,
    streakBonus: 0,
    timeBonus: 0,
    accuracyBonus: 0
  };

  // Login bonus
  if (!taskLoginClaimed) {
    breakdown.loginBonus = 5;
    totalReward += 5;
  }

  // Questions bonus
  if (!taskQuestionsClaimed && dailyQuestionsAnswered >= 10) {
    breakdown.questionsBonus = Math.min(dailyQuestionsAnswered * 2, 50);
    totalReward += breakdown.questionsBonus;
  }

  // Mock test bonus
  if (!taskMockClaimed && dailyTestsFinished >= 1) {
    breakdown.mockBonus = dailyTestsFinished * 15;
    totalReward += breakdown.mockBonus;
  }

  // Mistakes review bonus
  if (!taskMistakesClaimed && mistakesReviewed >= 5) {
    breakdown.mistakesBonus = Math.min(mistakesReviewed * 3, 30);
    totalReward += breakdown.mistakesBonus;
  }

  // Streak bonus
  if (streakCount > 0) {
    breakdown.streakBonus = Math.min(streakCount * 2, 20);
    totalReward += breakdown.streakBonus;
  }

  // Time bonus
  if (totalSessionTime > 0) {
    breakdown.timeBonus = Math.min(Math.floor(totalSessionTime / 600), 15); // 1 point per 10 minutes, max 15
    totalReward += breakdown.timeBonus;
  }

  // Accuracy bonus (if average time is reasonable)
  if (averageQuestionTime > 0 && averageQuestionTime < 120) {
    breakdown.accuracyBonus = 10;
    totalReward += breakdown.accuracyBonus;
  }

  // Pro multiplier
  if (isPro) {
    totalReward = Math.floor(totalReward * 1.5);
  }

  // Calculate next reset time (midnight UTC)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const nextResetTime = tomorrow.getTime();

  // Check if streak recovery is available
  const streakRecoveryAvailable = !isStreakRecoveryRequested && streakCount === 0;

  const message = totalReward > 0 
    ? `Daily tasks completed! You earned ${totalReward} credits.` 
    : 'Complete more tasks to earn rewards.';

  return {
    reward: totalReward,
    breakdown,
    nextResetTime,
    streakRecoveryAvailable,
    message
  };
}
