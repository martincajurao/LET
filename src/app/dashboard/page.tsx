'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  GraduationCap, 
  Zap,
  Trophy,
  Flame,
  Star,
  BookOpen,
  Moon,
  Sun,
  Crown,
  Sparkles,
  Lock,
  Award,
  MapPin,
  CheckCircle2,
  ListTodo,
  ChevronRight
} from "lucide-react";
import { AchievementSystem } from '@/components/ui/achievement-system';
import { ReferralSystem } from '@/components/ui/referral-system';
import { useUser } from "@/firebase";
import { Toaster } from "@/components/ui/toaster";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { getRankData, CAREER_TIERS } from '@/lib/xp-system';

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const { isDark, toggleDarkMode } = useTheme();

  const rankData = useMemo(() => user ? getRankData(user.xp || 0) : null, [user?.xp]);

  return (
    <div className="min-h-screen bg-background font-body">
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-24 space-y-8">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between px-2">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Command Center</h1>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">Career Progression & Elite Status</p>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="rounded-2xl h-12 w-12 bg-card shadow-sm border active:scale-90 transition-all">
            {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-primary" />}
          </Button>
        </div>

        {/* Quick Stats Grid */}
        {user && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="android-surface border-none shadow-md rounded-[2rem] bg-card p-5 text-center transition-all hover:shadow-xl group active:scale-[0.98]">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner group-hover:rotate-12 transition-transform">
                <Flame className="w-6 h-6 text-orange-500 fill-current" />
              </div>
              <p className="text-3xl font-black tracking-tight">{user.streakCount || 0}</p>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">Study Streak</p>
            </Card>
            <Card className="android-surface border-none shadow-md rounded-[2rem] bg-card p-5 text-center transition-all hover:shadow-xl group active:scale-[0.98]">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner group-hover:rotate-12 transition-transform">
                <Sparkles className="w-6 h-6 text-yellow-600 fill-current animate-sparkle" />
              </div>
              <p className="text-3xl font-black tracking-tight">{user.credits || 0}</p>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">AI Credits</p>
            </Card>
            <Card className="android-surface border-none shadow-md rounded-[2rem] bg-card p-5 text-center transition-all hover:shadow-xl group active:scale-[0.98]">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner group-hover:rotate-12 transition-transform">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <p className="text-2xl font-black tracking-tight truncate px-1">{rankData?.title || 'Candidate'}</p>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">Rank {rankData?.rank}</p>
            </Card>
            <Card className="android-surface border-none shadow-md rounded-[2rem] bg-card p-5 text-center transition-all hover:shadow-xl group active:scale-[0.98]">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner group-hover:rotate-12 transition-transform">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-3xl font-black tracking-tight">{user.dailyQuestionsAnswered || 0}</p>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">Items Answered</p>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Progression Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Career Roadmap */}
            <Card className="border-none shadow-xl rounded-[3rem] bg-card overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-[1.25rem] flex items-center justify-center shadow-inner"><MapPin className="w-6 h-6 text-primary" /></div>
                    <div>
                      <CardTitle className="text-2xl font-black tracking-tight">Career Roadmap</CardTitle>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">Academic Ascension Trace</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest border-primary/20 text-primary py-1 px-4">Milestones</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <div className="relative space-y-8 before:absolute before:left-[23px] before:top-4 before:bottom-4 before:w-[3px] before:bg-muted before:content-['']">
                  {CAREER_TIERS.slice(0, 6).map((tier, idx) => {
                    const currentRank = rankData?.rank || 1;
                    const isCompleted = currentRank > tier.maxRank;
                    const isActive = currentRank >= tier.minRank && currentRank <= tier.maxRank;
                    
                    return (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={cn("relative pl-16 transition-all", isCompleted && "opacity-60 grayscale-[0.3]")}
                      >
                        <div className={cn(
                          "absolute left-0 w-12 h-12 rounded-2xl border-4 flex items-center justify-center z-10 transition-all shadow-lg",
                          isActive ? "bg-primary border-primary/20 text-primary-foreground scale-110 animate-breathing-primary" : 
                          isCompleted ? "bg-emerald-500 border-emerald-200 text-white" : 
                          "bg-card border-muted text-muted-foreground"
                        )}>
                          {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : isActive ? <Award className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                        </div>
                        <div className={cn(
                          "p-6 rounded-[2.25rem] border-2 transition-all shadow-sm active:scale-[0.99]",
                          isActive ? "bg-primary/5 border-primary ring-8 ring-primary/5" : "bg-muted/10 border-transparent"
                        )}>
                          <div className="flex justify-between items-start mb-2">
                            <p className={cn("text-lg font-black uppercase tracking-tight", isActive ? "text-primary" : "text-foreground")}>{tier.title}</p>
                            <div className="flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1 rounded-xl border border-yellow-500/20">
                              <Sparkles className="w-3.5 h-3.5 text-yellow-600 fill-current animate-sparkle" />
                              <span className="text-xs font-black text-yellow-700">+{tier.reward}</span>
                            </div>
                          </div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Rank {tier.minRank} — {tier.maxRank}</p>
                          
                          {isActive && (
                            <div className="mt-5 space-y-2">
                              <div className="flex justify-between text-[9px] font-black uppercase text-primary tracking-widest">
                                <span>Ascension Progress</span>
                                <span>{Math.round(rankData?.progress || 0)}%</span>
                              </div>
                              <Progress value={rankData?.progress} className="h-2 rounded-full shadow-inner" />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <AchievementSystem 
              userStats={{
                streakCount: user?.streakCount || 0,
                totalQuestionsAnswered: user?.dailyQuestionsAnswered || 0,
                highestScore: 0,
                rank: rankData?.rank || 1,
                dailyQuestionsCompleted: user?.dailyQuestionsAnswered || 0
              }}
              unlockedAchievements={[]}
            />
          </div>

          {/* Engagement Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-foreground text-background p-8 relative overflow-hidden group active:scale-[0.98] transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-700" />
              <div className="relative z-10 space-y-6">
                <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center">
                  <ListTodo className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">Daily Missions</h3>
                  <p className="text-sm text-muted-foreground font-medium opacity-80 mt-1">Complete tasks to earn AI credits.</p>
                </div>
                <Button 
                  onClick={() => router.push('/tasks')}
                  className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                >
                  Enter Mission Center
                </Button>
              </div>
            </Card>

            <ReferralSystem />
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
