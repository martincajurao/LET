/**
 * Professional Growth (XP) Utility
 * Defines career progression, tiered unlock ranks, and scaling reward structures.
 * REFACTORED: Halved earning rates for profitability + AI credit focus.
 */

export const UNLOCK_RANKS = {
  GENERAL_ED: 1,
  PROFESSIONAL_ED: 3,
  SPECIALIZATION: 5,
  FULL_SIMULATION: 10
};

// HALVED EARNING RATES (Profitability Focus)
export const XP_REWARDS = {
  CORRECT_ANSWER: 8,         // Was 15 - HALVED
  FINISH_TRACK: 75,         // Was 150 - HALVED
  FINISH_FULL_SIM: 375,     // Was 750 - HALVED
  MISTAKE_REVIEW: 15,       // Was 30 - HALVED (but encourages AI use!)
  AD_WATCH_XP: 15,          // Was 30 - HALVED
  QUICK_FIRE_COMPLETE: 30,  // Was 60 - HALVED
  DAILY_STREAK_BONUS: 50,   // Was 100 - HALVED
  QUESTION_OF_THE_DAY: 15,  // Was 30 - HALVED
  DAILY_LOGIN_BONUS: 20,    // Was 50 - HALVED
  POMODORO_COMPLETE: 20,    // Was 40 - HALVED
  ACHIEVEMENT_UNLOCK: 125,  // Was 250 - HALVED
  PERSONAL_BEST: 100,        // Was 200 - HALVED
  // SKILL EXPRESSION: Metacognition mechanics
  CONFIDENT_CORRECT_BONUS: 8,   // Was 15 - HALVED
  CONFIDENT_WRONG_PENALTY: -5,  // Was -10 - HALVED
};

// HALVED CREDIT EARNING (users must spend AI credits to progress)
export const CREDIT_EARNING = {
  // Passive earning (reduced)
  DAILY_LOGIN: 5,           // Was 10 - HALVED
  DAILY_TASK_COMPLETE: 15,  // Was 20 - HALVED  
  STREAK_MILESTONE: 25,     // Was 50 - HALVED
  WEEKLY_GOAL: 50,          // NEW - Weekly bonus
  
  // Active earning (reduced)
  CORRECT_ANSWER: 1,        // Was 2 - HALVED
  FINISH_MOCK_TEST: 15,     // Was 25 - HALVED
  PERFECT_SCORE_BONUS: 50,  // Was 100 - HALVED
  
  // Engagement earning (reduced)
  REFERRAL_SIGNUP: 15,     // Was 25 - HALVED
  REFERRAL_COMPLETE: 25,   // Was 50 - HALVED
  
  // AI-POWERED earning (higher - encourages AI use!)
  AI_EXPLANATION_USED: 3,      // NEW - Earn credits by using AI explanations!
  PERFORMANCE_SUMMARY_VIEWED: 5, // NEW - Earn for viewing AI analysis
  WEEKLY_AI_REPORT: 10,        // NEW - Earn for weekly AI review
};

export const REFERRAL_REWARDS = {
  REFERRER_CREDITS: 10,    // Was 15 - HALVED
  REFEREE_CREDITS: 3,      // Was 5 - HALVED
  MILESTONE_5: 30,         // Was 50 - HALVED
  MILESTONE_10: 100,       // Was 150 - HALVED
  MILESTONE_25: 350,       // Was 500 - HALVED
};

export const COOLDOWNS = {
  AD_XP: 30 * 60 * 1000, // 30 minutes
  QUICK_FIRE: 60 * 60 * 1000 // 1 hour
};

// ANTI-ABUSE THRESHOLDS
export const MIN_QUESTION_TIME = 3; 
export const MIN_QUICK_FIRE_TIME = 15; 
export const MIN_QOTD_TIME = 3; 

// INCREASED AI COSTS (Profitability Focus - users spend more!)
export const AI_COSTS = {
  // Basic AI features (INCREASED from original)
  UNLOCK_RESULTS: 15,       // Was 10 - INCREASED
  EXPLANATION_DEEP_DIVE: 5, // Was 5 - KEPT SAME
  
  // Premium AI features 
  WEEKLY_REPORT: 20,        // Premium AI report
  PERSONALIZED_RECOMMENDATION: 15, // AI recommendations
  
  // NEW: AI Buddy (personal AI tutor that costs credits per prompt)
  AI_BUDDY_PER_PROMPT: 3,   // Cost per conversation with AI Buddy
  
  // Batch operations
  MISTAKE_BATCH_5: 30,      
  MISTAKE_BATCH_10: 50,     
};

