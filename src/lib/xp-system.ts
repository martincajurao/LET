/**
 * Professional Growth (XP) Utility
 * Defines career progression, tiered unlock ranks, and scaling reward structures.
 * REFACTORED: Tiered multipliers and Skill Expression bonuses for profitability.
 */

export const UNLOCK_RANKS = {
  GENERAL_ED: 1,
  PROFESSIONAL_ED: 3,
  SPECIALIZATION: 5,
  FULL_SIMULATION: 10
};

export const XP_REWARDS = {
  CORRECT_ANSWER: 15,
  FINISH_TRACK: 150,
  FINISH_FULL_SIM: 500,
  MISTAKE_REVIEW: 50,
  AD_WATCH_XP: 25,
  QUICK_FIRE_COMPLETE: 50,
  DAILY_STREAK_BONUS: 100,
  QUESTION_OF_THE_DAY: 25,
  DAILY_LOGIN_BONUS: 50,
  POMODORO_COMPLETE: 30,
  ACHIEVEMENT_UNLOCK: 200,
  PERSONAL_BEST: 150,
  // SKILL EXPRESSION: Confidence-based mechanics
  CONFIDENT_CORRECT_BONUS: 10,
  CONFIDENT_WRONG_PENALTY: -5,
};

export const COOLDOWNS = {
  AD_XP: 30 * 60 * 1000, // 30 minutes
  QUICK_FIRE: 60 * 60 * 1000 // 1 hour
};

// PROFITABILITY CONFIGURATION
export const DAILY_AD_LIMIT = 20; // Maximum profitable clips per day
export const AI_UNLOCK_COST = 10; // Credits to unlock full analysis
export const AI_DEEP_DIVE_COST = 5; // Credits for individual item insight
export const STREAK_RECOVERY_COST = 50; // Credits to save a broken streak

/**
 * TIERED ECONOMY CONFIGURATION
 * Requirements and rewards scale based on academic title groups.
 */
export const CAREER_TIERS = [
  { minRank: 1,  maxRank: 3,  title: "Novice Candidate",     req: 400,   reward: 10,  multiplier: 1.0 },
  { minRank: 4,  maxRank: 6,  title: "Junior Intern",        req: 600,   reward: 15,  multiplier: 1.0 },
  { minRank: 7,  maxRank: 9,  title: "Aspiring Professional", req: 1000,  reward: 25,  multiplier: 1.05 },
  { minRank: 10, maxRank: 12, title: "Qualified Educator",   req: 1500,  reward: 40,  multiplier: 1.1 },
  { minRank: 13, maxRank: 15, title: "Subject Specialist",   req: 2000,  reward: 60,  multiplier: 1.15 },
  { minRank: 16, maxRank: 18, title: "Lead Instructor",      req: 3000,  reward: 80,  multiplier: 1.2 },
  { minRank: 19, maxRank: 21, title: "Senior Educator",      req: 4000,  reward: 120, multiplier: 1.25 },
  { minRank: 22, maxRank: 24, title: "Master Candidate",     req: 5500,  reward: 200, multiplier: 1.3 },
  { minRank: 25, maxRank: 27, title: "Elite Academic",       req: 7500,  reward: 350, multiplier: 1.4 },
  { minRank: 28, maxRank: 30, title: "Distinguished Scholar",req: 10000, reward: 500, multiplier: 1.5 },
  { minRank: 31, maxRank: 99, title: "Master Emeritus",      req: 15000, reward: 1000,multiplier: 2.0 },
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
