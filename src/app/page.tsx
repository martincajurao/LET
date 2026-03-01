'use client'

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  GraduationCap, 
  ChevronRight, 
  Zap,
  Trophy,
  Flame,
  Star,
  Loader2,
  BookOpen,
  Facebook,
  ShieldCheck,
  Languages,
  User,
  Users,
  Moon,
  Sun,
  Crown,
  Shield,
  Sparkles,
  Lock,
  Play,
  ShieldAlert,
  Target,
  Timer,
  LayoutDashboard
} from "lucide-react";
import { ExamInterface } from "@/components/exam/ExamInterface";
import { ResultsOverview } from "@/components/exam/ResultsOverview";
import { Question, MAJORSHIPS } from "@/app/lib/mock-data";
import { useUser, useFirestore } from "@/firebase";
import { collection, addDoc, doc, onSnapshot, updateDoc, increment, serverTimestamp, query, where } from "firebase/firestore";
import { fetchQuestionsFromFirestore } from "@/lib/db-seed";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getRankData, isTrackUnlocked, XP_REWARDS, COOLDOWNS, UNLOCK_RANKS, getCareerRankTitle } from '@/lib/xp-system';
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

type AppState = 'dashboard' | 'exam' | 'results' | 'onboarding';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18 1-.78 1.85-1.63 2.42v2.01h2.64c1.54-1.42 2.43-3.5 2.43-5.44z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.33C3.99 20.15 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.67H2.18C1.43 9.24 1 10.57 1 12s.43 2.76 1.18 4.33l3.66-2.24z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.85 2.18 7.67l3.66 2.33c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

function sanitizeData(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  if (data.constructor?.name === 'FieldValue' || (data._methodName && data._methodName.startsWith('FieldValue.'))) return data;
  if (Array.isArray(data)) return data.map(sanitizeData);
  const sanitized: any = {};
  for (const key in data) {
    const val = sanitizeData(data[key]);
    if (val !== undefined) sanitized[key] = val;
  }
  return sanitized;
}

