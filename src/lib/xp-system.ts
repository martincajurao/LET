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
  FINISH_FULL_SIM: 750, // BUFFED for endurance
  MISTAKE_REVIEW: 50,
  AD_WATCH_XP: 30, // BUFFED for effort
  QUICK_FIRE_COMPLETE: 60, // BUFFED for speed
  DAILY_STREAK_BONUS: 100,
  QUESTION_OF_THE_DAY: 30,
  DAILY_LOGIN_BONUS: 50,
  POMODORO_COMPLETE: 40, // BUFFED for focus
  ACHIEVEMENT_UNLOCK: 250,
  PERSONAL_BEST: 200,
  // SKILL EXPRESSION: Metacognition mechanics
  CONFIDENT_CORRECT_BONUS: 15, // High reward for certainty
  CONFIDENT_WRONG_PENALTY: -10, // High risk for overconfidence
};

export const COOLDOWNS = {
  AD_XP: 30 * 60 * 1000, // 30 minutes
  QUICK_FIRE: 60 * 60 * 1000 // 1 hour
};

// ANTI-ABUSE THRESHOLDS
export const MIN_QUESTION_TIME = 3; 
export const MIN_QUICK_FIRE_TIME = 15; 
export const MIN_QOTD_TIME = 3; 

// PROFITABILITY CONFIGURATION
export const DAILY_AD_LIMIT = 20; 
export const AI_UNLOCK_COST = 10; 
export const AI_DEEP_DIVE_COST = 5; 
export const STREAK_RECOVERY_COST = 50; 

/**
 * TIERED ECONOMY CONFIGURATION
 * Re-balanced for early-game speed and late-game prestige.
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
