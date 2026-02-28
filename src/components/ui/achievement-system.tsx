'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Crown,
  Medal,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { XP_REWARDS } from "@/lib/xp-system";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  requirement: number;
  type: 'streak' | 'questions' | 'score' | 'rank' | 'subject' | 'time' | 'daily';
  xpReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'streak_3', name: 'Getting Started', description: 'Maintain a 3-day study streak', icon: <Flame className="w-6 h-6" />, requirement: 3, type: 'streak', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'common', category: 'Streak' },
  { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day study streak', icon: <Flame className="w-6 h-6 text-orange-500" />, requirement: 7, type: 'streak', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Streak' },
  { id: 'streak_30', name: 'Monthly Master', description: 'Maintain a 30-day study streak', icon: <Flame className="w-6 h-6 text-red-500" />, requirement: 30, type: 'streak', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'epic', category: 'Streak' },
  { id: 'streak_100', name: 'Century Scholar', description: 'Maintain a 100-day study streak', icon: <Crown className="w-6 h-6 text-yellow-500" />, requirement: 100, type: 'streak', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 2, rarity: 'legendary', category: 'Streak' },
  { id: 'questions_50', name: 'Question Collector', description: 'Answer 50 questions', icon: <BookOpen className="w-6 h-6 text-blue-500" />, requirement: 50, type: 'questions', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'common', category: 'Progress' },
  { id: 'questions_200', name: 'Quiz Enthusiast', description: 'Answer 200 questions', icon: <BookOpen className="w-6 h-6 text-purple-500" />, requirement: 200, type: 'questions', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Progress' },
  { id: 'questions_500', name: 'Knowledge Seeker', description: 'Answer 500 questions', icon: <GraduationCap className="w-6 h-6 text-emerald-500" />, requirement: 500, type: 'questions', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'epic', category: 'Progress' },
  { id: 'score_80', name: 'High Achiever', description: 'Get 80% or higher in any exam', icon: <Target className="w-6 h-6 text-green-500" />, requirement: 80, type: 'score', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'common', category: 'Performance' },
  { id: 'score_90', name: 'Excellence', description: 'Get 90% or higher in any exam', icon: <Star className="w-6 h-6 text-yellow-500" />, requirement: 90, type: 'score', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Performance' },
  { id: 'score_100', name: 'Perfect Score', description: 'Get 100% in any exam', icon: <Trophy className="w-6 h-6 text-amber-500" />, requirement: 100, type: 'score', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK * 3, rarity: 'legendary', category: 'Performance' },
  { id: 'rank_10', name: 'Rising Star', description: 'Reach rank 10', icon: <TrendingUp className="w-6 h-6 text-blue-500" />, requirement: 10, type: 'rank', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'common', category: 'Career' },
  { id: 'rank_25', name: 'Seasoned Educator', description: 'Reach rank 25', icon: <Medal className="w-6 h-6 text-purple-500" />, requirement: 25, type: 'rank', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Career' },
  { id: 'rank_50', name: 'Distinguished Leader', description: 'Reach rank 50', icon: <Shield className="w-6 h-6 text-emerald-500" />, requirement: 50, type: 'rank', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'epic', category: 'Career' },
  { id: 'daily_first', name: 'Early Bird', description: 'Complete your first daily question', icon: <Clock className="w-6 h-6 text-amber-500" />, requirement: 1, type: 'daily', xpReward: XP_REWARDS.QUESTION_OF_THE_DAY, rarity: 'common', category: 'Daily' },
  { id: 'daily_7', name: 'Daily Devotee', description: 'Complete 7 daily questions', icon: <Calendar className="w-6 h-6 text-green-500" />, requirement: 7, type: 'daily', xpReward: XP_REWARDS.ACHIEVEMENT_UNLOCK, rarity: 'rare', category: 'Daily' },
];

interface AchievementSystemProps {
  userStats: { streakCount: number; totalQuestionsAnswered: number; highestScore: number; rank: number; dailyQuestionsCompleted: number; };
  unlockedAchievements: string[];
  onAchievementUnlock?: (achievement: Achievement) => void;
}

export function AchievementSystem({ userStats, unlockedAchievements, onAchievementUnlock }: AchievementSystemProps) {
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
      case 'score': current = userStats.highestScore; break;
      case 'rank': current = userStats.rank; break;
      case 'daily': current = userStats.dailyQuestionsCompleted; break;
    }
    return Math.min((current / achievement.requirement) * 100, 100);
  };

  const isUnlocked = (achievementId: string) => unlockedAchievements.includes(achievementId);
  const unlockedCount = ACHIEVEMENTS.filter(a => isUnlocked(a.id)).length;
  const progressPercent = (unlockedCount / ACHIEVEMENTS.length) * 100;

  return (
    <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg"><Award className="w-6 h-6 text-white" /></div>
            <div><CardTitle className="text-xl font-black">Achievements</CardTitle><p className="text-xs text-muted-foreground font-medium">{unlockedCount} / {ACHIEVEMENTS.length} unlocked</p></div>
          </div>
          <Badge variant="outline" className={cn("font-black text-xs", getRarityColor('rare'))}>{progressPercent.toFixed(0)}%</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2 space-y-4">
        <Progress value={progressPercent} className="h-2 rounded-full" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {ACHIEVEMENTS.slice(0, 8).map((achievement) => {
            const unlocked = isUnlocked(achievement.id);
            const progress = getProgress(achievement);
            return (
              <div key={achievement.id} className={cn("relative p-3 rounded-2xl border-2 transition-all cursor-pointer hover:scale-105", unlocked ? getRarityColor(achievement.rarity) : "bg-muted/30 border-border/50 opacity-60")}>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2", unlocked ? "bg-current/10" : "bg-muted")}>
                  {unlocked ? <div className={unlocked ? "text-current" : "text-muted-foreground"}>{achievement.icon}</div> : <Lock className="w-5 h-5 text-muted-foreground" />}
                </div>
                <p className="text-xs font-bold truncate">{achievement.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{achievement.description}</p>
                {!unlocked && <div className="mt-2"><Progress value={progress} className="h-1 rounded-full" /><p className="text-[9px] text-muted-foreground mt-1">{progress.toFixed(0)}%</p></div>}
                {unlocked && <div className="absolute -top-1 -right-1"><CheckCircle2 className="w-5 h-5 text-green-500 bg-white rounded-full" /></div>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default AchievementSystem;
