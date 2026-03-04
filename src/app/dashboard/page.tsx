'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Trophy,
  Flame,
  Moon,
  Sun,
  Sparkles,
  Lock,
  Award,
  MapPin,
  CheckCircle2,
  Sword,
  TrendingUp,
  Settings,
  ShieldCheck,
  Snowflake,
  Star,
  Zap
} from "lucide-react";
import { AchievementSystem } from '@/components/ui/achievement-system';
import { ReferralSystem } from '@/components/ui/referral-system';
import { useUser } from "@/firebase";
import { Toaster } from "@/components/ui/toaster";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { getRankData, CAREER_TIERS, FIRST_WIN_BONUS_MULTIPLIER } from '@/lib/xp-system';
import Link from 'next/link';
import { FirstWinProgressIndicator } from '@/components/ui/first-win-bonus';
import { StreakFreezeDialog, StreakFreezeButton } from '@/components/ui/streak-freeze-dialog';
import { XpBoosterDialog, XpBoosterButton } from '@/components/ui/xp-booster-dialog';
import { AiBuddyDialog, AiBuddyButton } from '@/components/ui/ai-buddy-dialog';

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const { isDark, toggleDarkMode } = useTheme();
  const [showStreakFreeze, setShowStreakFreeze] = useState(false);
  const [showXpBooster, setShowXpBooster] = useState(false);
  const [showAiBuddy, setShowAiBuddy] = useState(false);

  const rankData = useMemo(() => user ? getRankData(user.xp || 0) : null, [user?.xp]);

  // Check if First Win is available today
  const isFirstWinAvailable = useMemo(() => {
    if (!user?.lastFirstWinDate) return true;
    const now = new Date();
    const lastWin = new Date(user.lastFirstWinDate);
    return now.toDateString() !== lastWin.toDateString();
  }, [user?.lastFirstWinDate]);

  const displayStats = user ? [
    { icon: <Sparkles className="w-4 h-4 text-yellow-500 fill-current animate-sparkle" />, label: 'Vault Units', value: user.credits || 0, color: 'text-yellow-500 bg-yellow-500/10' },
    { icon: <Trophy className="w-4 h-4 text-primary" />, label: 'Arena Rank', value: rankData?.rank || 1, color: 'text-primary bg-primary/10' },
    { icon: <ShieldCheck className="w-4 h-4 text-blue-500" />, label: 'Member Tier', value: user?.isPro ? 'Platinum' : 'FREE', color: user?.isPro ? 'text-yellow-600 bg-yellow-500/10' : 'text-blue-500 bg-blue-500/10' },
    { icon: <Flame className="w-4 h-4 text-orange-500 fill-current" />, label: 'Saga Streak', value: user.streakCount || 0, color: 'text-orange-500 bg-orange-500/10' }
  ] : [];

  return (
    <div className="min-h-screen bg-background font-body">
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-24 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
          <div className="flex items-center gap-5">
            <Avatar className="w-16 h-16 border-4 border-card shadow-xl rounded-2xl">
              <AvatarImage src={user?.photoURL || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-black">🎓</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black tracking-tight leading-none">{user?.displayName || 'Teacher'}</h1>
                {user?.isPro && <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20 font-black text-[8px] px-2 py-0">PLATINUM</Badge>}
              </div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60 mt-1">{rankData?.title || 'Candidate'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12 bg-card shadow-sm border active:scale-90 transition-all">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="rounded-2xl h-12 w-12 bg-card shadow-sm border active:scale-90 transition-all">
              {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-primary" />}
            </Button>
          </div>
        </div>

        {/* First Win Bonus Indicator */}
        {user && isFirstWinAvailable && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl p-4 border-2 border-yellow-500/20"
          >
            <FirstWinProgressIndicator isCompleted={!isFirstWinAvailable} />
          </motion.div>
        )}

        {user && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {displayStats.map((stat, i) => (
              <Card key={i} className="android-surface border-none shadow-md3-1 rounded-[2rem] bg-card p-5 text-center transition-all hover:shadow-xl group active:scale-[0.98]">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner group-hover:scale-110 transition-transform", stat.color)}>
                  {stat.icon}
                </div>
                <p className="text-3xl font-black tracking-tight">{stat.value}</p>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">{stat.label}</p>
              </Card>
            ))}
          </div>
        )}

{/* Streak Freeze Button */}
        {user && (user.streakCount || 0) >= 3 && (
          <div className="flex justify-center">
            <StreakFreezeButton 
              onClick={() => setShowStreakFreeze(true)} 
              streakCount={user.streakCount || 0} 
            />
          </div>
        )}

        {/* XP Booster & AI Buddy Buttons */}
        {user && (
          <div className="flex justify-center gap-4">
            <XpBoosterButton onClick={() => setShowXpBooster(true)} />
            <AiBuddyButton onClick={() => setShowAiBuddy(true)} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <Card className="border-none shadow-xl rounded-[3rem] bg-card overflow-hidden border border-border/50">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-[1.25rem] flex items-center justify-center shadow-inner"><MapPin className="w-6 h-6 text-primary" /></div>
                    <div>
                      <CardTitle className="text-2xl font-black tracking-tight">Career Roadmap</CardTitle>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">Professional Ascension Trace</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{rankData?.multiplier}x Yield</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <div className="relative space-y-10 before:absolute before:left-[23px] before:top-4 before:bottom-4 before:w-[2px] before:bg-muted before:content-['']">
                  {CAREER_TIERS.slice(0, 10).map((tier, idx) => {
                    const currentRank = rankData?.rank || 1;
                    const isCompleted = currentRank > tier.maxRank;
                    const isActive = currentRank >= tier.minRank && currentRank <= tier.maxRank;
                    
                    return (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn("relative pl-16 transition-all", isCompleted && "opacity-50 grayscale-[0.5]")}
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
                          isActive ? "bg-primary/5 border-primary ring-8 ring-primary/5" : "bg-muted/5 border-transparent"
                        )}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="space-y-1">
                              <p className={cn("text-lg font-black uppercase tracking-tight", isActive ? "text-primary" : "text-foreground")}>{tier.title}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Rank {tier.minRank} — {tier.maxRank}</p>
                                <div className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                                <Badge className="bg-primary/10 text-primary text-[8px] font-black border-none px-2">{tier.multiplier}x Buff</Badge>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1 rounded-xl border border-yellow-500/20">
                                <Sparkles className="w-3.5 h-3.5 text-yellow-600 fill-current animate-sparkle" />
                                <span className="text-xs font-black text-yellow-700">+{tier.reward}</span>
                              </div>
                              <p className="text-[7px] font-black uppercase text-muted-foreground opacity-40">Promotion Loot</p>
                            </div>
                          </div>
                          
                          {isActive && (
                            <div className="mt-5 space-y-2">
                              <div className="flex justify-between text-[9px] font-black uppercase text-primary tracking-widest">
                                <span>Ascension Progress</span>
                                <span>{Math.round(rankData?.progress || 0)}%</span>
                              </div>
                              <Progress value={rankData?.progress} className="h-1.5 rounded-full shadow-inner" />
                              <p className="text-[8px] text-muted-foreground italic font-medium text-center pt-1">Reach next rank to unlock professional rewards.</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

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

          <div className="lg:col-span-4 space-y-8">
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-foreground text-background p-8 relative overflow-hidden group active:scale-[0.98] transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-700" />
              <div className="relative z-10 space-y-6">
                <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center">
                  <Sword className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-white">Active Saga</h3>
                  <p className="text-sm text-muted-foreground font-medium opacity-80 mt-1">Complete professional quests to scale your rewards.</p>
                </div>
                <Button 
                  onClick={() => router.push('/tasks')}
                  className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                >
                  Enter Mission Log
                </Button>
              </div>
            </Card>

            <ReferralSystem />
          </div>
        </div>
      </div>
      
{/* Streak Freeze Dialog */}
      <StreakFreezeDialog 
        isOpen={showStreakFreeze} 
        onClose={() => setShowStreakFreeze(false)} 
      />
      
      {/* XP Booster Dialog */}
      <XpBoosterDialog 
        isOpen={showXpBooster} 
        onClose={() => setShowXpBooster(false)} 
      />
      
      {/* AI Buddy Dialog */}
      <AiBuddyDialog 
        isOpen={showAiBuddy} 
        onClose={() => setShowAiBuddy(false)} 
      />
      
      <Toaster />
    </div>
  );
}

