
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DailyQuestDashboard } from '@/components/ui/daily-task-dashboard';
import { DailyLoginRewards } from '@/components/ui/daily-login-rewards';
import { QuestionOfTheDay } from '@/components/ui/question-of-the-day';
import { StudyTimer } from '@/components/ui/study-timer';
import { 
  Compass, 
  ArrowLeft, 
  ShieldCheck, 
  Brain, 
  Loader2, 
  Sparkles, 
  RefreshCw,
  Zap,
  Play,
  Timer as TimerIcon,
  ShieldAlert,
  ChevronRight,
  Info,
  CheckCircle2,
  Flame
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { Question } from '@/app/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { generateDailyQuestion } from '@/ai/flows/generate-qotd-flow';
import { COOLDOWNS, XP_REWARDS, DAILY_AD_LIMIT } from '@/lib/xp-system';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function TasksPage() {
  const { user, loading, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [dailyQuestion, setDailyQuestion] = useState<Question | null>(null);
  const [loadingQotd, setLoadingQotd] = useState(true);
  
  const [watchingAd, setWatchingAd] = useState(false);
  const [verifyingAd, setVerifyingAd] = useState(false);
  const [adTimeLeft, setAdTimeLeft] = useState(0);
  const [qfTimeLeft, setQfTimeLeft] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);
      if (user) {
        const lastAd = Number(user.lastAdXpTimestamp) || 0;
        const lastQf = Number(user.lastQuickFireTimestamp) || 0;
        setAdTimeLeft(Math.max(0, lastAd + COOLDOWNS.AD_XP - now));
        setQfTimeLeft(Math.max(0, lastQf + COOLDOWNS.QUICK_FIRE - now));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    async function fetchDailyInsight() {
      if (!firestore) return;
      try {
        const docRef = doc(firestore, 'system_configs', 'daily_insight');
        const snap = await getDoc(docRef);
        const today = new Date().toISOString().split('T')[0];

        if (snap.exists()) {
          const data = snap.data();
          if (data.dateGenerated === today) {
            setDailyQuestion({ ...data, id: 'qotd' } as Question);
            setLoadingQotd(false);
            return;
          }
        }

        setLoadingQotd(true);
        const freshQuestion = await generateDailyQuestion();
        const qotdData = { ...freshQuestion, dateGenerated: today, timestamp: Date.now() };
        await setDoc(docRef, qotdData);
        setDailyQuestion({ ...qotdData, id: 'qotd' } as Question);
      } catch (e) {
        console.error('Failed to sync daily insight:', e);
      } finally {
        setLoadingQotd(false);
      }
    }
    fetchDailyInsight();
  }, [firestore]);

  const handleWatchAd = async () => {
    if (!user || !firestore || watchingAd) return;
    if ((user.dailyAdCount || 0) >= DAILY_AD_LIMIT) {
      toast({ title: "Allowance Reached", description: "Daily limit reached.", variant: "destructive" });
      return;
    }
    
    setWatchingAd(true);
    setVerifyingAd(false);

    setTimeout(async () => {
      setVerifyingAd(true);
      setTimeout(async () => {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          await updateDoc(userDocRef, {
            credits: increment(5),
            xp: increment(XP_REWARDS.AD_WATCH_XP),
            lastAdXpTimestamp: Date.now(),
            dailyAdCount: increment(1)
          });
          await refreshUser();
          toast({ variant: "reward", title: "Growth Boost!", description: `+${XP_REWARDS.AD_WATCH_XP} XP and +5 Credits earned.` });
        } catch (e) {
          toast({ variant: "destructive", title: "Sync Failed", description: "Verification failed." });
        } finally {
          setWatchingAd(false);
          setVerifyingAd(false);
        }
      }, 1500); 
    }, 3500);
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const adReachedLimit = (user?.dailyAdCount || 0) >= DAILY_AD_LIMIT;
  const adAvailable = adTimeLeft <= 0 && !adReachedLimit && !watchingAd;
  const qfAvailable = qfTimeLeft <= 0 && !watchingAd;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Quest Hub...</p>
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
    <div className="min-h-screen bg-background p-4 md:p-8 pb-32">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 font-black text-muted-foreground uppercase tracking-widest text-[10px] hover:text-primary active:scale-90 transition-all">
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
              <Compass className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground">Quest Hub</h1>
          </div>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60 ml-1">Daily Challenges & Intelligence Buffs</p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Fire Card */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className={cn(
                "android-surface p-6 rounded-[2.25rem] border-none shadow-md3-1 bg-card transition-all relative overflow-hidden group",
                !qfAvailable && "opacity-80 grayscale-[0.5]"
              )}>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-colors",
                      qfAvailable ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"
                    )}>
                      <Zap className={cn("w-7 h-7", qfAvailable && "fill-current")} />
                    </div>
                    <div>
                      <p className="font-black text-lg text-foreground">Brain Teaser</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">+{XP_REWARDS.QUICK_FIRE_COMPLETE} XP Potential</p>
                    </div>
                  </div>
                  {qfAvailable && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[9px] uppercase animate-pulse">Ready</Badge>
                  )}
                </div>
                <Button 
                  disabled={!qfAvailable || watchingAd}
                  onClick={() => router.push('/?start=quickfire')}
                  className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg active:scale-95 transition-all"
                >
                  {qfAvailable ? "Start Quiz" : <span className="font-mono">Cooldown: {formatTime(qfTimeLeft)}</span>}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Card>
            </motion.div>

            {/* Ad Reward Card */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className={cn(
                "android-surface p-6 rounded-[2.25rem] border-none shadow-md3-1 bg-card transition-all relative overflow-hidden group",
                !adAvailable && "opacity-80 grayscale-[0.5]"
              )}>
                {verifyingAd && (
                  <div className="absolute inset-0 z-20 bg-primary/95 flex flex-col items-center justify-center text-primary-foreground text-center p-4">
                    <ShieldAlert className="w-10 h-10 mb-2 animate-pulse" />
                    <p className="text-xs font-black uppercase tracking-widest">Verifying Trace...</p>
                  </div>
                )}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-colors",
                      adAvailable ? "bg-yellow-500 text-white shadow-lg shadow-yellow-500/20" : "bg-muted text-muted-foreground"
                    )}>
                      <Sparkles className={cn("w-7 h-7", adAvailable && "fill-current animate-sparkle")} />
                    </div>
                    <div>
                      <p className="font-black text-lg text-foreground">Growth Boost</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">+{XP_REWARDS.AD_WATCH_XP} XP & +5 Credits</p>
                    </div>
                  </div>
                  {adAvailable && (
                    <Badge className="bg-yellow-500/10 text-yellow-600 border-none font-black text-[9px] uppercase animate-pulse">Ready</Badge>
                  )}
                </div>
                <Button 
                  variant={adAvailable ? "default" : "outline"}
                  disabled={!adAvailable || watchingAd}
                  onClick={handleWatchAd}
                  className={cn(
                    "w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg active:scale-95 transition-all",
                    adAvailable ? "bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-500/20" : ""
                  )}
                >
                  {watchingAd ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Watching Clip...
                    </div>
                  ) : adReachedLimit ? (
                    <><CheckCircle2 className="w-4 h-4" /> Daily Limit Reached</>
                  ) : adAvailable ? (
                    "Watch & Secure Loot"
                  ) : (
                    <span className="font-mono">{formatTime(adTimeLeft)} Remaining</span>
                  )}
                </Button>
              </Card>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <DailyLoginRewards currentDay={Math.min(((user?.streakCount || 0) % 7) + 1, 7)} lastClaimDate={user.lastLoginRewardClaimedAt} onClaim={async (day, xp, credits) => {
              if (!user || !firestore) return;
              const userRef = doc(firestore, 'users', user.uid);
              await updateDoc(userRef, { 
                xp: increment(xp),
                credits: increment(credits),
                lastLoginRewardClaimedAt: Date.now(),
                lastActiveDate: serverTimestamp(),
                streakCount: increment(1)
              });
              await refreshUser();
              toast({ variant: "reward", title: "Vault Recharged!", description: `Day ${day} check-in verified. +${xp} XP and +${credits} Credits added.` });
            }} />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-8">
              {loadingQotd ? (
                <Card className="p-12 flex flex-col items-center justify-center gap-4 bg-muted/20 border-2 border-dashed border-border rounded-[2.5rem]">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Calibrating AI Daily Insight...</p>
                </Card>
              ) : dailyQuestion && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                  <QuestionOfTheDay question={dailyQuestion} lastClaimDate={user.lastQotdClaimedAt} onComplete={async (correct, xp) => {
                    if (!user || !firestore) return;
                    const userRef = doc(firestore, 'users', user.uid);
                    const updateData: any = { lastQotdClaimedAt: Date.now(), lastActiveDate: serverTimestamp() };
                    if (correct) {
                      updateData.xp = increment(xp);
                      updateData.dailyQuestionsAnswered = increment(1);
                      toast({ variant: "reward", title: "Strategic Accuracy!", description: `+${xp} XP earned!` });
                    } else {
                      toast({ title: "Trace Recorded", description: "Pedagogical insight unlocked. Return tomorrow for calibration." });
                    }
                    await updateDoc(userRef, updateData);
                    await refreshUser();
                  }} />
                </motion.div>
              )}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <StudyTimer onComplete={async (sessions, xp) => {
                  if (!user || !firestore) return;
                  const userRef = doc(firestore, 'users', user.uid);
                  await updateDoc(userRef, {
                    xp: increment(xp),
                    dailyAiUsage: increment(1),
                    lastActiveDate: serverTimestamp()
                  });
                  await refreshUser();
                  toast({ variant: "reward", title: "Focus Reward!", description: `+${xp} XP added to vault.` });
                }} />
              </motion.div>
            </div>
            <div className="lg:col-span-5 space-y-8">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <DailyQuestDashboard />
              </motion.div>
              <Card className="android-surface border-none shadow-md3-1 rounded-[2rem] bg-foreground text-background p-8 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700"><Brain className="w-24 h-24" /></div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-2 text-primary"><Sparkles className="w-4 h-4 fill-current animate-sparkle" /><span className="text-[10px] font-black uppercase tracking-[0.3em]">Strategic Advice</span></div>
                  <h3 className="text-xl font-black leading-tight">Consistency scales professional accuracy.</h3>
                  <p className="text-xs font-medium opacity-70 leading-relaxed">Complete your tactical boosts and daily quests early to maximize rank multipliers and accelerate your path to Distinguished Scholar status.</p>
                  <div className="pt-2"><div className="h-[1px] w-full bg-background/20 mb-4" /><p className="text-[9px] font-black uppercase tracking-widest text-primary">Vault Status: {user.credits} Units</p></div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
