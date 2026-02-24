/**
 * Professional Growth (XP) Utility
 * Defines career progression, unlock levels, and reward structures.
 */

export const XP_PER_LEVEL = 1000;

export const UNLOCK_LEVELS = {
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

export function getLevelData(totalXp: number) {
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpInLevel = totalXp % XP_PER_LEVEL;
  const progress = (xpInLevel / XP_PER_LEVEL) * 100;
  
  return {
    level,
    xpInLevel,
    nextLevelXp: XP_PER_LEVEL,
    progress,
    title: getCareerRankTitle(level)
  };
}

function getCareerRankTitle(level: number): string {
  if (level >= 30) return "Master Emeritus";
  if (level >= 25) return "Elite Academic";
  if (level >= 20) return "Master Candidate";
  if (level >= 15) return "Senior Educator";
  if (level >= 10) return "Subject Specialist";
  if (level >= 5) return "Aspiring Professional";
  return "Novice Candidate";
}

export function isTrackUnlocked(level: number, track: string): boolean {
  if (track === 'General Education' || track === 'Gen Ed') return level >= UNLOCK_LEVELS.GENERAL_ED;
  if (track === 'Professional Education' || track === 'Prof Ed') return level >= UNLOCK_LEVELS.PROFESSIONAL_ED;
  if (track === 'Specialization' || track === 'Major') return level >= UNLOCK_LEVELS.SPECIALIZATION;
  if (track === 'all') return level >= UNLOCK_LEVELS.FULL_SIMULATION;
  return true;
}
