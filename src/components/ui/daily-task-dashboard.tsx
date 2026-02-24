'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Coins, Zap, Trophy, Flame, Loader2, BookOpen, Target, Clock, Star, Gift, TrendingUp, RefreshCw } from "lucide-react";
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp, getDoc } from 'firebase/firestore';

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  goal: number;
  current: number;
  isClaimed: boolean;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export function DailyTaskDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [claiming, setClaiming] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState(0);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);

  // Generate device fingerprint for abuse prevention
  useEffect(() => {
    const generateFingerprint = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
      }
      
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
      ].join('|');
      
      setDeviceFingerprint(btoa(fingerprint).substring(0, 16));
    };
    
    generateFingerprint();
  }, []);

  // Track session metrics for quality assessment
  useEffect(() => {
    const handleQuestionAnswered = () => {
      const now = Date.now();
      const timeSinceStart = (now - sessionStartTime) / 1000;
      setQuestionTimes(prev => [...prev, timeSinceStart]);
      setTotalQuestionsAnswered(prev => prev + 1);
      setSessionStartTime(now);
    };

    // Listen for custom event from ExamInterface
    window.addEventListener('questionAnswered', handleQuestionAnswered);
    
    return () => {
      window.removeEventListener('questionAnswered', handleQuestionAnswered);
    };
  }, [sessionStartTime]);

  // Check and reset daily tasks every hour
  useEffect(() => {
    const checkAndResetTasks = async () => {
      if (!user || !firestore) return;

      try {
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) return;
        
        const userData = userDoc.data();
        const lastReset = userData?.lastTaskReset?.toDate ? userData.lastTaskReset.toDate() : null;
        
        if (lastReset) {
          // Check if 24 hours have passed since last reset
          const now = new Date();
          const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceReset >= 24) {
            // Auto-reset daily tasks
            await updateDoc(userRef, {
              dailyQuestionsAnswered: 0,
              dailyTestsFinished: 0,
              mistakesReviewed: 0,
              taskQuestionsClaimed: false,
              taskMockClaimed: false,
              taskMistakesClaimed: false,
              lastTaskReset: serverTimestamp()
            });
            
            toast({
              title: "🔄 Daily Tasks Reset!",
              description: "Your daily tasks have been refreshed. Start practicing!",
            });
          }
        }
      } catch (error) {
        console.error('Error checking daily task reset:', error);
      }
    };

    // Check on mount
    checkAndResetTasks();
  }, [user, firestore]);

  // Update time until reset countdown
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      
      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeUntilReset(`${hours}h ${minutes}m`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const tasks: Task[] = [
    { 
      id: 'questions', 
      title: 'Answer Questions', 
      description: 'Complete practice questions to sharpen your skills',
      reward: 5, 
      goal: 20, 
      current: user?.dailyQuestionsAnswered || 0,
      isClaimed: !!user?.taskQuestionsClaimed,
      icon: <Target className="w-5 h-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      id: 'mock', 
      title: 'Mock Exam', 
      description: 'Take a full simulation test to gauge your readiness',
      reward: 10, 
      goal: 1, 
      current: user?.dailyTestsFinished || 0,
      isClaimed: !!user?.taskMockClaimed,
      icon: <Trophy className="w-5 h-5" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    { 
      id: 'mistakes', 
      title: 'Review Mistakes', 
      description: 'Learn from your wrong answers to improve',
      reward: 5, 
      goal: 10, 
      current: user?.mistakesReviewed || 0,
      isClaimed: !!user?.taskMistakesClaimed,
      icon: <BookOpen className="w-5 h-5" />,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50'
    }
  ];

  // Calculate total progress
  const totalProgress = tasks.reduce((acc, task) => acc + Math.min((task.current / task.goal) * 100, 100), 0) / tasks.length;

  const canClaimAny = tasks.some(t => t.current >= t.goal && !t.isClaimed);

  // Calculate user tier based on activity
  const calculateUserTier = () => {
    const totalActivity = (user?.dailyQuestionsAnswered || 0) + 
                         ((user?.dailyTestsFinished || 0) * 20) + 
                         (user?.mistakesReviewed || 0);
    
    if (totalActivity >= 100) return 'Platinum';
    if (totalActivity >= 70) return 'Gold';
    if (totalActivity >= 40) return 'Silver';
    return 'Bronze';
  };

  const userTier = calculateUserTier();
  
  // Dynamic task goals based on tier
  const tierGoals = {
    'Bronze': { questions: 20, tests: 1, mistakes: 10 },
    'Silver': { questions: 25, tests: 1, mistakes: 12 },
    'Gold': { questions: 30, tests: 2, mistakes: 15 },
    'Platinum': { questions: 35, tests: 2, mistakes: 18 }
  };

  const currentTierGoals = tierGoals[userTier as keyof typeof tierGoals] || tierGoals.Bronze;

  // Update tasks with tier-based goals
  const updatedTasks = tasks.map(task => {
    if (task.id === 'questions') return { ...task, goal: currentTierGoals.questions };
    if (task.id === 'mock') return { ...task, goal: currentTierGoals.tests };
    if (task.id === 'mistakes') return { ...task, goal: currentTierGoals.mistakes };
    return task;
  });

  // Calculate session metrics
  const averageQuestionTime = questionTimes.length > 0 
    ? questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length 
    : 0;

  const totalSessionTime = (Date.now() - sessionStartTime + (user?.lastActiveDate ? Date.now() - new Date(user.lastActiveDate?.toDate?.() || user.lastActiveDate).getTime() : 0)) / 1000;

  // Calculate total earned today
  const totalEarnedToday = updatedTasks.filter(t => t.current >= t.goal && !t.isClaimed).reduce((acc, task) => acc + task.reward, 0);

  const handleClaimReward = async () => {
    if (!user || !firestore || claiming) return;
    setClaiming(true);

    try {
        const response = await fetch('/api/daily-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: user.uid,
            dailyQuestionsAnswered: user.dailyQuestionsAnswered || 0,
            dailyTestsFinished: user.dailyTestsFinished || 0,
            mistakesReviewed: user.mistakesReviewed || 0,
            streakCount: user.streakCount || 0,
            dailyCreditEarned: user.dailyCreditEarned || 0,
            taskQuestionsClaimed: !!user.taskQuestionsClaimed,
            taskMockClaimed: !!user.taskMockClaimed,
            taskMistakesClaimed: !!user.taskMistakesClaimed,
            lastActiveDate: user.lastActiveDate,
            totalSessionTime,
            averageQuestionTime,
            isPro: !!user.isPro,
            userTier,
            deviceFingerprint
          }),
        });
      
      const result = await response.json();
      
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Claim Process",
          description: result.error,
        });
      } else if (result.reward > 0) {
        const userRef = doc(firestore, 'users', user.uid);
        const updates: any = {
          credits: increment(result.reward),
          dailyCreditEarned: increment(result.reward),
          lastActiveDate: serverTimestamp()
        };

        if (result.tasksCompleted.includes('questions')) {
          updates.taskQuestionsClaimed = true;
        }
        if (result.tasksCompleted.includes('mock')) {
          updates.taskMockClaimed = true;
        }
        if (result.tasksCompleted.includes('mistakes')) {
          updates.taskMistakesClaimed = true;
        }

        if (result.tasksCompleted.includes('streak_3') || result.tasksCompleted.includes('streak_7') || 
            result.tasksCompleted.includes('streak_14') || result.tasksCompleted.includes('streak_30')) {
          updates.lastTaskReset = serverTimestamp();
        }

        await updateDoc(userRef, updates);

        let rewardDescription = `You earned ${result.reward} AI Credits`;
        if (result.streakBonus > 0) {
          rewardDescription += ` (including ${result.streakBonus} streak bonus)`;
        }
        if (result.qualityBonus > 0) {
          rewardDescription += ` (+${result.qualityBonus} quality bonus)`;
        }

        // Add challenge bonus descriptions
        if (result.tasksCompleted.includes('speed_challenge')) {
          rewardDescription += ' (+3 Speed Master bonus)';
        }
        if (result.tasksCompleted.includes('focus_challenge')) {
          rewardDescription += ' (+3 Focus Champion bonus)';
        }
        if (result.tasksCompleted.includes('perfect_day')) {
          rewardDescription += ' (+5 Perfect Day bonus)';
        }

        // Show abuse warnings if detected
        if (result.abuseFlags && result.abuseFlags.length > 0) {
          toast({
            variant: "destructive",
            title: "⚠️ Activity Detected",
            description: "Unusual activity patterns detected. Rewards may be reduced.",
          });
        } else if (result.warning) {
          toast({
            variant: "default",
            title: "📊 Activity Notice",
            description: result.warning,
          });
        } else {
          toast({
            title: "🎉 Rewards Claimed!",
            description: rewardDescription,
          });
        }
      } else {
        toast({
          title: "📋 Daily Tasks",
          description: "Keep practicing to complete more tasks and earn rewards!",
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

  // Determine streak status
  const streakCount = user?.streakCount || 0;

  // Tier colors and styling
  const tierConfig = {
    'Bronze': { color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    'Silver': { color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' },
    'Gold': { color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    'Platinum': { color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' }
  };

  const currentTierStyle = tierConfig[userTier as keyof typeof tierConfig] || tierConfig.Bronze;

  return (
    <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 md:p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Target className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                Daily Tasks
              </CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-500">Complete tasks to earn credits</CardDescription>
            </div>
          </div>
          
          {/* Streak Badge */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 rounded-2xl shadow-lg shadow-orange-500/20">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-white fill-current" />
            </div>
            <div className="text-white">
              <p className="text-lg font-black leading-none">{streakCount}</p>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Day Streak</p>
            </div>
          </div>
        </div>

        {/* User Tier Badge */}
        <div className="flex items-center gap-3 mt-3">
          <div className={`px-3 py-1.5 rounded-xl border-2 ${currentTierStyle.bgColor} ${currentTierStyle.borderColor}`}>
            <span className={`text-xs font-black ${currentTierStyle.color}`}>{userTier} Tier</span>
          </div>
          <div className="text-xs text-slate-500">
            <span className="font-medium">Quality Score:</span>
            <span className={`font-bold ml-1 ${averageQuestionTime >= 10 && averageQuestionTime <= 120 ? 'text-emerald-600' : 'text-slate-400'}`}>
              {averageQuestionTime >= 10 && averageQuestionTime <= 120 ? 'Excellent' : 'Good'}
            </span>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daily Progress</span>
            <span className="text-xs font-black text-primary">{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} className="h-3 rounded-full bg-slate-100" />
        </div>
      </CardHeader>
      
      <CardContent className="p-4 md:p-6 space-y-4">
        {/* Task Cards */}
        <div className="grid grid-cols-1 gap-3">
          {updatedTasks.map((task) => {
            const isComplete = task.current >= task.goal;
            const progress = Math.min((task.current / task.goal) * 100, 100);

            return (
              <div 
                key={task.id} 
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all duration-300",
                  task.isClaimed 
                    ? "bg-slate-50 opacity-50 border-slate-200" 
                    : isComplete 
                      ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 shadow-sm shadow-emerald-100" 
                      : "bg-white border-slate-100 hover:border-primary/20 hover:shadow-md"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center shadow-sm",
                      task.bgColor,
                      task.color
                    )}>
                      {task.icon}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{task.title}</p>
                      <p className="text-[10px] font-medium text-slate-400 line-clamp-1">{task.description}</p>
                      {!task.isClaimed && (
                        <p className="text-[10px] font-black text-primary flex items-center gap-1">
                          <Coins className="w-3 h-3" /> +{task.reward} Credits
                          {task.id === 'questions' && userTier !== 'Bronze' && (
                            <span className="text-[8px] text-amber-600">(+{Math.floor(task.reward * 0.1)} tier bonus)</span>
                          )}
                          {task.id === 'questions' && (user?.dailyQuestionsAnswered || 0) >= 5 && !user?.isPro && (
                            <span className="text-[8px] text-emerald-600">(+2 Login bonus)</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    {task.isClaimed ? (
                      <div className="flex items-center gap-1 bg-emerald-100 px-2 py-1 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-[10px] font-bold text-emerald-700">Claimed</span>
                      </div>
                    ) : isComplete ? (
                      <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-lg">
                        <Star className="w-4 h-4 text-amber-600" />
                        <span className="text-[10px] font-bold text-amber-700">Ready!</span>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-500">{task.current}/{task.goal}</span>
                    )}
                  </div>
                </div>
                
                <div className="mt-3">
                  <Progress 
                    value={progress} 
                    className={cn(
                      "h-2 rounded-full", 
                      task.isClaimed ? "bg-slate-200" : isComplete ? "bg-emerald-200" : "bg-slate-100"
                    )} 
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Claim Button */}
        <div className="pt-2">
          <Button 
            onClick={handleClaimReward} 
            disabled={!user || claiming} 
            className={cn(
              "w-full h-14 rounded-2xl font-bold text-base gap-3 transition-all",
              canClaimAny 
                ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:scale-[1.01]" 
                : "bg-slate-100 text-slate-400 hover:bg-slate-100"
            )}
          >
            {claiming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : canClaimAny ? (
              <>
                <Gift className="w-5 h-5" />
                Claim {totalEarnedToday} Credits
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                {totalProgress >= 100 ? 'All Tasks Complete!' : 'Complete Tasks to Earn'}
              </>
            )}
          </Button>
        </div>

        {/* Enhanced Daily Challenges */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Daily Challenges</p>
          <div className="grid grid-cols-1 gap-3">
            {/* Speed Challenge */}
            <div className={cn(
              "relative p-4 rounded-2xl border-2 transition-all overflow-hidden",
              averageQuestionTime >= 15 && averageQuestionTime <= 60
                ? "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200" 
                : "bg-slate-50 border-slate-100 opacity-60"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  averageQuestionTime >= 15 && averageQuestionTime <= 60 ? "bg-blue-500" : "bg-slate-200"
                )}>
                  <Clock className={cn("w-4 h-4", averageQuestionTime >= 15 && averageQuestionTime <= 60 ? "text-white" : "text-slate-400")} />
                </div>
                <div>
                  <span className="text-sm font-black text-slate-700">Speed Master</span>
                  <p className="text-[10px] text-slate-500">15-60s/question</p>
                </div>
              </div>
              <p className="text-lg font-black text-slate-800">+3 Credits</p>
              {averageQuestionTime >= 15 && averageQuestionTime <= 60 && (
                <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-blue-500" />
              )}
            </div>

            {/* Focus Challenge */}
            <div className={cn(
              "relative p-4 rounded-2xl border-2 transition-all overflow-hidden",
              totalSessionTime >= 1800 && totalSessionTime <= 3600
                ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200" 
                : "bg-slate-50 border-slate-100 opacity-60"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  totalSessionTime >= 1800 && totalSessionTime <= 3600 ? "bg-green-500" : "bg-slate-200"
                )}>
                  <Target className={cn("w-4 h-4", totalSessionTime >= 1800 && totalSessionTime <= 3600 ? "text-white" : "text-slate-400")} />
                </div>
                <div>
                  <span className="text-sm font-black text-slate-700">Focus Champion</span>
                  <p className="text-[10px] text-slate-500">30-60min session</p>
                </div>
              </div>
              <p className="text-lg font-black text-slate-800">+3 Credits</p>
              {totalSessionTime >= 1800 && totalSessionTime <= 3600 && (
                <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-green-500" />
              )}
            </div>

            {/* Perfect Day Challenge */}
            <div className={cn(
              "relative p-4 rounded-2xl border-2 transition-all overflow-hidden",
              updatedTasks.every(t => t.current >= t.goal)
                ? "bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200" 
                : "bg-slate-50 border-slate-100 opacity-60"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  updatedTasks.every(t => t.current >= t.goal) ? "bg-yellow-500" : "bg-slate-200"
                )}>
                  <Star className={cn("w-4 h-4", updatedTasks.every(t => t.current >= t.goal) ? "text-white fill-current" : "text-slate-400")} />
                </div>
                <div>
                  <span className="text-sm font-black text-slate-700">Perfect Day</span>
                  <p className="text-[10px] text-slate-500">All tasks completed</p>
                </div>
              </div>
              <p className="text-lg font-black text-slate-800">+5 Credits</p>
              {updatedTasks.every(t => t.current >= t.goal) && (
                <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-yellow-500" />
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Streak Milestones */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Streak Milestones</p>
          <div className="grid grid-cols-2 gap-3">
            {/* 3-Day Streak */}
            <div className={cn(
              "relative p-4 rounded-2xl border-2 transition-all overflow-hidden",
              streakCount >= 3 
                ? "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200" 
                : "bg-slate-50 border-slate-100 opacity-60"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  streakCount >= 3 ? "bg-orange-500" : "bg-slate-200"
                )}>
                  <Flame className={cn("w-4 h-4", streakCount >= 3 ? "text-white" : "text-slate-400")} />
                </div>
                <span className="text-sm font-black text-slate-700">3-Day</span>
              </div>
              <p className="text-lg font-black text-slate-800">+15 Credits</p>
              {streakCount >= 3 && (
                <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-orange-500" />
              )}
              {streakCount < 3 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200">
                  <div 
                    className="h-full bg-orange-500 transition-all" 
                    style={{ width: `${Math.min((streakCount / 3) * 100, 100)}%` }} 
                  />
                </div>
              )}
            </div>
            
            {/* 7-Day Streak */}
            <div className={cn(
              "relative p-4 rounded-2xl border-2 transition-all overflow-hidden",
              streakCount >= 7 
                ? "bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200" 
                : "bg-slate-50 border-slate-100 opacity-60"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  streakCount >= 7 ? "bg-purple-500" : "bg-slate-200"
                )}>
                  <Star className={cn("w-4 h-4", streakCount >= 7 ? "text-white fill-current" : "text-slate-400")} />
                </div>
                <span className="text-sm font-black text-slate-700">7-Day</span>
              </div>
              <p className="text-lg font-black text-slate-800">+30 Credits</p>
              {streakCount >= 7 && (
                <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-purple-500" />
              )}
              {streakCount < 7 && streakCount >= 3 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200">
                  <div 
                    className="h-full bg-purple-500 transition-all" 
                    style={{ width: `${((streakCount - 3) / 4) * 100}%` }} 
                  />
                </div>
              )}
            </div>

            {/* 14-Day Streak */}
            <div className={cn(
              "relative p-4 rounded-2xl border-2 transition-all overflow-hidden",
              streakCount >= 14 
                ? "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200" 
                : "bg-slate-50 border-slate-100 opacity-60"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  streakCount >= 14 ? "bg-indigo-500" : "bg-slate-200"
                )}>
                  <Trophy className={cn("w-4 h-4", streakCount >= 14 ? "text-white" : "text-slate-400")} />
                </div>
                <span className="text-sm font-black text-slate-700">14-Day</span>
              </div>
              <p className="text-lg font-black text-slate-800">+40 Credits</p>
              {streakCount >= 14 && (
                <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-indigo-500" />
              )}
              {streakCount < 14 && streakCount >= 7 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200">
                  <div 
                    className="h-full bg-indigo-500 transition-all" 
                    style={{ width: `${Math.min(((streakCount - 7) / 7) * 100, 100)}%` }} 
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reset Timer */}
        <div className="flex items-center justify-center gap-2 pt-3 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          <span className="font-medium">Tasks reset daily at midnight</span>
        </div>
      </CardContent>
    </Card>
  );
}
