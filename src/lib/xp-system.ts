/**
 * Professional Growth (XP) Utility
 * Defines career progression, unlock ranks, and reward structures.
 */

export const XP_PER_RANK = 1000;

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
  // This is the maximum bonus available for a perfect Quick Fire session (5/5)
  QUICK_FIRE_COMPLETE: 125,
  DAILY_STREAK_BONUS: 100
};

export const COOLDOWNS = {
  AD_XP: 2 * 60 * 60 * 1000, // 2 hours
  QUICK_FIRE: 4 * 60 * 60 * 1000 // 4 hours
};

export function getRankData(totalXp: number) {
  const rank = Math.floor(totalXp / XP_PER_RANK) + 1;
  const xpInRank = totalXp % XP_PER_RANK;
  const progress = (xpInRank / XP_PER_RANK) * 100;
  
  return {
    rank,
    xpInRank,
    nextRankXp: XP_PER_RANK,
    progress,
    title: getCareerRankTitle(rank)
  };
}

function getCareerRankTitle(rank: number): string {
  if (rank >= 30) return "Master Emeritus";
  if (rank >= 25) return "Elite Academic";
  if (rank >= 20) return "Master Candidate";
  if (rank >= 15) return "Senior Educator";
  if (rank >= 10) return "Subject Specialist";
  if (rank >= 5) return "Aspiring Professional";
  return "Novice Candidate";
}

export function isTrackUnlocked(rank: number, track: string): boolean {
  if (track === 'General Education' || track === 'Gen Ed') return rank >= UNLOCK_RANKS.GENERAL_ED;
  if (track === 'Professional Education' || track === 'Prof Ed') return rank >= UNLOCK_RANKS.PROFESSIONAL_ED;
  if (track === 'Specialization' || track === 'Major') return rank >= UNLOCK_RANKS.SPECIALIZATION;
  if (track === 'all') return rank >= UNLOCK_RANKS.FULL_SIMULATION;
  return true;
}
