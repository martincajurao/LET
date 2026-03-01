'use client'

import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  GraduationCap, 
  ChevronRight, 
  Zap,
  Trophy,
  Flame,
  Star,
  Loader2,
  BookOpen,
  ShieldCheck,
  Languages,
  Moon,
  Sun,
  Crown,
  Shield,
  Sparkles,
  Lock,
  Play,
  Target,
  Timer,
  LayoutDashboard,
  Users,
  Facebook,
  MessageSquare,
  Mail,
  Send,
  Heart,
  Smartphone,
  Download,
  QrCode
} from "lucide-react";
import QRCode from 'qrcode';
import { ExamInterface } from "@/components/exam/ExamInterface";
import { ResultsOverview } from "@/components/exam/ResultsOverview";
import { QuickFireResults } from "@/components/exam/QuickFireResults";
import { ResultUnlockDialog } from "@/components/exam/ResultUnlockDialog";
import { RankUpDialog } from "@/components/ui/rank-up-dialog";
import { Question } from "@/app/lib/mock-data";
import { useUser, useFirestore } from "@/firebase";
import { collection, addDoc, doc, onSnapshot, updateDoc, increment, serverTimestamp, query, where, limit } from "firebase/firestore";
import { fetchQuestionsFromFirestore } from "@/lib/db-seed";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getRankData, isTrackUnlocked, XP_REWARDS, COOLDOWNS, UNLOCK_RANKS, getCareerRankTitle, DAILY_AD_LIMIT, MIN_QUICK_FIRE_TIME } from '@/lib/xp-system';
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18 1-.78 1.85-1.63 2.42v2.01h2.64c1.54-1.42 2.43-3.5 2.43-5.44z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.33C3.99 20.15 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.67H2.18C1.43 9.24 1 10.57 1 12s.43 2.76 1.18 4.33l3.66-2.24z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.85 2.18 7.67l3.66 2.33c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

type AppState = 'dashboard' | 'exam' | 'results' | 'quickfire_results' | 'onboarding';

