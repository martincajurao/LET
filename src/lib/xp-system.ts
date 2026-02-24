/**
 * Professional Growth (XP) Utility
 * Defines career progression, tiered unlock ranks, and scaling reward structures.
 */

export const UNLOCK_RANKS = {
  GENERAL_ED: 1,
  PROFESSIONAL_ED: 3,
  SPECIALIZATION: 7,
  FULL_SIMULATION: 12
};

export const XP_REWARDS = {
  CORRECT_ANSWER: 15,
  FINISH_TRACK: 150,
  FINISH_FULL_SIM: 500,
  MISTAKE_REVIEW: 50,
  AD_WATCH_XP: 75,
  QUICK_FIRE_COMPLETE: 125,
  DAILY_STREAK_BONUS: 100,
};

export const COOLDOWNS = {
  AD_XP: 2 * 60 * 60 * 1000, // 2 hours
  QUICK_FIRE: 4 * 60 * 60 * 1000 // 4 hours
};

/**
 * TIERED ECONOMY CONFIGURATION
 * Requirements and rewards scale based on academic title groups.
 */
const CAREER_TIERS = [
  { minRank: 1,  maxRank: 4,  title: "Novice Candidate",     req: 500,   reward: 10 },
  { minRank: 5,  maxRank: 9,  title: "Aspiring Professional", req: 1000,  reward: 25 },
  { minRank: 10, maxRank: 14, title: "Subject Specialist",   req: 2000,  reward: 50 },
  { minRank: 15, maxRank: 19, title: "Senior Educator",      req: 3500,  reward: 80 },
  { minRank: 20, maxRank: 24, title: "Master Candidate",     req: 5000,  reward: 150 },
  { minRank: 25, maxRank: 29, title: "Elite Academic",       req: 7500,  reward: 250 },
  { minRank: 30, maxRank: 99, title: "Master Emeritus",      req: 10000, reward: 500 },
];

export function getRankTierConfig(rank: number) {
  return CAREER_TIERS.find(t => rank >= t.minRank && rank <= t.maxRank) || CAREER_TIERS[CAREER_TIERS.length - 1];
}

export function getRankData(totalXp: number) {
  let rank = 1;
  let remainingXp = totalXp;
  
  // Calculate current rank by iterating through tiers
  while (true) {
    const config = getRankTierConfig(rank);
    if (remainingXp < config.req) break;
    remainingXp -= config.req;
    rank++;
  }

  const currentTier = getRankTierConfig(rank);
  const progress = (remainingXp / currentTier.req) * 100;
  
  return {
    rank,
    xpInRank: remainingXp,
    nextRankXp: currentTier.req,
    progress,
    title: currentTier.title,
    rankUpReward: currentTier.reward
  };
}

export function getCareerRankTitle(rank: number): string {
  return getRankTierConfig(rank).title;
}

export function isTrackUnlocked(rank: number, track: string): boolean {
  if (track === 'General Education' || track === 'Gen Ed') return rank >= UNLOCK_RANKS.GENERAL_ED;
  if (track === 'Professional Education' || track === 'Prof Ed') return rank >= UNLOCK_RANKS.PROFESSIONAL_ED;
  if (track === 'Specialization' || track === 'Major') return rank >= UNLOCK_RANKS.SPECIALIZATION;
  if (track === 'all') return rank >= UNLOCK_RANKS.FULL_SIMULATION;
  return true;
}
