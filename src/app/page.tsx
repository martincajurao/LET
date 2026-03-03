
'use client'

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react';
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  QrCode,
  FlaskConical,
  Award,
  Unlock,
  BrainCircuit
} from "lucide-react";
import QRCode from 'qrcode';
import { ExamInterface } from "@/components/exam/ExamInterface";
import { QuickFireInterface } from "@/components/exam/QuickFireInterface";
import { ResultsOverview } from "@/components/exam/ResultsOverview";
import { QuickFireResults } from "@/components/exam/QuickFireResults";
import { ResultUnlockDialog } from "@/components/exam/ResultUnlockDialog";
import { Question } from "@/app/lib/mock-data";
import { useUser, useFirestore } from "@/firebase";
import { collection, addDoc, doc, onSnapshot, updateDoc, increment, serverTimestamp, query, where, limit, arrayUnion } from "firebase/firestore";
import { fetchQuestionsFromFirestore } from "@/lib/db-seed";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getRankData, isTrackUnlocked, XP_REWARDS, COOLDOWNS, UNLOCK_RANKS, DAILY_AD_LIMIT, MIN_QUICK_FIRE_TIME, getCareerRankTitle } from '@/lib/xp-system';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18 1-.78 1.85-1.63 2.42v2.01h2.64c1.54-1.42 2.43-3.5 2.43-5.44z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.33C3.99 20.15 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.67H2.18C1.43 9.24 1 10.57 1 12s.43 2.76 1.18 4.33l3.66-2.24z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.85 2.18 7.67l3.66 2.33c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

type AppState = 'dashboard' | 'exam' | 'quickfire_quiz' | 'results' | 'quickfire_results' | 'onboarding';

const GITHUB_APK_URL = "https://github.com/martincajurao/LET/releases/download/V2.1.0/let.apk";

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const EducationalLoader = ({ message }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center gap-8 animate-in fade-in duration-1000">
    <div className="relative">
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }} 
        className="w-32 h-32 border-2 border-dashed border-primary/20 rounded-full absolute -inset-4" 
      />
      <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center relative z-10 shadow-2xl shadow-primary/10 overflow-hidden">
        <motion.div 
          animate={{ y: [0, -6, 0], rotate: [0, 3, -3, 0] }} 
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <GraduationCap className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    </div>
    {message && (
      <div className="space-y-2 text-center">
        <p className="font-black text-xl tracking-tight text-foreground uppercase tracking-widest">{message}</p>
        <div className="flex items-center justify-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
        </div>
      </div>
    )}
  </div>
);