// XP BOOSTER SYSTEM (NEW - Spend credits to multiply XP!)
export const XP_BOOSTER = {
  // Booster tiers with credit costs and XP multipliers
  TIER_1: {
    id: 'booster_1',
    name: 'Bronze Booster',
    cost: 25,              // Credits to activate
    duration: 360,          // minutes (6 hours)
    xpMultiplier: 1.5,     // 50% more XP
    description: '+50% XP for 6 hours'
  },
  TIER_2: {
    id: 'booster_2',
    name: 'Silver Booster',
    cost: 50,              // Credits to activate
    duration: 720,         // minutes (12 hours)
    xpMultiplier: 2.0,     // 100% more XP (2x)
    description: '+100% XP for 12 hours'
  },
  TIER_3: {
    id: 'booster_3',
    name: 'Gold Booster',
    cost: 100,             // Credits to activate
    duration: 1440,        // minutes (24 hours)
    xpMultiplier: 3.0,     // 200% more XP (3x)
    description: '+200% XP for 24 hours'
  },
  
  // Daily limits
  MAX_BOOSTER_USES_PER_DAY: 3,
  
  // Stack with existing multipliers
  STACK_WITH_TIER_MULTIPLIER: true,
};

// AI BUDDY SYSTEM (NEW - Personal AI tutor that costs credits per prompt!)
export const AI_BUDDY = {
  // AI Buddy features
  COST_PER_MESSAGE: 3,     // Credits per message/prompt
  DAILY_MESSAGE_LIMIT: 20, // Max messages per day for free users
  PRO_MESSAGE_LIMIT: 100,  // Higher limit for Pro users
  
  // Available AI Buddy modes
  MODES: {
    TUTOR: {
      id: 'tutor',
      name: 'AI Tutor',
      description: 'Explains concepts step-by-step',
      systemPrompt: 'You are a patient LET tutor. Explain concepts clearly and step-by-step.'
    },
    QUIZZER: {
      id: 'quizzers',
      name: 'AI Quizzer',
      description: 'Creates practice questions on any topic',
      systemPrompt: 'You create practice questions for LET exam preparation. Generate multiple choice questions with correct answers.'
    },
    EXPLAINER: {
      id: 'explainer',
      name: 'AI Explainer',
      description: 'Simplifies complex topics',
      systemPrompt: 'You simplify complex educational topics into easy-to-understand explanations for students.'
    },
    MOTIVATOR: {
      id: 'motivator',
      name: 'AI Motivator',
      description: 'Provides encouragement and study tips',
      systemPrompt: 'You motivate students with encouragement, study tips, and positive reinforcement.'
    }
  },
  
  // Default settings
  DEFAULT_MODE: 'tutor',
  MAX_HISTORY_MESSAGES: 10, // Keep last 10 messages for context
};

// OPTIMIZATION: AI explanations are cached in Firestore to avoid repeated API calls
export const AI_OPTIMIZATION = {
  EXPLANATIONS_COLLECTION: 'cached_explanations',
  CACHE_EXPIRY_DAYS: 90,
  MIN_SIMILARITY_THRESHOLD: 0.8,
  USE_STATIC_FALLBACK: true,
};

// AD SHOWCASE CONFIGURATION (NEW - Voluntary ad watching!)
export const AD_SHOWCASE = {
  AD_REWARD_CREDITS: 5,
  AD_REWARD_XP: 15,
  MAX_SHOWCASE_ADS_PER_DAY: 30,
  COOLDOWN_MINUTES: 5,
  BONUS_STREAK_3: 1.25,
  BONUS_STREAK_5: 1.5,
  BONUS_STREAK_10: 2.0,
  SESSION_BONUS_ADS_10: 25,
  SESSION_BONUS_ADS_20: 50,
  SESSION_BONUS_ADS_30: 100,
};

// DAILY LIMITS (NEW - Profitability Control)
export const DAILY_LIMITS = {
  MAX_CREDITS_PER_DAY: 100,
  MAX_XP_PER_DAY: 500,
  MAX_ADS_PER_DAY: 30,
  MAX_AI_EXPLANATIONS_PER_DAY: 20,
};

// Legacy exports
export const AI_UNLOCK_COST = AI_COSTS.UNLOCK_RESULTS;
export const AI_DEEP_DIVE_COST = AI_COSTS.EXPLANATION_DEEP_DIVE;
export const DAILY_AD_LIMIT = AD_SHOWCASE.MAX_SHOWCASE_ADS_PER_DAY;

// STREAK FREEZE SYSTEM
export const STREAK_FREEZE_COST_XP = 500;
export const STREAK_FREEZE_COST_CREDITS = 25;
export const STREAK_RECOVERY_COST = 15; // Cost to recover a broken streak
export const STREAK_WARNING_HOURS = 24;

// FIRST WIN BONUS
export const FIRST_WIN_BONUS_MULTIPLIER = 2;

// MONTHLY MEGA REWARD
export const MONTHLY_REWARD_DAY = 30;
export const MONTHLY_MEGA_REWARD = {
  xp: 5000,
  credits: 500,
  badge: 'Monthly Champion',
  avatarFrame: 'Gold Frame'
};

/**
 * TIERED ECONOMY CONFIGURATION
 */
