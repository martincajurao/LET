'use client';

import React from 'react';
import { DailyTaskDashboard } from '@/components/ui/daily-task-dashboard';
import { DailyLoginRewards } from '@/components/ui/daily-login-rewards';
import { QuestionOfTheDay } from '@/components/ui/question-of-the-day';
import { StudyTimer } from '@/components/ui/study-timer';
import { Target, ArrowLeft, ShieldCheck, Brain, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { INITIAL_QUESTIONS } from '@/app/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TasksPage() {
  const { user, loading, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleClaimLoginReward = async (day: number, xp: number, credits: number) => {
    if (!user || !firestore) return;
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      const updateData: any = { 
        xp: increment(xp),
        credits: increment(credits),
        lastLoginRewardClaimedAt: Date.now(),
        lastActiveDate: serverTimestamp(),
        streakCount: increment(1)
      };

      await updateDoc(userRef, updateData);
      await refreshUser();
      
      toast({ 
        variant: "reward", 
        title: "Vault Recharged!", 
        description: `Day ${day} check-in verified. +${xp} XP and +${credits} Credits added.` 
      });
    } catch (e) {
      console.error('Failed to claim login reward:', e);
      toast({ variant: "destructive", title: "Sync Failed", description: "Could not record professional trace." });
      throw e;
    }
  };

  const handleQuestionComplete = async (isCorrect: boolean, xpEarned: number) => {
    if (!user || !firestore) return;
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      const updateData: any = { 
        lastQotdClaimedAt: Date.now(),
        lastActiveDate: serverTimestamp()
      };

      if (isCorrect) {
        updateData.xp = increment(xpEarned);
        updateData.dailyQuestionsAnswered = increment(1);
        toast({ variant: "reward", title: "Strategic Accuracy!", description: `+${xpEarned} XP earned!` });
      } else {
        toast({ title: "Trace Recorded", description: "Pedagogical insight unlocked. Return tomorrow for calibration." });
      }

      await updateDoc(userRef, updateData);
      await refreshUser();
    } catch (e) {
      console.error('Failed to update question completion:', e);
      toast({ variant: "destructive", title: "Sync Failed", description: "Could not record professional trace." });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Mission Hub...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="p-10 text-center max-w-sm rounded-[2.5rem] android-surface border-none shadow-2xl">
          <ShieldCheck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="font-black text-xl mb-6">Authentication Required</h3>
          <Link href="/"><Button className="w-full rounded-2xl h-14 font-black">Return Home</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-32 pt-safe">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 font-black text-muted-foreground uppercase tracking-widest text-[10px] hover:text-primary active:scale-95 transition-all">
              <ArrowLeft className="w-4 h-4" /> Exit to Hub
            </Button>
          </Link>
          <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border-2 border-emerald-500/20 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-black uppercase text-emerald-700 tracking-[0.2em]">Active Session</span>
          </div>
        </div>

        <div className="space-y-2 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-inner">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground">Mission Hub</h1>
          </div>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60 ml-1">Academic Pacing & Professional Engagement</p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
          >
            <DailyLoginRewards 
              currentDay={Math.min(((user?.streakCount || 0) % 7) + 1, 7)}
              lastClaimDate={user.lastLoginRewardClaimedAt}
              onClaim={handleClaimLoginReward} 
            />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-8">
              {INITIAL_QUESTIONS.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <QuestionOfTheDay 
                    question={INITIAL_QUESTIONS[Math.floor(Date.now() / 86400000) % INITIAL_QUESTIONS.length]}
                    lastClaimDate={user.lastQotdClaimedAt}
                    onComplete={handleQuestionComplete}
                  />
                </motion.div>
              )}

              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <StudyTimer />
              </motion.div>
            </div>

            <div className="lg:col-span-5 space-y-8">
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <DailyTaskDashboard />
              </motion.div>

              <Card className="android-surface border-none shadow-md3-1 rounded-[2rem] bg-foreground text-background p-8 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                  <Brain className="w-24 h-24" />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-4 h-4 fill-current animate-sparkle" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Strategic Advice</span>
                  </div>
                  <h3 className="text-xl font-black leading-tight">Consistency scales professional accuracy.</h3>
                  <p className="text-xs font-medium opacity-70 leading-relaxed">
                    Complete your daily missions early to maximize rank multipliers and accelerate your path to Distinguished Scholar status.
                  </p>
                  <div className="pt-2">
                    <div className="h-[1px] w-full bg-background/20 mb-4" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary">Board Readiness: 82%</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