const EducationalLoader = ({ message }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center gap-8 animate-in fade-in duration-1000">
    <div className="relative">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="w-32 h-32 border-2 border-dashed border-primary/20 rounded-full absolute -inset-4" />
      <motion.div animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="w-32 h-32 border-2 border-dashed border-primary/10 rounded-full absolute -inset-4 scale-110" />
      <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center relative z-10 shadow-2xl shadow-primary/10 overflow-hidden">
        <motion.div animate={{ y: [0, -6, 0], rotate: [0, 3, -3, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}><GraduationCap className="w-12 h-12 text-primary" /></motion.div>
        <motion.div animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], x: [0, 15, -5, 0], y: [0, -10, 15, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-4 right-4"><Sparkles className="w-5 h-5 text-yellow-500 fill-current animate-sparkle" /></motion.div>
      </div>
    </div>
    {message && (
      <div className="space-y-3 text-center">
        <p className="font-black text-xl tracking-tight text-foreground uppercase tracking-widest">{message}</p>
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
        </div>
      </div>
    )}
  </div>
);

function LetsPrepContent() {
  const { user, loading: authLoading, updateProfile, loginWithGoogle, loginWithFacebook, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isDark, toggleDarkMode } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [state, setState] = useState<AppState>('dashboard');
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examTime, setExamTime] = useState(0);
  const [lastXpEarned, setLastXpEarned] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [authIssue, setAuthIssue] = useState(false);
  
  const [timePerQuestion, setTimePerQuestion] = useState(60);
  const [limits, setLimits] = useState({ limitGenEd: 10, limitProfEd: 10, limitSpec: 10 });

  const [userRank, setUserRank] = useState<string | number>('---');
  const [adCooldown, setAdCooldown] = useState(0);
  const [quickFireCooldown, setQuickFireCooldown] = useState(0);
  const [claimingXp, setClaimingXp] = useState(false);
  
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = React.useRef<number | null>(null);
  
  const [newResultId, setNewResultId] = useState<string | undefined>(undefined);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 10) {
      pullStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || pullStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - pullStartY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 100));
      if (diff > 10) e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 50 && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await refreshUser();
        if (typeof window !== 'undefined') window.location.reload();
        toast({ title: "Refreshed", description: "Latest data loaded." });
      } catch (e) {
        console.error('Pull to refresh error:', e);
        toast({ variant: "destructive", title: "Refresh Failed", description: "Could not fetch latest data." });
      } finally {
        setIsRefreshing(false);
        setIsPulling(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
    pullStartY.current = null;
  };

  const rankData = useMemo(() => user ? getRankData(user.xp || 0) : null, [user?.xp]);

  useEffect(() => {
    if (!firestore) return;
    const docRef = doc(firestore, "system_configs", "global");
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTimePerQuestion(data.timePerQuestion || 60);
        setLimits({ limitGenEd: data.limitGenEd || 10, limitProfEd: data.limitProfEd || 10, limitSpec: data.limitSpec || 10 });
      }
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'get'
      }));
    });
    return () => unsub();
  }, [firestore]);

  useEffect(() => {
    if (!user || !firestore) return;
    const q = query(collection(firestore, "exam_results"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const count = snap.size;
      setUserRank(count > 0 ? `#${count}` : '---');
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'exam_results',
        operation: 'list'
      }));
    });
    return () => unsub();
  }, [user, firestore]);

  useEffect(() => {
    if (!user) return;
    if (user.uid !== 'bypass-user' && !user.onboardingComplete) { setState('onboarding'); return; }
    const interval = setInterval(() => {
      const now = Date.now();
      const lastAd = typeof user.lastAdXpTimestamp === 'number' ? user.lastAdXpTimestamp : 0;
      const lastQf = typeof user.lastQuickFireTimestamp === 'number' ? user.lastQuickFireTimestamp : 0;
      setAdCooldown(Math.max(0, lastAd + COOLDOWNS.AD_XP - now));
      setQuickFireCooldown(Math.max(0, lastQf + COOLDOWNS.QUICK_FIRE - now));
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const startExam = async (category: 'General Education' | 'Professional Education' | 'Specialization' | 'all' | 'quickfire' | 'Major' | 'Prof Ed') => {
    if (!user) { setAuthIssue(true); return; }
    setLoading(true);
    setLoadingStep(0);
    setLoadingMessage("Calibrating Learning Path...");
    try {
      setLoadingStep(20);
      const questionPool = await fetchQuestionsFromFirestore(firestore!);
      setLoadingStep(60);
      let finalQuestions: Question[] = [];
      if (category === 'all') {
        const genEd = shuffleArray(questionPool.filter(q => q.subject === 'General Education')).slice(0, limits.limitGenEd);
        const profEd = shuffleArray(questionPool.filter(q => q.subject === 'Professional Education')).slice(0, limits.limitProfEd);
        const spec = shuffleArray(questionPool.filter(q => q.subject === 'Specialization' && q.subCategory === (user?.majorship || 'English'))).slice(0, limits.limitSpec);
        finalQuestions = [...genEd, ...profEd, ...spec];
      } else if (category === 'quickfire') {
        const selection: Question[] = [];
        const genEdPool = questionPool.filter(q => q.subject === 'General Education');
        const profEdPool = questionPool.filter(q => q.subject === 'Professional Education');
        const specPool = questionPool.filter(q => q.subject === 'Specialization');
        if (genEdPool.length > 0) selection.push(shuffleArray(genEdPool)[0]);
        if (profEdPool.length > 0) selection.push(shuffleArray(profEdPool)[0]);
        if (specPool.length > 0) selection.push(shuffleArray(specPool)[0]);
        const remainingPool = questionPool.filter(q => !selection.find(s => s.id === q.id));
        finalQuestions = shuffleArray([...selection, ...shuffleArray(remainingPool).slice(0, 5 - selection.length)]);
      } else {
        const pool = questionPool.filter(q => {
          const target = category === 'Major' ? 'Specialization' : category;
          return target === 'Specialization' ? (q.subject === 'Specialization' && q.subCategory === (user?.majorship || 'English')) : q.subject === target;
        });
        let limitCount = (category === 'Professional Education' || category === 'Prof Ed') ? limits.limitProfEd : (category === 'Specialization' || category === 'Major') ? limits.limitSpec : limits.limitGenEd;
        finalQuestions = shuffleArray(pool).slice(0, limitCount);
      }
      if (finalQuestions.length === 0) throw new Error(`Insufficient items.`);
      setCurrentQuestions(finalQuestions);
      setLoadingStep(100);
      setTimeout(() => { setState('exam'); setLoading(false); }, 300);
    } catch (e: any) { toast({ variant: "destructive", title: "Simulation Failed", description: e.message }); setLoading(false); }
  };

  const handleExamComplete = async (answers: Record<string, string>, timeSpent: number, confidentAnswers: Record<string, boolean>) => {
    if (!user || !firestore) return;
    setExamAnswers(answers);
    setExamTime(timeSpent);
    setLoading(true);
    setLoadingMessage("Commiting Traces...");

    const results = currentQuestions.map(q => {
      const isCorrect = answers[q.id] === q.correctAnswer;
      const isConfident = confidentAnswers[q.id] || false;
      return {
        ...q,
        questionId: q.id,
        userAnswer: answers[q.id],
        isCorrect,
        isConfident
      };
    });
    
    const correctCount = results.filter(h => h.isCorrect).length;
    const overallScore = Math.round((correctCount / (currentQuestions.length || 1)) * 100);
    
    let xpEarned = correctCount * XP_REWARDS.CORRECT_ANSWER;
    results.forEach(r => {
      if (r.isConfident) {
        if (r.isCorrect) xpEarned += XP_REWARDS.CONFIDENT_CORRECT_BONUS;
        else xpEarned += XP_REWARDS.CONFIDENT_WRONG_PENALTY;
      }
    });

    const isQuickFire = currentQuestions.length <= 5;
    if (!isQuickFire) xpEarned += (currentQuestions.length >= 50 ? XP_REWARDS.FINISH_FULL_SIM : XP_REWARDS.FINISH_TRACK);
    else xpEarned += Math.round((correctCount / 5) * XP_REWARDS.QUICK_FIRE_COMPLETE);

    setLastXpEarned(xpEarned);
    const resultsData = sanitizeData({ userId: user.uid, displayName: user.displayName || 'Guest Educator', timestamp: Date.now(), overallScore, timeSpent, xpEarned, results, lastActiveDate: serverTimestamp() });

    if (!user.uid.startsWith('bypass')) {
      const docRef = await addDoc(collection(firestore, "exam_results"), resultsData);
      setNewResultId(docRef.id);
      const updateData: any = { dailyQuestionsAnswered: increment(currentQuestions.length), dailyTestsFinished: increment(!isQuickFire ? 1 : 0), xp: increment(xpEarned), lastActiveDate: serverTimestamp() };
      if (isQuickFire) updateData.lastQuickFireTimestamp = Date.now();
      await updateDoc(doc(firestore, 'users', user.uid), updateData);
      await refreshUser();
    }

    setLoadingStep(100);
    setLoading(false);
    setTimeout(() => { setState('results'); }, 300);
  };

  const handleWatchXpAd = async () => {
    if (!user || !firestore || adCooldown > 0) return;
    setClaimingXp(true);
    setTimeout(async () => {
      try {
        await updateDoc(doc(firestore, 'users', user.uid), { xp: increment(XP_REWARDS.AD_WATCH_XP), credits: increment(5), lastAdXpTimestamp: Date.now() });
        toast({ variant: "reward", title: "Growth Boost!", description: `+${XP_REWARDS.AD_WATCH_XP} XP earned.` });
        refreshUser();
      } catch (e) { toast({ variant: "destructive", title: "Claim Failed", description: "Sync error." }); } finally { setClaimingXp(false); }
    }, 2500);
  };

  const formatCooldown = (ms: number) => {
    const mins = Math.ceil(ms / (1000 * 60));
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  };

  if (authLoading) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} className="fixed inset-0 z-[2000] flex items-center justify-center bg-background bg-gradient-to-b from-background via-background to-primary/5">
      <EducationalLoader message="Calibrating Educator Session" />
    </motion.div>
  );

  const displayStats = user ? [
    { icon: <Sparkles className="w-4 h-4 text-yellow-500 fill-current animate-sparkle" />, label: 'Credits', value: typeof user.credits === 'number' ? user.credits : 0, color: 'text-yellow-500 bg-yellow-500/10' },
    { icon: <Trophy className="w-4 h-4 text-primary" />, label: 'Arena', value: userRank, color: 'text-primary bg-primary/10' },
    { icon: user?.isPro ? <Crown className="w-4 h-4 text-yellow-600 fill-current" /> : <Shield className="w-4 h-4 text-blue-500" />, label: 'Tier', value: user?.isPro ? 'Platinum' : 'FREE', color: user?.isPro ? 'text-yellow-600 bg-yellow-500/10' : 'text-blue-500 bg-blue-500/10' },
    { icon: <Flame className="w-4 h-4 text-orange-500 fill-current" />, label: 'Streak', value: typeof user.streakCount === 'number' ? user.streakCount : 0, color: 'text-orange-500 bg-orange-500/10' }
  ] : [
    { icon: <Users className="w-4 h-4 text-blue-500" />, label: 'Community', value: '1.7K+', color: 'text-blue-500 bg-blue-500/5' },
    { icon: <Sparkles className="w-4 h-4 text-purple-500 animate-sparkle" />, label: 'AI Solved', value: '8.2K+', color: 'text-purple-500 bg-purple-500/5' },
    { icon: <Star className="w-4 h-4 text-pink-500" />, label: 'Items', value: '3.5K+', color: 'text-pink-500 bg-pink-500/5' },
    { icon: <Trophy className="w-4 h-4 text-yellow-500" />, label: 'Readiness', value: '82%', color: 'text-yellow-500 bg-yellow-500/5' }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="min-h-screen bg-background text-foreground font-body transition-all duration-300" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined }}>
      {isPulling && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-2 bg-primary/10 backdrop-blur-sm">
          <Loader2 className={cn("w-5 h-5 text-primary animate-spin", isRefreshing ? "block" : "block")} />
          <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-primary">
            {isRefreshing ? "Synchronizing..." : pullDistance > 60 ? "Release to sync" : "Pull down to refresh"}
          </span>
        </div>
      )}
      <Toaster />
      
      <Dialog open={loading}>
        <DialogContent className="max-w-[320px] border-none shadow-2xl bg-card rounded-[3rem] p-10 z-[1001] outline-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Analytical Calibration</DialogTitle>
            <DialogDescription>Synchronizing simulation engine parameters...</DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
            <EducationalLoader message={loadingMessage} />
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-60">
                <span>Simulation Path</span>
                <span>{loadingStep}%</span>
              </div>
              <Progress value={loadingStep} className="h-2 w-full rounded-full bg-muted shadow-inner" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence mode="wait">
        {state === 'exam' ? (
          <motion.div key="exam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full"><ExamInterface questions={currentQuestions} timePerQuestion={timePerQuestion} onComplete={handleExamComplete} /></motion.div>
        ) : state === 'results' ? (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4"><ResultsOverview questions={currentQuestions} answers={examAnswers} timeSpent={examTime} resultId={newResultId} onRestart={() => setState('dashboard')} /></motion.div>
        ) : state === 'onboarding' ? (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-[85vh] flex items-center justify-center p-4">
            <Card className="w-full max-w-md rounded-[3rem] bg-card border-none shadow-2xl overflow-hidden">
              <div className="bg-primary/10 p-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-card rounded-[2rem] flex items-center justify-center shadow-xl mb-4 border border-primary/20"><ShieldCheck className="w-10 h-10 text-primary" /></div>
                <h2 className="text-3xl font-black tracking-tight">Final Calibration</h2>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em] mt-2">Professional Credentials Required</p>
              </div>
              <CardContent className="p-10 space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Academic Nickname</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <Input placeholder="e.g. Master Teacher" className="pl-11 h-14 rounded-2xl border-2 font-black text-lg focus:border-primary transition-all" value={user?.displayName || ""} onChange={(e) => {}} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Specialization Track</Label>
                    <Select value={user?.majorship || ""} onValueChange={(val) => updateProfile({ majorship: val })}>
                      <SelectTrigger className="h-14 rounded-2xl border-2 px-4 font-black text-lg"><div className="flex items-center gap-3"><GraduationCap className="w-5 h-5 text-primary" /><SelectValue placeholder="Select specialized path..." /></div></SelectTrigger>
                      <SelectContent className="rounded-2xl">{MAJORSHIPS.map(m => (<SelectItem key={m} value={m} className="font-bold py-4 px-6">{m}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={() => setState('dashboard')} className="w-full h-16 rounded-[1.75rem] font-black text-lg shadow-2xl shadow-primary/30 active:scale-95 transition-all gap-3"><Zap className="w-6 h-6 fill-current" /> Enter Learning Vault</Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-4 pt-4 pb-8 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {displayStats.map((stat, i) => (
                <div key={i} className="android-surface rounded-2xl p-3 flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", stat.color)}>{stat.icon}</div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                    <p className="text-lg font-black text-foreground leading-none">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                {user && (
                  <Card className="border-none shadow-sm rounded-[2rem] bg-card overflow-hidden">
                    <CardHeader className="p-6 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Career Status</p>
                          <CardTitle className="text-xl font-black flex items-center gap-2">
                            {rankData?.title} 
                            <span className="text-xs font-bold text-muted-foreground ml-1">Rank {rankData?.rank}</span>
                          </CardTitle>
                        </div>
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><Trophy className="w-5 h-5 text-primary" /></div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                          <span className="text-muted-foreground">{rankData?.xpInRank || 0} XP</span>
                          <span className="text-muted-foreground">{rankData?.nextRankXp} XP</span>
                        </div>
                        <Progress value={rankData?.progress} className="h-2 rounded-full" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button onClick={handleWatchXpAd} disabled={claimingXp || adCooldown > 0} variant="outline" className="h-12 rounded-xl font-bold text-xs gap-2 border-primary/20 hover:bg-primary/5 active:scale-95 transition-all">
                          {claimingXp ? <Loader2 className="w-4 h-4 animate-spin" /> : adCooldown > 0 ? <Timer className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                          {adCooldown > 0 ? formatCooldown(adCooldown) : "XP Boost Clip"}
                        </Button>
                        <Button onClick={() => startExam('quickfire')} disabled={quickFireCooldown > 0} variant="default" className="h-12 rounded-xl font-bold text-xs gap-2 shadow-lg shadow-primary/20">
                          {quickFireCooldown > 0 ? <Timer className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
                          {quickFireCooldown > 0 ? formatCooldown(quickFireCooldown) : "Quick Fire"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="overflow-hidden border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-card to-background relative p-8 md:p-12 group active:scale-[0.98] transition-all">
                  <div className="relative z-10 space-y-6">
                    <Badge variant="secondary" className="font-bold text-[10px] uppercase px-4 py-1 bg-primary/20 text-primary border-none">Free Forever Practice</Badge>
                    <div className="space-y-4">
                      <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] text-foreground">Prepare for the <br /><span className="text-primary italic">Board Exam.</span></h1>
                      <p className="text-muted-foreground font-medium md:text-xl max-w-lg">High-fidelity simulations with AI pedagogical analysis tailored for Filipino educators.</p>
                    </div>
                    <Button size="lg" disabled={loading} onClick={() => startExam('all')} className="h-14 md:h-16 px-8 md:px-12 rounded-2xl font-black text-base md:text-lg gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all group"><Zap className="w-6 h-6 fill-current" /> <span>Launch Full Battle</span> <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></Button>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                </Card>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-black tracking-tight flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Training Zones</h3>
                    <Badge variant="ghost" className="text-[10px] font-black uppercase tracking-widest opacity-40">Verified Tracks</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'General Education', name: 'Gen Ed', icon: <Languages />, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Core Knowledge', rnk: UNLOCK_RANKS.GENERAL_ED },
                      { id: 'Professional Education', name: 'Prof Ed', icon: <GraduationCap />, color: 'text-purple-500', bg: 'bg-purple-500/10', desc: 'Teaching Strategy', rnk: UNLOCK_RANKS.PROFESSIONAL_ED },
                      { id: 'Specialization', name: user?.majorship || 'Major', icon: <Star />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Subject Mastery', rnk: UNLOCK_RANKS.SPECIALIZATION }
                    ].map((track, i) => {
                      const isLocked = user && !isTrackUnlocked(rankData?.rank || 1, track.id, user.unlockedTracks);
                      return (
                        <Card key={i} onClick={() => !isLocked && startExam(track.id as any)} className={cn("group cursor-pointer border-2 transition-all rounded-[2rem] bg-card overflow-hidden active:scale-95 relative", isLocked ? "border-muted opacity-60" : "border-border/50 hover:border-primary shadow-sm hover:shadow-md")}>
                          {isLocked && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[1px] p-4 text-center">
                              <div className="bg-card/90 p-2 rounded-xl border shadow-sm flex flex-col items-center">
                                <Lock className="w-4 h-4 text-muted-foreground mb-1" />
                                <span className="text-[8px] font-black uppercase text-muted-foreground leading-tight">Locked: Rank {track.rnk}</span>
                              </div>
                            </div>
                          )}
                          <CardContent className="p-6 space-y-4">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", track.bg, track.color)}>{track.icon}</div>
                            <div>
                              <h4 className="font-black text-lg text-foreground">{track.name}</h4>
                              <p className="text-xs text-muted-foreground font-medium">{track.desc}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none shadow-xl rounded-[2.25rem] bg-foreground text-background p-8 relative overflow-hidden group active:scale-[0.98] transition-all">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
                  <CardHeader className="p-0 mb-6"><CardTitle className="text-xl font-black tracking-tight flex items-center gap-3"><ShieldCheck className="w-6 h-6 text-primary" /> Verified Hub</CardTitle></CardHeader>
                  <CardContent className="p-0 space-y-8">
                    <div className="space-y-1"><p className="text-4xl font-black text-primary">3.5K+</p><p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Curated Items</p></div>
                    <div className="space-y-1"><p className="text-4xl font-black text-secondary">82%</p><p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Board Readiness</p></div>
                    <div className="space-y-1"><p className="text-4xl font-black text-blue-400">100%</p><p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Free Access</p></div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function LetsPrepApp() { return <Suspense fallback={null}><LetsPrepContent /></Suspense>; }
