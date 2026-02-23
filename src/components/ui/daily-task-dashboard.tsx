'use client';

import React, { useState } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Coins, Zap, Trophy, Flame, Loader2 } from "lucide-react";
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

interface Task {
  id: string;
  title: string;
  reward: number;
  goal: number;
  current: number;
  isClaimed: boolean;
  icon: React.ReactNode;
}

export function DailyTaskDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [claiming, setClaiming] = useState(false);

  const tasks: Task[] = [
    { 
      id: 'questions', 
      title: 'Practice 20 Questions', 
      reward: 5, 
      goal: 20, 
      current: user?.dailyQuestionsAnswered || 0,
      isClaimed: !!user?.taskQuestionsClaimed,
      icon: <Zap className="w-4 h-4 text-primary" />
    },
    { 
      id: 'mock', 
      title: 'Finish 1 Mock Test', 
      reward: 10, 
      goal: 1, 
      current: user?.dailyTestsFinished || 0,
      isClaimed: !!user?.taskMockClaimed,
      icon: <Trophy className="w-4 h-4 text-yellow-500" />
    }
  ];

  const canClaimAny = tasks.some(t => t.current >= t.goal && !t.isClaimed);

  const handleClaimReward = async () => {
    if (!user || !firestore || claiming) return;
    setClaiming(true);

    try {
      const response = await fetch('/api/daily-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      
      const result = await response.json();
      
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Claim Process",
          description: result.error,
        });
      } else if (result.reward > 0) {
        // Perform the mutation on the client side to ensure firestore instance is valid
        const userRef = doc(firestore, 'users', user.uid);
        const updates: any = {
          credits: increment(result.reward),
          lastActiveDate: serverTimestamp()
        };

        // Track which tasks were claimed based on the calculation done on server
        if (user.dailyQuestionsAnswered >= 20 && !user.taskQuestionsClaimed) {
          updates.taskQuestionsClaimed = true;
        }
        if (user.dailyTestsFinished >= 1 && !user.taskMockClaimed) {
          updates.taskMockClaimed = true;
        }

        await updateDoc(userRef, updates);

        toast({
          title: "Rewards Claimed!",
          description: `Excellent work! You earned ${result.reward} AI Credits.`,
        });
      } else {
        toast({
          title: "Missions Update",
          description: "No new rewards available to claim yet. Finish your tracks to earn more!",
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Could not connect to the rewards server.",
      });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/50 p-8 border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" /> Daily Missions
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">Achieve daily milestones for rewards</CardDescription>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border shadow-sm">
             <Flame className="w-4 h-4 text-orange-500 fill-current" />
             <span className="text-sm font-black">{user?.streakCount || 0} Day Streak</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => {
            const isComplete = task.current >= task.goal;
            const progress = Math.min((task.current / task.goal) * 100, 100);

            return (
              <div key={task.id} className={cn(
                "p-6 rounded-3xl border-2 transition-all flex flex-col gap-4",
                task.isClaimed ? "bg-slate-50 opacity-60 border-slate-200" : (isComplete ? "bg-emerald-50/30 border-emerald-100" : "bg-white border-slate-100")
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm border flex items-center justify-center">
                      {task.icon}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-black text-slate-800">{task.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reward: +{task.reward} Credits</p>
                    </div>
                  </div>
                  {task.isClaimed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Circle className={cn("w-6 h-6", isComplete ? "text-emerald-500 animate-pulse" : "text-slate-200")} />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>{task.isClaimed ? 'Mission Complete' : 'Progress'}</span>
                    <span>{task.current} / {task.goal}</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 flex flex-col items-center gap-4">
          <Button 
            onClick={handleClaimReward} 
            disabled={!user || claiming} 
            variant={canClaimAny ? 'default' : 'outline'}
            className={cn(
              "w-full md:w-auto px-12 h-14 rounded-2xl font-black text-lg gap-2 shadow-xl",
              canClaimAny ? "shadow-primary/20 bg-primary" : "text-slate-400"
            )}
          >
            {claiming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (canClaimAny ? 'Claim Pending Rewards' : 'Check for Rewards')}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div className="text-center p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">3-Day Milestone</p>
            <p className="text-sm font-black text-primary">+15 Credits</p>
          </div>
          <div className="text-center p-4 border-l">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">7-Day Master</p>
            <p className="text-sm font-black text-primary">+30 Credits</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