export const CAREER_TIERS = [
  { minRank: 1,  maxRank: 3,  title: "Novice Candidate",     req: 300,   reward: 10,  multiplier: 1.0 },
  { minRank: 4,  maxRank: 6,  title: "Junior Intern",        req: 500,   reward: 15,  multiplier: 1.05 },
  { minRank: 7,  maxRank: 9,  title: "Aspiring Professional", req: 800,   reward: 25,  multiplier: 1.1 },
  { minRank: 10, maxRank: 12, title: "Qualified Educator",   req: 1200,  reward: 40,  multiplier: 1.2 },
  { minRank: 13, maxRank: 15, title: "Subject Specialist",   req: 1800,  reward: 60,  multiplier: 1.3 },
  { minRank: 16, maxRank: 18, title: "Lead Instructor",      req: 2500,  reward: 100, multiplier: 1.4 },
  { minRank: 19, maxRank: 21, title: "Senior Educator",      req: 3500,  reward: 150, multiplier: 1.5 },
  { minRank: 22, maxRank: 24, title: "Master Candidate",     req: 5000,  reward: 250, multiplier: 1.7 },
  { minRank: 25, maxRank: 27, title: "Elite Academic",       req: 7000,  reward: 400, multiplier: 2.0 },
  { minRank: 28, maxRank: 30, title: "Distinguished Scholar",req: 9000,  reward: 600, multiplier: 2.5 },
  { minRank: 31, maxRank: 99, title: "Master Emeritus",      req: 12000, reward: 1200,multiplier: 3.0 },
];

export function getRankTierConfig(rank: number) {
  return CAREER_TIERS.find(t => rank >= t.minRank && rank <= t.maxRank) || CAREER_TIERS[CAREER_TIERS.length - 1];
}

export function getRankData(totalXp: any) {
  const xpValue = typeof totalXp === 'number' ? totalXp : 0;
  
  let rank = 1;
  let remainingXp = xpValue;
  
  while (true) {
    const config = getRankTierConfig(rank);
    if (remainingXp < config.req) break;
    remainingXp -= config.req;
    rank++;
    if (rank > 100) break;
  }

  const currentTier = getRankTierConfig(rank);
  const progress = (remainingXp / currentTier.req) * 100;
  
  return {
    rank,
    xpInRank: remainingXp,
    nextRankXp: currentTier.req,
    progress,
    title: currentTier.title,
    rankUpReward: currentTier.reward,
    multiplier: currentTier.multiplier
  };
}

export function getCareerRankTitle(rank: number): string {
  return getRankTierConfig(rank).title;
}

export function isTrackUnlocked(rank: number, track: string, unlockedTracks: string[] = []): boolean {
  const unlocked = Array.isArray(unlockedTracks) ? unlockedTracks : [];
  if (unlocked.includes(track)) return true;
  if (track === 'General Education' || track === 'Gen Ed') return rank >= UNLOCK_RANKS.GENERAL_ED;
  if (track === 'Professional Education' || track === 'Prof Ed') return rank >= UNLOCK_RANKS.PROFESSIONAL_ED;
  if (track === 'Specialization' || track === 'Major') return rank >= UNLOCK_RANKS.SPECIALIZATION;
  if (track === 'all') return rank >= UNLOCK_RANKS.FULL_SIMULATION;
  return true;
}

export const QUESTION_LIMITS_BY_RANK: Record<number, { limitGenEd: number; limitProfEd: number; limitSpec: number; total: number }> = {
  1: { limitGenEd: 10, limitProfEd: 10, limitSpec: 10, total: 30 },
  3: { limitGenEd: 25, limitProfEd: 25, limitSpec: 25, total: 75 },
  5: { limitGenEd: 50, limitProfEd: 50, limitSpec: 50, total: 150 },
  7: { limitGenEd: 75, limitProfEd: 75, limitSpec: 75, total: 225 },
  9: { limitGenEd: 100, limitProfEd: 100, limitSpec: 100, total: 300 },
  10: { limitGenEd: 150, limitProfEd: 150, limitSpec: 150, total: 450 },
};

export function getQuestionLimitsByRank(
  rank: number, 
  customLimits?: { genEd?: number; profEd?: number; spec?: number }
): { limitGenEd: number; limitProfEd: number; limitSpec: number; total: number } {
  if (customLimits) {
    const limitGenEd = customLimits.genEd || 10;
    const limitProfEd = customLimits.profEd || 10;
    const limitSpec = customLimits.spec || 10;
    return {
      limitGenEd,
      limitProfEd,
      limitSpec,
      total: limitGenEd + limitProfEd + limitSpec
    };
  }

  const tiers = [10, 9, 7, 5, 3, 1];
  for (const tier of tiers) {
    if (rank >= tier) {
      return QUESTION_LIMITS_BY_RANK[tier];
    }
  }
  
  return QUESTION_LIMITS_BY_RANK[1];
}

export function getRankTierName(rank: number): string {
  if (rank >= 10) return "Master Candidate (Full LET)";
  if (rank >= 9) return "Subject Specialist";
  if (rank >= 7) return "Qualified Educator";
  if (rank >= 5) return "Aspiring Professional";
  if (rank >= 3) return "Junior Intern";
  return "Novice Candidate";
}
