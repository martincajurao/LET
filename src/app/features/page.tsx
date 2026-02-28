'use client';

import React from 'react';
import { useUser, useFirestore } from "@/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudyTimer } from "@/components/ui/study-timer";
import { AchievementSystem } from "@/components/ui/achievement-system";
import { DailyLoginRewards } from "@/components/ui/daily-login-rewards";
import { QuestionOfTheDay } from "@/components/ui/question-of-the-day";
import { Question, MAJORSHIPS, INITIAL_QUESTIONS } from "@/app/lib/mock-data";
import { getRankData } from "@/lib/xp-system";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";
import { 
  Trophy, 
  Star, 
  Flame, 
  Target, 
  Zap,
  Award,
  Lightbulb,
  Timer,
  Gift,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function FeaturesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const rankData = useMemo(() => user ? getRankData(user.xp || 0) : null, [user?.xp]);
  
  // Get a random question for QOTD
  const dailyQuestion = INITIAL_QUESTIONS[Math.floor(Math.random() * INITIAL_QUESTIONS.length)];

  const handleQotdComplete = async (isCorrect: boolean, xpEarned: number) => {
    if (user && firestore && isCorrect) {
      await updateDoc(doc(firestore, 'users', user.uid), { 
        xp: increment(xpEarned),
        dailyQuestionsAnswered: increment(1)
      });
      toast({ title: "Great job!", description: `+${xpEarned} XP earned!` });
    }
  };

  const handlePomodoroComplete = async (sessions: number, xpEarned: number) => {
    if (user && firestore) {
      await updateDoc(doc(firestore, 'users', user.uid), { xp: increment(xpEarned) });
      toast({ title: "Focus session complete!", description: `+${xpEarned} XP earned!` });
    }
  };

  const handleDailyClaim = async (day: number, xp: number, credits: number) => {
    if (user && firestore) {
      await updateDoc(doc(firestore, 'users', user.uid), { 
        xp: increment(xp)
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black">Study Features</h1>
            <p className="text-sm text-muted-foreground">Boost your learning with gamification</p>
          </div>
        </div>

        {/* Daily Login Rewards */}
        <section>
          <h2 className="text-lg font-black flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-pink-500" />
            Daily Rewards
          </h2>
          <DailyLoginRewards 
            currentDay={Math.min(((user?.streakCount || 0) % 7) + 1, 7)}
            lastClaimDate={undefined}
            onClaim={handleDailyClaim}
          />
        </section>

        {/* Question of the Day */}
        <section>
          <h2 className="text-lg font-black flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Question of the Day
          </h2>
          {dailyQuestion && (
            <QuestionOfTheDay 
              question={dailyQuestion}
              onComplete={handleQotdComplete}
            />
          )}
        </section>

        {/* Study Timer */}
        <section>
          <h2 className="text-lg font-black flex items-center gap-2 mb-3">
            <Timer className="w-5 h-5 text-primary" />
            Focus Timer
          </h2>
          <StudyTimer onComplete={handlePomodoroComplete} />
        </section>

        {/* Achievements */}
        <section>
          <h2 className="text-lg font-black flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-yellow-500" />
            Achievements
          </h2>
          <AchievementSystem 
            userStats={{
              streakCount: user?.streakCount || 0,
              totalQuestionsAnswered: user?.dailyQuestionsAnswered || 0,
              highestScore: 0,
              rank: rankData?.rank || 1,
              dailyQuestionsCompleted: 0
            }}
            unlockedAchievements={[]}
          />
        </section>

        {/* Stats Summary */}
        {user && (
          <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-xl font-black">Your Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-xs text-muted-foreground font-bold">Streak</span>
                  </div>
                  <p className="text-2xl font-black">{user.streakCount || 0} days</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-muted-foreground font-bold">Total XP</span>
                  </div>
                  <p className="text-2xl font-black">{user.xp || 0}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground font-bold">Rank</span>
                  </div>
                  <p className="text-2xl font-black">{rankData?.title || 'Novice'}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-muted-foreground font-bold">Questions</span>
                  </div>
                  <p className="text-2xl font-black">{user.dailyQuestionsAnswered || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
