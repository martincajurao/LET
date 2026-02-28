'use client';

import React, { useMemo } from 'react';
import { DailyTaskDashboard } from '@/components/ui/daily-task-dashboard';
import { DailyLoginRewards } from '@/components/ui/daily-login-rewards';
import { QuestionOfTheDay } from '@/components/ui/question-of-the-day';
import { StudyTimer } from '@/components/ui/study-timer';
import { ShieldCheck, Target, ArrowLeft, Zap, Timer, Gift, Lightbulb } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { Question, INITIAL_QUESTIONS } from '@/app/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function TasksPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const rankData = useMemo(() => user ? { title: 'Novice', rank: 1 } : null, [user]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground hover:text-primary">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Button>
          </Link>
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Daily Mission</h1>
          <p className="text-muted-foreground font-medium">Complete academic tasks to earn AI pedagogical credits.</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Daily Login Rewards */}
          {user && (
            <DailyLoginRewards 
              currentDay={Math.min(((user?.streakCount || 0) % 7) + 1, 7)}
              onClaim={async (day: number, xp: number, credits: number) => {
                if (firestore) {
                  await updateDoc(doc(firestore, 'users', user.uid), { 
                    xp: increment(xp),
                    credits: increment(credits)
                  });
                  toast({ title: "Reward Claimed!", description: `+${xp} XP and +${credits} Credits!` });
                }
              }} 
            />
          )}

          {/* Question of the Day */}
          {user && INITIAL_QUESTIONS.length > 0 && (
            <QuestionOfTheDay 
              question={INITIAL_QUESTIONS[Math.floor(Math.random() * INITIAL_QUESTIONS.length)]}
              onComplete={async (isCorrect: boolean, xpEarned: number) => {
                if (isCorrect && firestore) {
                  await updateDoc(doc(firestore, 'users', user.uid), { 
                    xp: increment(xpEarned),
                    dailyQuestionsAnswered: increment(1)
                  });
                  toast({ title: "Great job!", description: `+${xpEarned} XP earned!` });
                }
              }}
            />
          )}

          {/* Focus Timer */}
          <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <Timer className="w-6 h-6 text-primary" />
                Focus Timer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <StudyTimer />
            </CardContent>
          </Card>

          {/* Daily Tasks */}
          <DailyTaskDashboard />
        </div>
      </div>
    </div>
  );
}