const GITHUB_APK_URL = "https://github.com/martincajurao/LET/releases/download/V2.1.0/let.apk";

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
  const { user, loading: authLoading, loginWithGoogle, loginWithFacebook, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isDark, toggleDarkMode } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [state, setState] = useState<AppState>('dashboard');
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examTime, setExamTime] = useState(0);
  const [lastXpEarned, setLastXpEarned] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [timePerQuestion, setTimePerQuestion] = useState(60);
  const [limits, setLimits] = useState({ limitGenEd: 10, limitProfEd: 10, limitSpec: 10 });

  const [userRank, setUserRank] = useState<string | number>('---');
  const [adCooldown, setAdCooldown] = useState(0);
  const [quickFireCooldown, setQuickFireCooldown] = useState(0);
  const [claimingXp, setClaimingXp] = useState(false);
  
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);
  const isStartingRef = useRef(false);
  
  const [newResultId, setNewResultId] = useState<string | undefined>(undefined);
  const [showResultUnlock, setShowResultUnlock] = useState(false);
  const [showRankUp, setShowRankUp] = useState(false);
  const [celebratedRank, setCelebratedRank] = useState(1);
  const [celebratedReward, setCelebratedReward] = useState(0);

  const [apkInfo, setApkInfo] = useState<{ version: string; downloadUrl: string } | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isApkLoading, setIsApkLoading] = useState(true);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

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
    const fetchLatestApk = async () => {
      try {
        setIsApkLoading(true);
        const response = await fetch('https://api.github.com/repos/martincajurao/LET/releases/latest');
        let downloadUrl = GITHUB_APK_URL;
        let version = "2.1.0";

        if (response.ok) {
          const data = await response.json();
          const apkAsset = data.assets?.find((a: any) => a.name.endsWith('.apk'));
          if (apkAsset) {
            downloadUrl = apkAsset.browser_download_url;
            version = data.tag_name.replace(/^V/, '');
          }
        }

        setApkInfo({ version, downloadUrl });
        const qr = await QRCode.toDataURL(downloadUrl, { width: 256, margin: 2, color: { dark: '#10b981', light: '#ffffff' } });
        setQrCodeUrl(qr);
      } catch (e) {
        console.error("Failed to fetch APK info:", e);
        setApkInfo({ version: "2.1.0", downloadUrl: GITHUB_APK_URL });
      } finally {
        setIsApkLoading(false);
      }
    };
    fetchLatestApk();
  }, []);

  useEffect(() => {
    if (user && rankData && user.lastRewardedRank && rankData.rank > user.lastRewardedRank) {
      setCelebratedRank(rankData.rank);
      setCelebratedReward(rankData.rankUpReward);
      setShowRankUp(true);
      
      if (firestore) {
        updateDoc(doc(firestore, 'users', user.uid), {
          lastRewardedRank: rankData.rank,
          credits: increment(rankData.rankUpReward)
        });
      }
    }
  }, [rankData?.rank, user, firestore]);

  const configDocRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, "system_configs", "global");
  }, [firestore]);

  useEffect(() => {
    if (!configDocRef) return;
    const unsub = onSnapshot(configDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTimePerQuestion(data.timePerQuestion || 60);
        setLimits({ limitGenEd: data.limitGenEd || 10, limitProfEd: data.limitProfEd || 10, limitSpec: data.limitSpec || 10 });
      }
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: configDocRef.path,
        operation: 'get'
      }));
    });
    return () => unsub();
  }, [configDocRef]);

  const resultsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, "exam_results"), 
      where("userId", "==", user.uid),
      limit(100)
    );
  }, [user?.uid, firestore]);

  useEffect(() => {
    if (!resultsQuery) return;
    const unsub = onSnapshot(resultsQuery, (snap) => {
      const count = snap.size;
      setUserRank(count > 0 ? `#${count}` : '---');
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'exam_results',
        operation: 'list'
      }));
    });
    return () => unsub();
  }, [resultsQuery]);

  useEffect(() => {
    if (!user) return;
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
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    if (!firestore || isStartingRef.current) return;
    isStartingRef.current = true;

    if (category === 'quickfire') {
      const now = Date.now();
      const lastQf = typeof user.lastQuickFireTimestamp === 'number' ? user.lastQuickFireTimestamp : 0;
      if (lastQf + COOLDOWNS.QUICK_FIRE > now) {
        toast({ variant: "destructive", title: "Access Denied", description: "Brain Teaser is still calibrating. Please wait for the cooldown." });
        isStartingRef.current = false;
        return;
      }
    }

    setLoading(true);
    setLoadingStep(0);
    setLoadingMessage("Calibrating Learning Path...");
    try {
      setLoadingStep(20);
      const questionPool = await fetchQuestionsFromFirestore(firestore);
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
      
      if (finalQuestions.length === 0) throw new Error(`Insufficient items found.`);
      
      setCurrentQuestions(finalQuestions);
      setLoadingStep(100);
      router.replace(pathname, { scroll: false });
      
      setTimeout(() => { 
        setState('exam'); 
        setLoading(false); 
        isStartingRef.current = false;
      }, 300);
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Simulation Failed", description: e.message }); 
      setLoading(false); 
      isStartingRef.current = false;
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim() || !firestore || !user) return;
    setIsSubmittingFeedback(true);
    try {
      await addDoc(collection(firestore, 'feedback'), {
        userId: user.uid,
        userName: user.displayName,
        text: feedbackText,
        timestamp: serverTimestamp()
      });
      toast({ variant: "reward", title: "Trace Recorded!", description: "Your pedagogical insight has been added to our vault." });
      setFeedbackText("");
      setShowFeedbackModal(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Could not record feedback trace." });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleExamComplete = async (answers: Record<string, string>, timeSpent: number, confidentAnswers: Record<string, boolean>) => {
    if (!user || !firestore) return;
    const isQuickFire = currentQuestions.length <= 5;
    const now = Date.now();

    if (isQuickFire && timeSpent < MIN_QUICK_FIRE_TIME) {
      toast({ variant: "destructive", title: "Calibration Divergence", description: "Trace was too rapid. Engage deeply to earn rewards." });
      setState('dashboard');
      return;
    }

    setExamAnswers(answers);
    setExamTime(timeSpent);
    setLoading(true);
    setLoadingMessage("Syncing Results...");

    const results = currentQuestions.map(q => {
      const isCorrect = answers[q.id] === q.correctAnswer;
      const isConfident = confidentAnswers[q.id] || false;
      return { ...q, questionId: q.id, userAnswer: answers[q.id], isCorrect, isConfident };
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

    if (!isQuickFire) xpEarned += (currentQuestions.length >= 50 ? XP_REWARDS.FINISH_FULL_SIM : XP_REWARDS.FINISH_TRACK);
    else xpEarned += Math.round((correctCount / 5) * XP_REWARDS.QUICK_FIRE_COMPLETE);

    setLastXpEarned(xpEarned);
    const resultsData = sanitizeData({ userId: user.uid, displayName: user.displayName || 'Guest Educator', timestamp: now, overallScore, timeSpent, xpEarned, results, lastActiveDate: serverTimestamp() });

    if (!user.uid.startsWith('bypass')) {
      const docRef = await addDoc(collection(firestore, "exam_results"), resultsData);
      setNewResultId(docRef.id);
      const updateData: any = { 
        dailyQuestionsAnswered: increment(currentQuestions.length), 
        dailyTestsFinished: increment(!isQuickFire ? 1 : 0), 
        xp: increment(xpEarned), 
        lastActiveDate: serverTimestamp() 
      };
      if (isQuickFire) updateData.lastQuickFireTimestamp = now;
      await updateDoc(doc(firestore, 'users', user.uid), updateData);
      await refreshUser();
    }

    setLoadingStep(100);
    setLoading(false);
    
    if (isQuickFire) setTimeout(() => { setState('quickfire_results'); }, 300);
    else if (!user.isPro && currentQuestions.length > 10) setShowResultUnlock(true);
    else setTimeout(() => { setState('results'); }, 300);
  };

  const handleWatchXpAd = async () => {
    if (!user || !firestore || adCooldown > 0 || claimingXp) return;
    if ((user.dailyAdCount || 0) >= DAILY_AD_LIMIT) return;
    setClaimingXp(true);
    setTimeout(async () => {
      try {
        const now = Date.now();
        await updateDoc(doc(firestore, 'users', user.uid), { 
          xp: increment(XP_REWARDS.AD_WATCH_XP), 
          credits: increment(5), 
          lastAdXpTimestamp: now,
          dailyAdCount: increment(1)
        });
        toast({ variant: "reward", title: "Growth Boost!", description: `+${XP_REWARDS.AD_WATCH_XP} XP earned.` });
        await refreshUser();
      } catch (e) { toast({ variant: "destructive", title: "Sync Failed", description: "Sync error." }); } 
      finally { setClaimingXp(false); }
    }, 3500);
  };

  const handleDownloadApk = () => {
    const url = apkInfo?.downloadUrl || GITHUB_APK_URL;
    window.location.href = url;
    toast({ title: "Downloading APK", description: "Directing to secure release trace." });
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (authLoading) return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background">
      <EducationalLoader message="Synchronizing Educator Session" />
    </div>
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.3 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background text-foreground font-body transition-all duration-300" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined }}>
      <Toaster />
      
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-w-sm outline-none overflow-hidden">
          <div className="bg-emerald-500/10 p-10 flex flex-col items-center text-center relative">
            <div className="w-20 h-20 bg-card rounded-[2rem] flex items-center justify-center shadow-xl mb-4 relative z-10">
              <ShieldCheck className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="space-y-1 relative z-10">
              <DialogTitle className="text-2xl font-black tracking-tight">Verified Access</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Credentials Required</DialogDescription>
            </div>
          </div>
          <div className="p-8 space-y-6 bg-card">
            <div className="grid gap-3">
              <Button onClick={async () => { await loginWithGoogle(); setShowAuthModal(false); }} className="h-14 rounded-2xl font-black gap-3 shadow-xl bg-white text-black border border-border hover:bg-muted transition-all active:scale-95">
                <GoogleIcon /> <span>Continue with Google</span>
              </Button>
              <Button onClick={async () => { await loginWithFacebook(); setShowAuthModal(false); }} className="h-14 rounded-2xl font-black gap-3 shadow-xl bg-[#1877F2] text-white hover:bg-[#1877F2]/90 border-none transition-all active:scale-95">
                <Facebook className="w-5 h-5 fill-current text-white" /> <span>Continue with Facebook</span>
              </Button>
            </div>
            <p className="text-center text-[10px] font-medium text-muted-foreground leading-relaxed px-4">Sign in to track your board readiness metrics.</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-md outline-none overflow-hidden">
          <div className="bg-primary/10 p-10 flex flex-col items-center justify-center text-center relative">
            <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center shadow-lg mb-4 relative z-10">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1 relative z-10">
              <DialogTitle className="text-2xl font-black tracking-tight">Feedback Vault</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Contribute to Academic Growth</DialogDescription>
            </div>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Your Suggestions</Label>
              <Textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="How can we improve your board preparation experience?" className="rounded-2xl min-h-[120px] border-2 p-4 text-sm font-medium resize-none focus:border-primary transition-all" />
            </div>
            <DialogFooter className="sm:flex-col gap-3">
              <Button onClick={handleFeedbackSubmit} disabled={isSubmittingFeedback || !feedbackText.trim()} className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-xl shadow-primary/30">
                {isSubmittingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Transmit Insight
              </Button>
              <Button variant="ghost" onClick={() => setShowFeedbackModal(false)} className="w-full font-bold text-muted-foreground">Discard</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence mode="wait">
        {state === 'exam' ? (
          <motion.div key="exam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <ExamInterface questions={currentQuestions} timePerQuestion={timePerQuestion} onComplete={handleExamComplete} />
          </motion.div>
        ) : state === 'results' ? (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4">
            <ResultsOverview questions={currentQuestions} answers={examAnswers} timeSpent={examTime} resultId={newResultId} onRestart={() => setState('dashboard')} />
          </motion.div>
        ) : state === 'quickfire_results' ? (
          <motion.div key="quickfire_results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4">
            <QuickFireResults questions={currentQuestions} answers={examAnswers} timeSpent={examTime} xpEarned={lastXpEarned} onRestart={() => setState('dashboard')} />
          </motion.div>
        ) : (
          <motion.div key="dashboard" variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto px-4 pt-4 pb-8 space-y-6">
            <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {displayStats.map((stat, i) => (
                <motion.div key={i} variants={itemVariants} className="android-surface rounded-2xl p-3 flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", stat.color)}>{stat.icon}</div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-lg font-black text-foreground leading-none">{stat.value}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                {user && (
                  <motion.div variants={itemVariants}>
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
                            <span className={cn(adCooldown > 0 && "font-mono")}>{adCooldown > 0 ? formatTime(adCooldown) : "XP Boost Clip"}</span>
                          </Button>
                          <Button onClick={() => router.push('/dashboard')} variant="default" className="h-12 rounded-xl font-bold text-xs gap-2 shadow-lg shadow-primary/20">
                            <LayoutDashboard className="w-4 h-4" /> View Roadmap
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                <motion.div variants={itemVariants} whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="overflow-hidden border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-card to-background relative p-8 md:p-12 group active:scale-[0.98] transition-all">
                    <div className="relative z-10 space-y-6">
                      <Badge variant="secondary" className="font-bold text-[10px] uppercase px-4 py-1 bg-primary/20 text-primary border-none">Free Practice Access</Badge>
                      <div className="space-y-4">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] text-foreground">Prepare for the <br /><span className="text-primary italic">Board Exam.</span></h1>
                        <p className="text-muted-foreground font-medium md:text-xl max-w-lg">High-fidelity simulations with AI analysis tailored for Filipino educators.</p>
                      </div>
                      {user ? (
                        <Button size="lg" disabled={loading} onClick={() => startExam('all')} className="h-14 md:h-16 px-8 md:px-12 rounded-2xl font-black text-base md:text-lg gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all group">
                          <Zap className="w-6 h-6 fill-current" /> <span>Launch Full Battle</span> <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      ) : (
                        <motion.div 
                          className="w-fit"
                          animate={{ scale: [1, 1.02, 1] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Button 
                            size="lg" 
                            onClick={() => setShowAuthModal(true)} 
                            className="h-16 md:h-20 px-10 md:px-14 rounded-[2rem] font-black text-lg md:text-xl gap-6 shadow-2xl shadow-primary/40 bg-primary text-primary-foreground hover:bg-primary/90 transition-all group relative overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            <div className="flex items-center gap-3 shrink-0 bg-background/20 p-2 rounded-2xl shadow-inner border border-white/10">
                              <GoogleIcon />
                              <div className="w-7 h-7 bg-[#1877F2] rounded-full flex items-center justify-center shadow-md border border-white/20">
                                <Facebook className="w-4 h-4 fill-current text-white" />
                              </div>
                            </div>
                            <div className="flex flex-col items-start leading-none text-left">
                              <span className="uppercase tracking-tighter">Sign In to Launch</span>
                              <span className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-[0.2em]">Secure Educator Entry</span>
                            </div>
                            <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
                          </Button>
                        </motion.div>
                      )}
                    </div>
                    <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }} transition={{ duration: 10, repeat: Infinity }} className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/3" />
                  </Card>
                </motion.div>

                <div className="space-y-4">
                  <h3 className="text-xl font-black tracking-tight flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Training Zones</h3>
                  <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'General Education', name: 'Gen Ed', icon: <Languages />, color: 'text-blue-500', bg: 'bg-blue-500/10', rnk: UNLOCK_RANKS.GENERAL_ED },
                      { id: 'Professional Education', name: 'Prof Ed', icon: <GraduationCap />, color: 'text-purple-500', bg: 'bg-purple-500/10', rnk: UNLOCK_RANKS.PROFESSIONAL_ED },
                      { id: 'Specialization', name: user?.majorship || 'Major', icon: <Star />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', rnk: UNLOCK_RANKS.SPECIALIZATION }
                    ].map((track, i) => {
                      const isLocked = user && !isTrackUnlocked(rankData?.rank || 1, track.id, user.unlockedTracks);
                      return (
                        <motion.div key={i} variants={itemVariants} whileTap={{ scale: 0.97 }}>
                          <Card onClick={() => !isLocked && startExam(track.id as any)} className={cn("group cursor-pointer border-2 transition-all rounded-[2rem] bg-card overflow-hidden active:scale-95 relative h-full", isLocked ? "border-muted opacity-60" : "border-border/50 hover:border-primary shadow-sm hover:shadow-md")}>
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
                              <h4 className="font-black text-lg text-foreground">{track.name}</h4>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="text-xl font-black tracking-tight flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Support & Community</h3>
                  <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div variants={itemVariants} whileTap={{ scale: 0.97 }}>
                      <Card onClick={() => setShowFeedbackModal(true)} className="android-surface h-full cursor-pointer border-none shadow-md3-1 rounded-[2rem] bg-card overflow-hidden group transition-all">
                        <CardContent className="p-6 flex items-center gap-5">
                          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors duration-500">
                            <MessageSquare className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-500" />
                          </div>
                          <div>
                            <h4 className="font-black text-lg text-foreground leading-none">Send Feedback</h4>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5 leading-snug">Suggest improvements</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                    <motion.div variants={itemVariants} whileTap={{ scale: 0.97 }}>
                      <Card onClick={() => window.location.href = 'mailto:support@letprep.app'} className="android-surface h-full cursor-pointer border-none shadow-md3-1 rounded-[2rem] bg-card overflow-hidden group transition-all">
                        <CardContent className="p-6 flex items-center gap-5">
                          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-emerald-500 transition-colors duration-500">
                            <Mail className="w-7 h-7 text-emerald-600 group-hover:text-white transition-colors duration-500" />
                          </div>
                          <div>
                            <h4 className="font-black text-lg text-foreground leading-none">Contact Us</h4>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5 leading-snug">Technical support</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                    <motion.div variants={itemVariants} className="md:col-span-2" whileTap={{ scale: 0.98 }}>
                      <Card onClick={() => window.open('https://facebook.com/groups/letprep', '_blank')} className="android-surface cursor-pointer border-none shadow-md3-1 rounded-[2rem] bg-foreground text-background overflow-hidden group transition-all relative">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -top-10 -right-10 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Facebook className="w-40 h-40" /></motion.div>
                        <CardContent className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                          <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-[#1877F2] rounded-2xl flex items-center justify-center shadow-xl"><Facebook className="w-8 h-8 text-white fill-current" /></div>
                            <div className="space-y-1"><h4 className="text-2xl font-black tracking-tight">Join Community</h4><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">Connect with 15K+ educators</p></div>
                          </div>
                          <Button className="rounded-xl font-black bg-white text-black hover:bg-white/90 h-12 px-8 active:scale-95 transition-all">Visit Lounge <ChevronRight className="w-4 h-4 ml-2" /></Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>
                </div>

                <motion.div variants={itemVariants} className="pt-8 text-center pb-12">
                  <div className="flex items-center justify-center gap-3 mb-4"><div className="h-[1px] w-12 bg-border" /><motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}><Heart className="w-4 h-4 text-rose-500 fill-current" /></motion.div><div className="h-[1px] w-12 bg-border" /></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40">Dedicated to the Filipino Educator</p>
                </motion.div>
              </div>

              <motion.div variants={containerVariants} className="lg:col-span-4 space-y-6">
                <motion.div variants={itemVariants}>
                  <Card className="android-surface border-none shadow-xl rounded-[2.25rem] bg-gradient-to-br from-emerald-500/20 via-card to-background p-6 overflow-hidden group active:scale-[0.98]">
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center shadow-inner"><Smartphone className="w-6 h-6 text-emerald-600" /></div>
                          <div><h3 className="font-black text-lg text-foreground leading-tight">Get Mobile App</h3><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Study Anywhere</p></div>
                        </div>
                        <Badge variant="outline" className="font-black text-[9px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5 uppercase">{isApkLoading ? '---' : `v${apkInfo?.version}`}</Badge>
                      </div>
                      <div className="flex flex-col items-center justify-center p-5 bg-card rounded-[2rem] border-2 border-dashed border-emerald-500/20 relative overflow-hidden shadow-inner">
                        <AnimatePresence mode="wait">
                          {isApkLoading ? (
                            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-32 h-32 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-300 animate-spin" /></motion.div>
                          ) : qrCodeUrl ? (
                            <motion.div key="qr" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                              <div className="w-32 h-32 relative z-10 bg-white p-1 rounded-xl shadow-md border border-emerald-100">
                                <img src={qrCodeUrl} alt="Download QR" className="w-full h-full object-contain" />
                              </div>
                              <div className="flex items-center gap-2 mt-3 text-emerald-600 relative z-10">
                                <QrCode className="w-3.5 h-3.5" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Scan to Install</p>
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                      <Button onClick={handleDownloadApk} disabled={isApkLoading} className="w-full h-14 rounded-2xl font-black gap-3 bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 transition-all hover:scale-[1.02]">{isApkLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />} Direct Download</Button>
                    </div>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card className="border-none shadow-xl rounded-[2.25rem] bg-foreground text-background p-8 relative overflow-hidden group active:scale-[0.98]">
                    <CardHeader className="p-0 mb-6"><CardTitle className="text-xl font-black tracking-tight flex items-center gap-3"><ShieldCheck className="w-6 h-6 text-primary" /> Verified Hub</CardTitle></CardHeader>
                    <CardContent className="p-0 space-y-8">
                      <div className="space-y-1"><p className="text-4xl font-black text-primary">3.5K+</p><p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Curated Items</p></div>
                      <div className="space-y-1"><p className="text-4xl font-black text-secondary">82%</p><p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Board Readiness</p></div>
                      <div className="space-y-1"><p className="text-4xl font-black text-blue-400">100%</p><p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Free Access</p></div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function LetsPrepApp() { return <Suspense fallback={null}><LetsPrepContent /></Suspense>; }
