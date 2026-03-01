'use client';

import React from 'react';
import { DailyTaskDashboard } from '@/components/ui/daily-task-dashboard';
import { DailyLoginRewards } from '@/components/ui/daily-login-rewards';
import { QuestionOfTheDay } from '@/components/ui/question-of-the-day';
import { StudyTimer } from '@/components/ui/study-timer';
import { Target, ArrowLeft, Timer, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { INITIAL_QUESTIONS } from '@/app/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TasksPage() {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleClaimLoginReward = async (day: number, xp: number, credits: number) => {
    if (!user || !firestore) return;
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      
      // Calculate next streak
      // If Day 7 was just claimed, we restart the cycle but keep the overall XP/Growth
      const updateData: any = { 
        xp: increment(xp),
        credits: increment(credits),
        lastLoginRewardClaimedAt: Date.now(),
        lastActiveDate: serverTimestamp(),
        // Increment streakCount to advance the 7-day calendar progress
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground hover:text-primary active:scale-95 transition-all">
              <ArrowLeft className="w-4 h-4" /> Back to Hub
            </Button>
          </Link>
          <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Active Session</span>
          </div>
        </div>

        <div className="space-y-2 px-2">
          <h1 className="text-4xl font-black tracking-tight text-foreground">Mission Hub</h1>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest opacity-60">Academic Pacing & Professional Engagement</p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Daily Login Rewards - Premium Refactor */}
          {user && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 }}
            >
              <DailyLoginRewards 
                currentDay={Math.min(((user?.streakCount || 0) % 7) + 1, 7)}
                lastClaimDate={user.lastLoginRewardClaimedAt}
                onClaim={handleClaimLoginReward} 
              />
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              {/* Question of the Day */}
              {user && INITIAL_QUESTIONS.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: 0.2 }}
                >
                  <QuestionOfTheDay 
                    question={INITIAL_QUESTIONS[Math.floor(Date.now() / 86400000) % INITIAL_QUESTIONS.length]}
                    lastClaimDate={user.lastQotdClaimedAt}
                    onComplete={handleQuestionComplete}
                  />
                </motion.div>
              )}

              {/* Focus Timer */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.3 }}
              >
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden">
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-black flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
                        <Timer className="w-6 h-6 text-primary" />
                      </div>
                      Focus Session
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 pt-0">
                    <StudyTimer />
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <div className="space-y-8">
              {/* Daily Tasks */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.4 }}
              >
                <DailyTaskDashboard />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
