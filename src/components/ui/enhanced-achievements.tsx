'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Star, 
  Flame, 
  Target, 
  Award,
  Lock,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Clock,
  TrendingUp,
  Calendar,
  Medal,
  Shield,
  ShieldCheck,
  Zap,
  Moon,
  Sun,
  Users,
  Swords,
  Crown,
  Rocket,
  Brain,
  Timer,
  Zap as SpeedIcon,
  Moon as NightIcon,
  Sun as DayIcon,
  Heart,
  Share2,
  Gift,
  Sparkles,
  ChevronRight,
  Filter,
  Lock as LockIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { XP_REWARDS } from "@/lib/xp-system";
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '@/hooks/use-sound';
import { CelebrationEffect, useCelebration } from './celebration-effects';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  requirement: number;
  type: 'streak' | 'questions' | 'score' | 'rank' | 'subject' | 'time' | 'daily' | 'social' | 'seasonal' | 'speed' | 'mastery';
  xpReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  isLimited?: boolean;
  season?: string;
}

// Extended achievement list with all categories
export const EXTENDED_ACHIEVEMENTS: Achievement[] = [
  // STREAK ACHIEVEMENTS
  { id: 'streak_3', name: 'Getting Started', description: 'Maintain a 3-day study streak', icon: <Flame className="w-6 h-6" />, requirement: 3, type: 'streak', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'common', category: 'Streak' },
  { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day study streak', icon: <Flame className="w-6 h-6 text-orange-500" />, requirement: 7, type: 'streak', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Streak' },
  { id: 'streak_14', name: 'Fortnight Fighter', description: 'Maintain a 14-day study streak', icon: <Flame className="w-6 h-6 text-orange-600" />, requirement: 14, type: 'streak', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 1.5, rarity: 'rare', category: 'Streak' },
  { id: 'streak_30', name: 'Monthly Master', description: 'Maintain a 30-day study streak', icon: <Flame className="w-6 h-6 text-red-500" />, requirement: 30, type: 'streak', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'epic', category: 'Streak' },
  { id: 'streak_60', name: 'Bimonthly Bold', description: 'Maintain a 60-day study streak', icon: <Flame className="w-6 h-6 text-red-600" />, requirement: 60, type: 'streak', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 2, rarity: 'epic', category: 'Streak' },
  { id: 'streak_100', name: 'Century Scholar', description: 'Maintain a 100-day study streak', icon: <ShieldCheck className="w-6 h-6 text-yellow-500" />, requirement: 100, type: 'streak', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 2, rarity: 'legendary', category: 'Streak' },
  { id: 'streak_365', name: 'Year of Excellence', description: 'Maintain a 365-day study streak', icon: <Crown className="w-6 h-6 text-yellow-500" />, requirement: 365, type: 'streak', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 5, rarity: 'legendary', category: 'Streak' },

  // QUESTIONS ACHIEVEMENTS
  { id: 'questions_50', name: 'Question Collector', description: 'Answer 50 questions', icon: <BookOpen className="w-6 h-6 text-blue-500" />, requirement: 50, type: 'questions', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'common', category: 'Progress' },
  { id: 'questions_100', name: 'Knowledge Initiate', description: 'Answer 100 questions', icon: <BookOpen className="w-6 h-6 text-blue-600" />, requirement: 100, type: 'questions', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'common', category: 'Progress' },
  { id: 'questions_200', name: 'Quiz Enthusiast', description: 'Answer 200 questions', icon: <BookOpen className="w-6 h-6 text-purple-500" />, requirement: 200, type: 'questions', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Progress' },
  { id: 'questions_500', name: 'Knowledge Seeker', description: 'Answer 500 questions', icon: <GraduationCap className="w-6 h-6 text-emerald-500" />, requirement: 500, type: 'questions', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'epic', category: 'Progress' },
  { id: 'questions_1000', name: 'Question Master', description: 'Answer 1000 questions', icon: <Brain className="w-6 h-6 text-emerald-600" />, requirement: 1000, type: 'questions', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 2, rarity: 'epic', category: 'Progress' },
  { id: 'questions_5000', name: 'Grand Academic', description: 'Answer 5000 questions', icon: <Trophy className="w-6 h-6 text-yellow-500" />, requirement: 5000, type: 'questions', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 3, rarity: 'legendary', category: 'Progress' },

  // SCORE ACHIEVEMENTS
  { id: 'score_80', name: 'High Achiever', description: 'Get 80% or higher in any exam', icon: <Target className="w-6 h-6 text-green-500" />, requirement: 80, type: 'score', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'common', category: 'Performance' },
  { id: 'score_90', name: 'Excellence', description: 'Get 90% or higher in any exam', icon: <Star className="w-6 h-6 text-yellow-500" />, requirement: 90, type: 'score', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Performance' },
  { id: 'score_100', name: 'Perfect Score', description: 'Get 100% in any exam', icon: <Trophy className="w-6 h-6 text-amber-500" />, requirement: 100, type: 'score', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 3, rarity: 'legendary', category: 'Performance' },
  { id: 'score_100_multiple', name: 'Consistent Perfection', description: 'Get 100% 5 times', icon: <Award className="w-6 h-6 text-yellow-500" />, requirement: 5, type: 'score', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 4, rarity: 'legendary', category: 'Performance' },

  // RANK ACHIEVEMENTS
  { id: 'rank_5', name: 'Rising Candidate', description: 'Reach rank 5', icon: <TrendingUp className="w-6 h-6 text-blue-500" />, requirement: 5, type: 'rank', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'common', category: 'Career' },
  { id: 'rank_10', name: 'Rising Star', description: 'Reach rank 10', icon: <TrendingUp className="w-6 h-6 text-blue-500" />, requirement: 10, type: 'rank', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'common', category: 'Career' },
  { id: 'rank_25', name: 'Seasoned Educator', description: 'Reach rank 25', icon: <Medal className="w-6 h-6 text-purple-500" />, requirement: 25, type: 'rank', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Career' },
  { id: 'rank_50', name: 'Distinguished Leader', description: 'Reach rank 50', icon: <Shield className="w-6 h-6 text-emerald-500" />, requirement: 50, type: 'rank', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'epic', category: 'Career' },
  { id: 'rank_75', name: 'Elite Professional', description: 'Reach rank 75', icon: <Crown className="w-6 h-6 text-yellow-500" />, requirement: 75, type: 'rank', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 2, rarity: 'epic', category: 'Career' },
  { id: 'rank_100', name: 'Master Educator', description: 'Reach rank 100', icon: <Trophy className="w-6 h-6 text-yellow-500" />, requirement: 100, type: 'rank', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 3, rarity: 'legendary', category: 'Career' },

  // DAILY ACHIEVEMENTS
  { id: 'daily_first', name: 'Early Bird', description: 'Complete your first daily question', icon: <Clock className="w-6 h-6 text-amber-500" />, requirement: 1, type: 'daily', xpReward: XP_REWARDS.QUESTION_OF_THE_DAY, rarity: 'common', category: 'Daily' },
  { id: 'daily_7', name: 'Daily Devotee', description: 'Complete 7 daily questions', icon: <Calendar className="w-6 h-6 text-green-500" />, requirement: 7, type: 'daily', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Daily' },
  { id: 'daily_30', name: 'Monthly Devotee', description: 'Complete 30 daily questions', icon: <Calendar className="w-6 h-6 text-emerald-500" />, requirement: 30, type: 'daily', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 1.5, rarity: 'epic', category: 'Daily' },

  // SPEED ACHIEVEMENTS
  { id: 'speed_under_30', name: 'Quick Thinker', description: 'Complete a question under 30 seconds', icon: <SpeedIcon className="w-6 h-6 text-blue-500" />, requirement: 30, type: 'speed', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 0.5, rarity: 'common', category: 'Speed' },
  { id: 'speed_under_20', name: 'Speed Reader', description: '50 questions under 20 seconds average', icon: <SpeedIcon className="w-6 h-6 text-purple-500" />, requirement: 50, type: 'speed', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 1.5, rarity: 'rare', category: 'Speed' },
  { id: 'speed_under_10', name: 'Speed Demon', description: 'Complete a question under 10 seconds', icon: <Rocket className="w-6 h-6 text-red-500" />, requirement: 10, type: 'speed', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 1.5, rarity: 'epic', category: 'Speed' },
  { id: 'quickfire_fast', name: 'Rapid Responder', description: 'Complete Quick Fire in under 60 seconds', icon: <Timer className="w-6 h-6 text-orange-500" />, requirement: 60, type: 'speed', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Speed' },

  // TIME-BASED ACHIEVEMENTS
  { id: 'night_owl', name: 'Night Owl', description: 'Complete questions after 10 PM', icon: <NightIcon className="w-6 h-6 text-indigo-500" />, requirement: 1, type: 'time', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 0.5, rarity: 'common', category: 'Time' },
  { id: 'early_bird_time', name: 'Early Bird', description: 'Complete questions before 7 AM', icon: <DayIcon className="w-6 h-6 text-yellow-500" />, requirement: 1, type: 'time', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 0.5, rarity: 'common', category: 'Time' },
  { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Complete 50 questions on weekends', icon: <Calendar className="w-6 h-6 text-pink-500" />, requirement: 50, type: 'time', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Time' },

  // SOCIAL ACHIEVEMENTS
  { id: 'referral_1', name: 'First Recruit', description: 'Refer your first friend', icon: <Users className="w-6 h-6 text-blue-500" />, requirement: 1, type: 'social', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'common', category: 'Social' },
  { id: 'referral_5', name: 'Mentor', description: 'Help 5 friends pass (referral success)', icon: <Users className="w-6 h-6 text-purple-500" />, requirement: 5, type: 'social', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Social' },
  { id: 'referral_10', name: 'Guild Mentor', description: 'Refer 10 friends', icon: <Medal className="w-6 h-6 text-emerald-500" />, requirement: 10, type: 'social', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 1.5, rarity: 'epic', category: 'Social' },
  { id: 'referral_25', name: 'Master Recruiter', description: 'Refer 25 friends', icon: <Crown className="w-6 h-6 text-yellow-500" />, requirement: 25, type: 'social', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 2, rarity: 'legendary', category: 'Social' },
  { id: 'share_result', name: 'Social Butterfly', description: 'Share your results 10 times', icon: <Share2 className="w-6 h-6 text-pink-500" />, requirement: 10, type: 'social', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Social' },
  { id: 'duel_challenger', name: 'Challenger', description: 'Challenge a friend to a duel', icon: <Swords className="w-6 h-6 text-red-500" />, requirement: 1, type: 'social', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'common', category: 'Social' },
  { id: 'duel_warrior', name: 'Duel Warrior', description: 'Complete 10 duels', icon: <Swords className="w-6 h-6 text-orange-500" />, requirement: 10, type: 'social', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Social' },
  { id: 'squad_quest_10', name: 'Team Player', description: 'Complete squad quests 10 times', icon: <Users className="w-6 h-6 text-green-500" />, requirement: 10, type: 'social', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 1.5, rarity: 'rare', category: 'Social' },

  // SEASONAL ACHIEVEMENTS (Limited Time)
  { id: 'seasonal_exam_month', name: 'Board Exam Warrior', description: 'Take 10 full simulations in a week', icon: <BookOpen className="w-6 h-6 text-red-500" />, requirement: 10, type: 'seasonal', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 2, rarity: 'epic', category: 'Seasonal', isLimited: true, season: 'exam_month' },
  { id: 'seasonal_new_year', name: 'New Year Resolution', description: 'Start a streak in the new year', icon: <Rocket className="w-6 h-6 text-yellow-500" />, requirement: 1, type: 'seasonal', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Seasonal', isLimited: true, season: 'new_year' },
  { id: 'seasonal_teacher_month', name: 'Teacher Month Champion', description: 'Complete 500 questions in Teacher Month', icon: <GraduationCap className="w-6 h-6 text-purple-500" />, requirement: 500, type: 'seasonal', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 3, rarity: 'legendary', category: 'Seasonal', isLimited: true, season: 'teacher_month' },

  // MASTERY ACHIEVEMENTS
  { id: 'mastery_gened', name: 'General Education Master', description: 'Get 90%+ in all Gen Ed categories', icon: <Shield className="w-6 h-6 text-blue-500" />, requirement: 1, type: 'mastery', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 2, rarity: 'epic', category: 'Mastery' },
  { id: 'mastery_profed', name: 'Professional Education Master', description: 'Get 90%+ in all Prof Ed categories', icon: <Shield className="w-6 h-6 text-purple-500" />, requirement: 1, type: 'mastery', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 2, rarity: 'epic', category: 'Mastery' },
  { id: 'mastery_specialization', name: 'Subject Expert', description: '100% in all Specialization questions', icon: <Star className="w-6 h-6 text-emerald-500" />, requirement: 1, type: 'mastery', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 2, rarity: 'epic', category: 'Mastery' },
  { id: 'mastery_full_sim', name: 'Full Simulation Expert', description: 'Get 90%+ in 10 full simulations', icon: <Trophy className="w-6 h-6 text-yellow-500" />, requirement: 10, type: 'mastery', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 3, rarity: 'legendary', category: 'Mastery' },

  // SPECIAL ACHIEVEMENTS
  { id: 'first_exam', name: 'First Steps', description: 'Complete your first exam', icon: <Star className="w-6 h-6 text-green-500" />, requirement: 1, type: 'daily', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 0.5, rarity: 'common', category: 'Milestone' },
  { id: 'first_perfect', name: 'Perfection Introduction', description: 'Get your first 100% score', icon: <Award className="w-6 h-6 text-yellow-500" />, requirement: 1, type: 'score', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 2, rarity: 'rare', category: 'Milestone' },
  { id: 'first_streak_7', name: 'Streak Started', description: 'Reach your first 7-day streak', icon: <Flame className="w-6 h-6 text-orange-500" />, requirement: 7, type: 'streak', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Milestone' },
];

interface EnhancedAchievementSystemProps {
  userStats: { 
    streakCount: number; 
    totalQuestionsAnswered: number; 
    highestScore: number;
    perfectScoreCount?: number;
    rank: number; 
    dailyQuestionsCompleted: number;
    referralCount?: number;
    sharedResultsCount?: number;
    avgTimePerQuestion?: number;
    quickFireBestTime?: number;
    nightQuestionsCompleted?: number;
    earlyMorningQuestionsCompleted?: number;
    weekendQuestionsCompleted?: number;
    genEdMastery?: boolean;
    profEdMastery?: boolean;
    specializationMastery?: boolean;
    fullSim90PlusCount?: number;
    // New achievement tracking fields
    squadQuestsCompleted?: number;
    duelsCreated?: number;
    duelsWon?: number;
    questionsUnder20Seconds?: number;
    weeklyFullSimulations?: number;
    lastWeeklyReset?: number;
    perfectStreakCount?: number;
    totalPerfectScores?: number;
  };
  unlockedAchievements: string[];
  onAchievementUnlock?: (achievement: Achievement) => void;
  showCelebration?: boolean;
}

type CategoryFilter = 'all' | 'Streak' | 'Progress' | 'Performance' | 'Career' | 'Daily' | 'Speed' | 'Time' | 'Social' | 'Seasonal' | 'Mastery' | 'Milestone';

export function EnhancedAchievementSystem({ 
  userStats, 
  unlockedAchievements, 
  onAchievementUnlock,
  showCelebration = true 
}: EnhancedAchievementSystemProps) {
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const { playAchievement } = useSound();
  const { celebration, triggerConfetti, clearCelebration } = useCelebration();

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
      case 'rare': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      case 'epic': return 'text-purple-500 bg-purple-500/10 border-purple-500/30';
      case 'legendary': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getProgress = (achievement: Achievement): number => {
    let current = 0;
    switch (achievement.type) {
      case 'streak': current = userStats.streakCount; break;
      case 'questions': current = userStats.totalQuestionsAnswered; break;
      case 'score': current = achievement.id === 'score_100_multiple' ? (userStats.perfectScoreCount || 0) : userStats.highestScore; break;
      case 'rank': current = userStats.rank; break;
      case 'daily': current = userStats.dailyQuestionsCompleted; break;
      case 'social': current = achievement.id === 'share_result' ? (userStats.sharedResultsCount || 0) : (userStats.referralCount || 0); break;
      case 'speed': current = achievement.id === 'quickfire_fast' ? (userStats.quickFireBestTime || 999) : (userStats.avgTimePerQuestion || 999); break;
      case 'time': 
        if (achievement.id === 'night_owl') current = userStats.nightQuestionsCompleted || 0;
        else if (achievement.id === 'early_bird_time') current = userStats.earlyMorningQuestionsCompleted || 0;
        else current = userStats.weekendQuestionsCompleted || 0;
        break;
      case 'mastery':
        if (achievement.id === 'mastery_gened') current = userStats.genEdMastery ? 1 : 0;
        else if (achievement.id === 'mastery_profed') current = userStats.profEdMastery ? 1 : 0;
        else if (achievement.id === 'mastery_specialization') current = userStats.specializationMastery ? 1 : 0;
        else current = userStats.fullSim90PlusCount || 0;
        break;
      case 'seasonal': current = 0; break; // Would need special logic
    }
    // For speed achievements, lower is better
    if (achievement.type === 'speed') {
      return Math.max(0, Math.min(((achievement.requirement - current) / achievement.requirement) * 100, 100));
    }
    return Math.min((current / achievement.requirement) * 100, 100);
  };

  const isUnlocked = (achievementId: string) => unlockedAchievements.includes(achievementId);

  const filteredAchievements = useMemo(() => {
    if (filter === 'all') return EXTENDED_ACHIEVEMENTS;
    return EXTENDED_ACHIEVEMENTS.filter(a => a.category === filter);
  }, [filter]);

  const unlockedCount = EXTENDED_ACHIEVEMENTS.filter(a => isUnlocked(a.id)).length;
  const progressPercent = (unlockedCount / EXTENDED_ACHIEVEMENTS.length) * 100;

  const categories: { id: CategoryFilter; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Trophy className="w-4 h-4" /> },
    { id: 'Streak', label: 'Streak', icon: <Flame className="w-4 h-4" /> },
    { id: 'Progress', label: 'Progress', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'Performance', label: 'Score', icon: <Target className="w-4 h-4" /> },
    { id: 'Career', label: 'Career', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'Speed', label: 'Speed', icon: <SpeedIcon className="w-4 h-4" /> },
    { id: 'Social', label: 'Social', icon: <Users className="w-4 h-4" /> },
    { id: 'Mastery', label: 'Mastery', icon: <Star className="w-4 h-4" /> },
  ];

  return (
    <>
      <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
        <CardHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-black">Achievements</CardTitle>
                <p className="text-xs text-muted-foreground font-medium">{unlockedCount} / {EXTENDED_ACHIEVEMENTS.length} unlocked</p>
              </div>
            </div>
            <Badge variant="outline" className={cn("font-black text-xs", getRarityColor('rare'))}>
              {progressPercent.toFixed(0)}%
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 pt-2 space-y-4">
          <Progress value={progressPercent} className="h-2 rounded-full" />
          
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                  filter === cat.id 
                    ? "bg-primary text-primary-foreground shadow-lg" 
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Achievement Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-2">
            {filteredAchievements.slice(0, 24).map((achievement) => {
              const unlocked = isUnlocked(achievement.id);
              const progress = getProgress(achievement);
              
              return (
                <motion.div 
                  key={achievement.id}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "relative p-3 rounded-2xl border-2 transition-all cursor-pointer",
                    unlocked 
                      ? getRarityColor(achievement.rarity) 
                      : "bg-muted/30 border-border/50 opacity-60",
                    achievement.isLimited && !unlocked && "border-dashed"
                  )}
                >
                  {/* Limited edition badge */}
                  {achievement.isLimited && (
                    <div className="absolute -top-1 -right-1">
                      <Badge className="h-4 w-4 p-0 flex items-center justify-center bg-red-500 text-white text-[8px]">
                        <Star className="w-2 h-2 fill-current" />
                      </Badge>
                    </div>
                  )}
                  
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center mb-2",
                    unlocked ? "bg-current/10" : "bg-muted"
                  )}>
                    {unlocked ? (
                      <div className={unlocked ? "text-current" : "text-muted-foreground"}>{achievement.icon}</div>
                    ) : (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <p className="text-xs font-bold truncate">{achievement.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{achievement.description}</p>
                  
                  {!unlocked && (
                    <div className="mt-2">
                      <Progress value={progress} className="h-1 rounded-full" />
                      <p className="text-[9px] text-muted-foreground mt-1">
                        {achievement.type === 'speed' 
                          ? `${Math.round(achievement.requirement - (userStats.avgTimePerQuestion || 0))}s faster needed`
                          : `${progress.toFixed(0)}%`
                        }
                      </p>
                    </div>
                  )}
                  
                  {unlocked && (
                    <div className="absolute -top-1 -right-1">
                      <CheckCircle2 className="w-5 h-5 text-green-500 bg-white rounded-full" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* View All Button */}
          {filteredAchievements.length > 24 && (
            <Button variant="outline" className="w-full mt-2 gap-2">
              View All {filteredAchievements.length} Achievements
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Celebration Effect */}
      {showCelebration && (
        <CelebrationEffect
          show={celebration.show}
          type="confetti"
          intensity={50}
          onComplete={clearCelebration}
        />
      )}
    </>
  );
}

export default EnhancedAchievementSystem;