function LetsPrepContent() {
  const { user, loading: authLoading, loginWithGoogle, loginWithFacebook, bypassLogin, refreshUser, updateProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [state, setState] = useState<AppState>('dashboard');
  const [activeSimCategory, setActiveSimCategory] = useState<string | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examTime, setExamTime] = useState(0);
  const [lastXpEarned, setLastXpEarned] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [showResultUnlock, setShowResultUnlock] = useState(false);
  const [isResultsUnlocked, setIsResultsUnlocked] = useState(false);
  const [examStatsForUnlock, setExamStatsForUnlock] = useState({ 
    questionsCount: 0, 
    correctAnswers: 0, 
    timeSpent: 0 
  });

  const [lockedTrackInfo, setLockedTrackInfo] = useState<any>(null);
  const [isUnlockingEarly, setIsUnlockingEarly] = useState(false);
  
  const [timePerQuestion, setTimePerQuestion] = useState(60);
  const [limits, setLimits] = useState({ limitGenEd: 10, limitProfEd: 10, limitSpec: 10 });

  const [userRank, setUserRank] = useState<string | number>('---');
  
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);
  const isStartingRef = useRef(false);
  const lastConsumedParam = useRef<string | null>(null);
  
  const [newResultId, setNewResultId] = useState<string | undefined>(undefined);
  const [apkInfo, setApkInfo] = useState<{ version: string; downloadUrl: string } | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isApkLoading, setIsApkLoading] = useState(true);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const rankData = useMemo(() => user ? getRankData(user.xp || 0) : null, [user?.xp]);

  const getTrackConfig = (category: string, major: string) => {
    switch (category) {
      case 'all': return { id: 'all', name: 'Full Simulation', reqRank: UNLOCK_RANKS.FULL_SIMULATION, cost: 120, icon: <Zap className="w-6 h-6 text-primary" /> };
      case 'General Education': return { id: 'General Education', name: 'General Education', reqRank: UNLOCK_RANKS.GENERAL_ED, cost: 0, icon: <Languages className="w-6 h-6 text-blue-500" /> };
      case 'Professional Education': return { id: 'Professional Education', name: 'Professional Education', reqRank: UNLOCK_RANKS.PROFESSIONAL_ED, cost: 30, icon: <BookOpen className="w-6 h-6 text-purple-500" /> };
      case 'Specialization': case 'Major': return { id: 'Specialization', name: major || 'Specialization', reqRank: UNLOCK_RANKS.SPECIALIZATION, cost: 60, icon: <Star className="w-6 h-6 text-emerald-500" /> };
      default: return null;
    }
  };

  const startExam = useCallback(async (category: string) => {
    if (!user) { setShowAuthModal(true); return; }
    if (!firestore || isStartingRef.current) return;

    if (category === 'quickfire') {
      const now = Date.now();
      const lastQf = Number(user.lastQuickFireTimestamp) || 0;
      if (lastQf + COOLDOWNS.QUICK_FIRE > now) {
        toast({ variant: "destructive", title: "Brain Teaser Locked", description: "This tactical quiz is still calibrating. Please return later." });
        return;
      }
    }

    const isLocked = !isTrackUnlocked(rankData?.rank || 1, category, user.unlockedTracks);
    if (isLocked && category !== 'quickfire') {
      const modeConfig = getTrackConfig(category, user?.majorship || 'Major');
      setLockedTrackInfo(modeConfig);
      return;
    }

    isStartingRef.current = true;
    setIsCalibrating(true);
    setLoadingMessage("Synchronizing Simulation...");
    
    try {
      const questionPool = await fetchQuestionsFromFirestore(firestore);
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
        const remaining = questionPool.filter(q => !selection.some(s => s.id === q.id));
        finalQuestions = shuffleArray([...selection, ...shuffleArray(remaining).slice(0, 5 - selection.length)]);
      } else {
        const target = category === 'Major' || category === 'Specialization' ? 'Specialization' : category;
        const pool = questionPool.filter(q => {
          if (target === 'Specialization') return q.subject === 'Specialization' && q.subCategory === (user?.majorship || 'English');
          return q.subject === target;
        });
        const targetLimit = target === 'General Education' ? limits.limitGenEd : target === 'Professional Education' ? limits.limitProfEd : limits.limitSpec;
        finalQuestions = shuffleArray(pool).slice(0, targetLimit);
      }
      
      if (finalQuestions.length === 0) throw new Error(`Insufficient exam items.`);
      
      setCurrentQuestions(finalQuestions);
      setActiveSimCategory(category);
      setIsResultsUnlocked(false);
      
      // Clear URL param quietly to prevent loop/reset
      const url = new URL(window.location.href);
      url.searchParams.delete('start');
      window.history.replaceState({}, '', url.toString());
      
      // Direct state transition
      setState(category === 'quickfire' ? 'quickfire_quiz' : 'exam'); 
      setIsCalibrating(false); 
      isStartingRef.current = false;
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Activation Failed", description: e.message }); 
      setIsCalibrating(false); 
      isStartingRef.current = false;
    }
  }, [user, firestore, limits, toast, rankData]);

  // Consuming start param once per mount/session change
  useEffect(() => {
    const start = searchParams.get('start');
    if (start && user && state === 'dashboard' && start !== lastConsumedParam.current) {
      lastConsumedParam.current = start;
      startExam(start);
    }
  }, [searchParams, user, state, startExam]);

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
          if (apkAsset) { downloadUrl = apkAsset.browser_download_url; version = data.tag_name.replace(/^V/, ''); }
        }
        setApkInfo({ version, downloadUrl });
        const qr = await QRCode.toDataURL(downloadUrl, { width: 256, margin: 2, color: { dark: '#10b981', light: '#ffffff' } });
        setQrCodeUrl(qr);
      } catch (e) { setApkInfo({ version: "2.1.0", downloadUrl: GITHUB_APK_URL }); } finally { setIsApkLoading(false); }
    };
    fetchLatestApk();
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => { if (window.scrollY <= 10) { pullStartY.current = e.touches[0].clientY; setIsPulling(true); } };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || pullStartY.current === null) return;
    const diff = e.touches[0].clientY - pullStartY.current;
    if (diff > 0) { setPullDistance(Math.min(diff * 0.5, 100)); if (diff > 10) e.preventDefault(); }
  };
  const handleTouchEnd = async () => {
    if (pullDistance > 50 && !isRefreshing) {
      setIsRefreshing(true);
      try { await refreshUser(); toast({ title: "Synchronized", description: "Latest teacher data loaded." }); } 
      catch (e) { toast({ variant: "destructive", title: "Sync Failed", description: "Could not refresh profile." }); } 
      finally { setIsRefreshing(false); setIsPulling(false); setPullDistance(0); }
    } else { setPullDistance(0); setIsPulling(false); }
    pullStartY.current = null;
  };

  const handleExamComplete = async (answers: Record<string, string>, timeSpent: number, confidentAnswers?: Record<string, boolean>) => {
    if (!user || !firestore) return;
    const isQuickFireMode = activeSimCategory === 'quickfire';
    const now = Date.now();
    if (isQuickFireMode && timeSpent < MIN_QUICK_FIRE_TIME) { toast({ variant: "destructive", title: "Exam Incomplete", description: "Engagement too rapid for reward calibration." }); setState('dashboard'); return; }
    setExamAnswers(answers); setExamTime(timeSpent); setIsCalibrating(true); setLoadingMessage("Synchronizing Exam...");
    const results = currentQuestions.map(q => {
      const isCorrect = answers[q.id] === q.correctAnswer;
      const isConfident = confidentAnswers ? (confidentAnswers[q.id] || false) : false;
      return { ...q, questionId: q.id, userAnswer: answers[q.id], isCorrect, isConfident };
    });
    const correctCount = results.filter(h => h.isCorrect).length;
    const overallScore = Math.round((correctCount / (currentQuestions.length || 1)) * 100);
    let xpEarned = correctCount * XP_REWARDS.CORRECT_ANSWER;
    results.forEach(r => { if (r.isConfident) { if (r.isCorrect) xpEarned += XP_REWARDS.CONFIDENT_CORRECT_BONUS; else xpEarned += XP_REWARDS.CONFIDENT_WRONG_PENALTY; } });
    if (isQuickFireMode) xpEarned += Math.round((correctCount / 5) * XP_REWARDS.QUICK_FIRE_COMPLETE); else xpEarned += (currentQuestions.length >= 50 ? XP_REWARDS.FINISH_FULL_SIM : XP_REWARDS.FINISH_TRACK);
    setLastXpEarned(xpEarned);
    try {
      if (!user.uid.startsWith('bypass')) {
        const docRef = await addDoc(collection(firestore, "exam_results"), { 
          userId: user.uid, 
          displayName: user.displayName || 'Guest Teacher', 
          timestamp: now, 
          overallScore, 
          timeSpent, 
          xpEarned, 
          results, 
          lastActiveDate: serverTimestamp(),
          subject: activeSimCategory,
          locationCity: user.locationCity || 'International',
          locationRegion: user.locationRegion || 'Global'
        });
        setNewResultId(docRef.id);
        const updatePayload: any = { dailyQuestionsAnswered: increment(currentQuestions.length), dailyTestsFinished: increment(!isQuickFireMode ? 1 : 0), xp: increment(xpEarned), lastActiveDate: serverTimestamp() };
        if (isQuickFireMode) updatePayload.lastQuickFireTimestamp = now;
        await updateDoc(doc(firestore, 'users', user.uid), updatePayload);
      }
      await refreshUser();
    } finally {
      setIsCalibrating(false);
      if (isQuickFireMode) setState('quickfire_results');
      else { 
        setState('results'); 
        if (user && !user.isPro) { 
          setIsResultsUnlocked(false); 
          setExamStatsForUnlock({ questionsCount: currentQuestions.length, correctAnswers: correctCount, timeSpent: timeSpent }); 
          setShowResultUnlock(true); 
        } else {
          setIsResultsUnlocked(true); 
        }
      }
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

  if (authLoading) return <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background"><EducationalLoader message="Synchronizing Teacher Session" /></div>;

  const displayStats = user ? [
    { icon: <Sparkles className="w-4 h-4 text-yellow-500 animate-sparkle" />, label: 'Credits', value: user.credits || 0, color: 'text-yellow-500 bg-yellow-500/10' },
    { icon: <Trophy className="w-4 h-4 text-primary" />, label: 'Arena', value: userRank || '---', color: 'text-primary bg-primary/10' },
    { icon: <ShieldCheck className="w-4 h-4 text-blue-500" />, label: 'Tier', value: user.isPro ? 'Platinum' : 'FREE', color: user.isPro ? 'text-yellow-600 bg-yellow-500/10' : 'text-blue-500 bg-blue-500/10' },
    { icon: <Flame className="w-4 h-4 text-orange-500 fill-current animate-pulse" />, label: 'Streak', value: user.streakCount || 0, color: 'text-orange-500 bg-orange-500/10' }
  ] : [
    { icon: <Users className="w-4 h-4 text-blue-500" />, label: 'Community', value: '1.7K+', color: 'text-blue-500 bg-blue-500/5' },
    { icon: <Sparkles className="w-4 h-4 text-purple-500 animate-sparkle" />, label: 'AI Solved', value: '8.2K+', color: 'text-purple-500 bg-purple-500/5' },
    { icon: <Star className="w-4 h-4 text-pink-500" />, label: 'Items', value: '3.5K+', color: 'text-pink-500 bg-pink-500/5' },
    { icon: <Trophy className="w-4 h-4 text-yellow-500" />, label: 'Readiness', value: '82%', color: 'text-yellow-500 bg-yellow-500/5' }
  ];

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 12 } } };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background text-foreground font-body" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined }}>
      <Toaster />
      <AnimatePresence>{isCalibrating && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[5100] flex items-center justify-center bg-background/80 backdrop-blur-md"><EducationalLoader message={loadingMessage} /></motion.div>)}</AnimatePresence>

      <AnimatePresence mode="wait">
        {state === 'exam' ? (
          <motion.div key="exam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <ExamInterface questions={currentQuestions} timePerQuestion={timePerQuestion} onComplete={handleExamComplete} />
          </motion.div>
        ) : state === 'quickfire_quiz' ? (
          <motion.div key="quickfire_quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <QuickFireInterface questions={currentQuestions} onComplete={(ans, time) => handleExamComplete(ans, time)} onExit={() => setState('dashboard')} />
          </motion.div>
        ) : state === 'results' ? (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4">
            <ResultsOverview questions={currentQuestions} answers={examAnswers} timeSpent={examTime} resultId={newResultId} onRestart={() => setState('dashboard')} initialUnlocked={isResultsUnlocked} />
          </motion.div>
        ) : state === 'quickfire_results' ? (
          <motion.div key="quickfire_results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4">
            <QuickFireResults questions={currentQuestions} answers={examAnswers} timeSpent={examTime} xpEarned={lastXpEarned} onRestart={() => setState('dashboard')} />
          </motion.div>
        ) : (
          <motion.div key="dashboard" variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto px-4 pb-8 space-y-6 pt-4">
            <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {displayStats.map((stat, i) => (
                <motion.div key={i} variants={itemVariants} whileTap={{ scale: 0.95 }} className="android-surface rounded-2xl p-4 flex items-center gap-4 border-none shadow-md3-1">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner", stat.color)}>{stat.icon}</div>
                  <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">{stat.label}</p><p className="text-xl font-black text-foreground leading-none">{stat.value}</p></div>
                </motion.div>
              ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <motion.div variants={itemVariants} whileHover={{ y: -4 }}>
                  <Card className="overflow-hidden border-none shadow-2xl rounded-[3rem] bg-gradient-to-br from-primary/30 via-card to-background p-8 md:p-14 relative group active:scale-[0.99] transition-all">
                    <div className="relative z-10 space-y-8">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-black text-[10px] uppercase px-4 py-1.5 bg-primary/20 text-primary border-none rounded-lg shadow-sm">Protocol: Board Simulator</Badge>
                        {user && (
                          <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm px-3 py-1 rounded-lg border border-primary/20">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={user.photoURL || ""} />
                              <AvatarFallback className="bg-primary/10 text-primary text-[8px] font-black">🎓</AvatarFallback>
                            </Avatar>
                            <span className="text-[9px] font-black uppercase text-primary tracking-widest">Rank {rankData?.rank}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95] text-foreground">Prepare for the <br /><span className="text-primary italic">Board Exam.</span></h1>
                        <p className="text-muted-foreground font-medium text-lg md:text-2xl max-w-xl leading-relaxed">High-fidelity situational simulations with AI analysis built for aspiring Filipino teachers.</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        {user ? (
                          <div className="space-y-6 w-full sm:w-auto">
                            <button disabled={isCalibrating} onClick={() => startExam('all')} className="h-16 md:h-20 px-10 md:px-14 rounded-2xl font-black text-lg md:text-xl gap-4 shadow-2xl shadow-primary/40 active:scale-95 transition-all group relative overflow-hidden bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center">
                              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                              {isCalibrating ? <Loader2 className="animate-spin w-7 h-7" /> : <Zap className="w-7 h-7 fill-current" />} 
                              <span>Launch Full Exam</span> 
                              <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                            </button>
                            
                            {rankData && (
                              <div className="flex flex-col gap-2 bg-card/50 backdrop-blur-md p-4 rounded-2xl border border-border/50 shadow-sm min-w-[280px]">
                                <div className="flex items-center justify-between text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                                  <span className="flex items-center gap-1.5"><Award className="w-3 h-3 text-primary" /> Next: {getCareerRankTitle(rankData.rank + 1)}</span>
                                  <span className="text-primary">{Math.round(rankData.progress)}% XP</span>
                                </div>
                                <Progress value={rankData.progress} className="h-1.5 rounded-full" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <motion.div className="w-full sm:w-fit" animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                            <button 
                              onClick={() => setShowAuthModal(true)} 
                              className="w-full h-16 md:h-20 px-8 md:px-12 rounded-[1.75rem] font-black text-lg md:text-xl gap-6 shadow-xl shadow-primary/30 bg-primary text-primary-foreground hover:bg-primary/95 active:scale-[0.97] transition-all group relative overflow-hidden flex items-center justify-center"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                              <div className="flex items-center gap-4 relative z-10">
                                <span>Sign In with</span>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg border border-white/20"><GoogleIcon /></div>
                                  <div className="w-10 h-10 bg-[#1877F2] rounded-xl flex items-center justify-center shadow-lg border border-white/20"><Facebook className="w-6 h-6 fill-current" /></div>
                                </div>
                              </div>
                              <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300 relative z-10" />
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </div>
                    <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05], rotate: [0, 5, 0] }} transition={{ duration: 15, repeat: Infinity }} className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />
                  </Card>
                </motion.div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between px-4">
                    <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shadow-inner"><Target className="w-5 h-5 text-primary" /></div>
                      Training Zones
                    </h3>
                    <Badge variant="outline" className="font-black text-[9px] uppercase tracking-[0.2em] text-muted-foreground opacity-60">Professional Tracks</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-1">
                    {[
                      { id: 'General Education', name: 'Gen Ed', icon: <Languages />, rnk: UNLOCK_RANKS.GENERAL_ED, bg: 'from-blue-500/10' },
                      { id: 'Professional Education', name: 'Prof Ed', icon: <BookOpen />, rnk: UNLOCK_RANKS.PROFESSIONAL_ED, bg: 'from-purple-500/10' },
                      { id: 'Specialization', name: user?.majorship || 'Major', icon: <Star />, rnk: UNLOCK_RANKS.SPECIALIZATION, bg: 'from-emerald-500/10' }
                    ].map((track, i) => {
                      const isLocked = user && !isTrackUnlocked(rankData?.rank || 1, track.id, user.unlockedTracks);
                      return (
                        <motion.div key={i} variants={itemVariants} whileTap={{ scale: 0.97 }}>
                          <Card onClick={() => startExam(track.id)} className={cn("cursor-pointer border-2 rounded-[2.5rem] bg-card overflow-hidden active:scale-95 transition-all relative h-full group hover:shadow-2xl", isLocked ? "border-muted/50 bg-muted/5 opacity-80" : "hover:border-primary border-border/50 bg-gradient-to-br via-card to-card " + track.bg)}>
                            <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                              <div className={cn("relative transition-transform duration-500", !isLocked && "group-hover:scale-110")}>
                                <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-inner transition-colors", isLocked ? "bg-muted/50 text-muted-foreground" : "bg-card text-foreground")}>{track.icon}</div>
                                {isLocked && <div className="absolute -top-2 -right-2 w-8 h-8 bg-card border-2 border-muted rounded-full flex items-center justify-center shadow-md"><Lock className="w-3.5 h-3.5 text-muted-foreground" /></div>}
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-black text-xl text-foreground leading-none">{track.name}</h4>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{isLocked ? `Unlock: Rank ${track.rnk}` : "Accessible"}</p>
                              </div>
                              {!isLocked && <ChevronRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="text-xl font-black tracking-tight flex items-center gap-3 px-4">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center shadow-inner"><Users className="w-5 h-5 text-emerald-600" /></div>
                    Intelligence Lounge
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1">
                    <motion.div variants={itemVariants} whileTap={{ scale: 0.98 }}>
                      <Card onClick={() => setShowFeedbackModal(true)} className="android-surface cursor-pointer rounded-[2.25rem] p-6 flex items-center gap-5 border-none shadow-md3-1 bg-card group">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500"><MessageSquare className="w-7 h-7" /></div>
                        <div><h4 className="font-black text-lg">Send Feedback</h4><p className="text-[10px] font-bold text-muted-foreground uppercase">Refine simulations</p></div>
                      </Card>
                    </motion.div>
                    <motion.div variants={itemVariants} whileTap={{ scale: 0.98 }}>
                      <Card onClick={() => window.location.href = 'mailto:support@letprep.app'} className="android-surface cursor-pointer rounded-[2.25rem] p-6 flex items-center gap-5 border-none shadow-md3-1 bg-card group">
                        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500"><Mail className="w-7 h-7 text-emerald-600 group-hover:text-white transition-all duration-500" /></div>
                        <div><h4 className="font-black text-lg">Contact Us</h4><p className="text-[10px] font-bold text-muted-foreground uppercase">System support</p></div>
                      </Card>
                    </motion.div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <motion.div variants={itemVariants}>
                  <Card className="android-surface border-none shadow-2xl rounded-[2.5rem] bg-gradient-to-br from-emerald-500/20 via-card to-background p-8 overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700"><Smartphone className="w-24 h-24 text-emerald-600" /></div>
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center shadow-inner"><Download className="w-7 h-7 text-emerald-600" /></div>
                        <Badge variant="outline" className="font-black text-[9px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5 uppercase">{isApkLoading ? '---' : `v${apkInfo?.version}`}</Badge>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-black tracking-tight leading-none">Native Client</h3>
                        <p className="text-xs font-medium opacity-60 leading-relaxed">High-fidelity Android wrapper for professional offline preparation.</p>
                      </div>
                      <div className="flex flex-col items-center justify-center p-6 bg-card rounded-3xl border-2 border-dashed border-emerald-500/20 relative min-h-[180px] shadow-inner">
                        <AnimatePresence mode="wait">
                          {isApkLoading ? (
                            <motion.div key="apk-loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
                              <Loader2 className="animate-spin text-emerald-500 w-8 h-8" /><span className="text-[8px] font-black uppercase text-emerald-600/60 tracking-[0.3em]">Syncing Binary...</span>
                            </motion.div>
                          ) : qrCodeUrl ? (
                            <motion.div key="apk-qr" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4 flex flex-col items-center">
                              <div className="w-32 h-32 bg-white p-1.5 rounded-2xl shadow-xl border-4 border-emerald-50 overflow-hidden"><img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" /></div>
                              <p className="text-[9px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-2"><QrCode className="w-3 h-3" /> Scan to Sideload</p>
                            </motion.div>
                          ) : <p className="text-[10px] text-muted-foreground text-center">Unable to generate QR code.</p>}
                        </AnimatePresence>
                      </div>
                      <Button onClick={() => window.location.href = apkInfo?.downloadUrl || GITHUB_APK_URL} disabled={isApkLoading} className="w-full h-16 rounded-[1.75rem] font-black gap-3 bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all text-[10px] uppercase tracking-widest">Direct Install</Button>
                    </div>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card className="border-none shadow-xl rounded-[2.5rem] bg-card p-8 flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner"><BrainCircuit className="w-8 h-8 text-primary" /></div>
                    <div className="space-y-2"><h4 className="text-xl font-black">Strategic Core</h4><p className="text-xs text-muted-foreground font-medium px-4">Over 3.5K+ curated items analyzed by professional pedagogical engines.</p></div>
                    <div className="w-full grid grid-cols-2 gap-3 pt-2">
                      <div className="p-4 bg-muted/30 rounded-2xl border border-border/50"><p className="text-2xl font-black text-primary leading-none">82%</p><p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1">Readiness</p></div>
                      <div className="p-4 bg-muted/30 rounded-2xl border border-border/50"><p className="text-2xl font-black text-emerald-600 leading-none">100%</p><p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1">Access</p></div>
                    </div>
                  </Card>
                </motion.div>
              </div>
            </div>

            <motion.div variants={itemVariants} className="pt-8 text-center pb-12">
              <div className="flex items-center justify-center gap-3 mb-4"><div className="h-[1px] w-16 bg-border" /><motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}><Heart className="w-5 h-5 text-rose-500 fill-current" /></motion.div><div className="h-[1px] w-16 bg-border" /></div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-40">Dedicated to the Aspiring Filipino Teacher</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-w-sm outline-none overflow-hidden">
          <div className="bg-emerald-500/10 p-10 flex flex-col items-center text-center"><div className="w-20 h-20 bg-card rounded-[2rem] flex items-center justify-center shadow-xl mb-4 border-2 border-emerald-500/20"><ShieldCheck className="w-10 h-10 text-emerald-500" /></div><DialogTitle className="text-2xl font-black tracking-tight">Verified Access</DialogTitle><p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">Credentials Required</p></div>
          <div className="p-8 space-y-4">
            <Button onClick={async () => { await loginWithGoogle(); setShowAuthModal(false); }} className="w-full h-14 rounded-2xl font-black gap-3 bg-white text-black border border-border shadow-md hover:bg-muted active:scale-95 transition-all"><GoogleIcon /> Continue with Google</Button>
            <Button onClick={async () => { await loginWithFacebook(); setShowAuthModal(false); }} className="w-full h-14 rounded-2xl font-black gap-3 bg-[#1877F2] text-white shadow-md hover:bg-[#1877F2]/90 active:scale-95 transition-all"><Facebook className="w-5 h-5 fill-current" /> Continue with Facebook</Button>
            <div className="pt-4 border-t border-border/50"><Button variant="ghost" onClick={async () => { await bypassLogin(); setShowAuthModal(false); }} className="w-full h-12 rounded-xl font-bold text-xs gap-2 text-muted-foreground hover:bg-muted active:scale-95 transition-all"><FlaskConical className="w-4 h-4" /> Launch Test Environment</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-md outline-none overflow-hidden">
          <div className="bg-primary/10 p-10 flex flex-col items-center justify-center text-center"><div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center shadow-lg mb-4"><MessageSquare className="w-8 h-8 text-primary" /></div><DialogTitle className="text-2xl font-black">Feedback Vault</DialogTitle></div>
          <div className="p-8 space-y-6">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Your Suggestions</Label><Textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Improve the exam experience..." className="rounded-2xl min-h-[120px] border-2 p-4 text-sm font-medium resize-none focus:border-primary transition-all" /></div>
            <DialogFooter className="sm:flex-col gap-3"><Button onClick={handleFeedbackSubmit} disabled={isSubmittingFeedback || !feedbackText.trim()} className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-xl shadow-primary/30 active:scale-95 transition-all">{isSubmittingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Transmit Insight</Button><Button variant="ghost" onClick={() => setShowFeedbackModal(false)} className="w-full font-bold text-muted-foreground">Discard</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ResultUnlockDialog open={showResultUnlock} onClose={() => { if (isResultsUnlocked) setShowResultUnlock(false); }} onUnlock={() => { setIsResultsUnlocked(true); setShowResultUnlock(false); }} questionsCount={examStatsForUnlock.questionsCount} correctAnswers={examStatsForUnlock.correctAnswers} timeSpent={examStatsForUnlock.timeSpent} />
      
      <Dialog open={!!lockedTrackInfo} onOpenChange={(open) => !open && setLockedTrackInfo(null)}>
        <DialogContent className="rounded-[3rem] bg-card border-none shadow-2xl p-0 max-w-[380px] overflow-hidden outline-none">
          <div className="bg-primary/10 p-12 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-24 h-24 bg-card rounded-[2.5rem] flex items-center justify-center shadow-2xl relative z-10 border-2 border-primary/20">
              {lockedTrackInfo?.icon}
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center border-4 border-card shadow-lg">
                <Lock className="w-4 h-4 text-primary-foreground" />
              </div>
            </motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent z-0" />
          </div>
          <div className="p-8 text-center space-y-8">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Sector Restricted</span>
              <DialogTitle className="text-3xl font-black tracking-tighter text-foreground">{lockedTrackInfo?.name}</DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium text-sm leading-relaxed px-2">
                This sector requires <span className="text-foreground font-black">Rank {lockedTrackInfo?.reqRank}</span> ({getCareerRankTitle(lockedTrackInfo?.reqRank)}). Complete other exams to ascend.
              </DialogDescription>
            </div>
            <div className="grid gap-3">
              <button 
                onClick={async () => { 
                  if (!user || isUnlockingEarly) return; 
                  const cost = lockedTrackInfo.cost; 
                  if ((user.credits || 0) < cost) { 
                    toast({ variant: "destructive", title: "Vault Restricted", description: `Requires ${cost} AI Credits.` }); 
                    return; 
                  } 
                  setIsUnlockingEarly(true); 
                  try { 
                    await updateProfile({ 
                      credits: increment(-cost), 
                      unlockedTracks: arrayUnion(lockedTrackInfo.id) as any 
                    }); 
                    await refreshUser(); 
                    toast({ variant: "reward", title: "Sector Unlocked!", description: `${lockedTrackInfo.name} is now accessible.` }); 
                    setLockedTrackInfo(null); 
                  } finally { 
                    setIsUnlockingEarly(false); 
                  } 
                }} 
                disabled={isUnlockingEarly} 
                className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-widest gap-3 shadow-xl bg-primary text-primary-foreground active:scale-95 transition-all flex items-center justify-center"
              >
                {isUnlockingEarly ? <Loader2 className="w-5 h-5 animate-spin" /> : <Unlock className="w-5 h-5" />} 
                {isUnlockingEarly ? "UNLOCKING..." : `Unlock Early (${lockedTrackInfo?.cost}c)`}
              </button>
              <Button variant="ghost" onClick={() => setLockedTrackInfo(null)} className="w-full h-12 rounded-xl font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Return to Ground</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export default function LetsPrepApp() { return <Suspense fallback={null}><LetsPrepContent /></Suspense>; }
