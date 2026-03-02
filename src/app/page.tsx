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
  QrCode,
  AlertCircle,
  FlaskConical,
  TrendingUp,
  BrainCircuit
} from "lucide-react";
import QRCode from 'qrcode';
import { ExamInterface } from "@/components/exam/ExamInterface";
import { ResultsOverview } from "@/components/exam/ResultsOverview";
import { QuickFireResults } from "@/components/exam/QuickFireResults";
import { Question } from "@/app/lib/mock-data";
import { useUser, useFirestore } from "@/firebase";
import { collection, addDoc, doc, onSnapshot, updateDoc, increment, serverTimestamp, query, where, limit } from "firebase/firestore";
import { fetchQuestionsFromFirestore } from "@/lib/db-seed";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getRankData, isTrackUnlocked, XP_REWARDS, COOLDOWNS, UNLOCK_RANKS, DAILY_AD_LIMIT, MIN_QUICK_FIRE_TIME } from '@/lib/xp-system';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18 1-.78 1.85-1.63 2.42v2.01h2.64c1.54-1.42 2.43-3.5 2.43-5.44z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.33C3.99 20.15 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.67H2.18C1.43 9.24 1 10.57 1 12s.43 2.76 1.18 4.33l3.66-2.24z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.85 2.18 7.67l3.66 2.33c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

type AppState = 'dashboard' | 'exam' | 'results' | 'quickfire_results';

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
  const { user, loading: authLoading, loginWithGoogle, loginWithFacebook, bypassLogin, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [state, setState] = useState<AppState>('dashboard');
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examTime, setExamTime] = useState(0);
  const [lastXpEarned, setLastXpEarned] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
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
  const processedParamRef = useRef<string | null>(null);
  
  const [newResultId, setNewResultId] = useState<string | undefined>(undefined);
  const [apkInfo, setApkInfo] = useState<{ version: string; downloadUrl: string } | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isApkLoading, setIsApkLoading] = useState(true);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const startParam = searchParams.get('start');

  const startExam = useCallback(async (category: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    if (!firestore || isStartingRef.current) return;
    isStartingRef.current = true;

    if (category === 'quickfire') {
      const now = Date.now();
      const lastQf = Number(user.lastQuickFireTimestamp) || 0;
      if (lastQf + COOLDOWNS.QUICK_FIRE > now) {
        toast({ variant: "destructive", title: "Access Denied", description: "QuickFire cooldown in effect." });
        isStartingRef.current = false;
        return;
      }
    }

    setIsCalibrating(true);
    setLoadingMessage("Calibrating Learning Path...");
    try {
      const questionPool = await fetchQuestionsFromFirestore(firestore);
      let finalQuestions: Question[] = [];
      
      if (category === 'all') {
        const genEd = shuffleArray(questionPool.filter(q => q.subject === 'General Education')).slice(0, limits.limitGenEd);
        const profEd = shuffleArray(questionPool.filter(q => q.subject === 'Professional Education')).slice(0, limits.limitProfEd);
        const spec = shuffleArray(questionPool.filter(q => q.subject === 'Specialization' && q.subCategory === (user?.majorship || 'English'))).slice(0, limits.limitSpec);
        finalQuestions = [...genEd, ...profEd, ...spec];
      } else if (category === 'quickfire') {
        finalQuestions = shuffleArray(questionPool).slice(0, 5);
      } else {
        const target = category === 'Major' ? 'Specialization' : category;
        const targetLimit = target === 'General Education' ? limits.limitGenEd : target === 'Professional Education' ? limits.limitProfEd : limits.limitSpec;
        finalQuestions = shuffleArray(questionPool.filter(q => q.subject === target)).slice(0, targetLimit);
      }
      
      if (finalQuestions.length === 0) throw new Error(`Insufficient items found.`);
      
      setCurrentQuestions(finalQuestions);
      setTimeout(() => { 
        setState('exam'); 
        setIsCalibrating(false); 
        isStartingRef.current = false;
      }, 300);
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Simulation Failed", description: e.message }); 
      setIsCalibrating(false); 
      isStartingRef.current = false;
    }
  }, [user, firestore, limits, toast]);

  useEffect(() => {
    if (user && startParam && !isCalibrating && state === 'dashboard' && processedParamRef.current !== startParam) {
      processedParamRef.current = startParam;
      startExam(startParam);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [user, startParam, isCalibrating, state, startExam]);

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
        setApkInfo({ version: "2.1.0", downloadUrl: GITHUB_APK_URL });
      } finally {
        setIsApkLoading(false);
      }
    };
    fetchLatestApk();
  }, []);

  useEffect(() => {
    if (!firestore) return;
    const configDocRef = doc(firestore, "system_configs", "global");
    const unsub = onSnapshot(configDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTimePerQuestion(data.timePerQuestion || 60);
        setLimits({ limitGenEd: data.limitGenEd || 10, limitProfEd: data.limitProfEd || 10, limitSpec: data.limitSpec || 10 });
      }
    });
    return () => unsub();
  }, [firestore]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const lastAd = Number(user.lastAdXpTimestamp) || 0;
      const lastQf = Number(user.lastQuickFireTimestamp) || 0;
      setAdCooldown(Math.max(0, lastAd + COOLDOWNS.AD_XP - now));
      setQuickFireCooldown(Math.max(0, lastQf + COOLDOWNS.QUICK_FIRE - now));
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

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

  const handleExamComplete = async (answers: Record<string, string>, timeSpent: number, confidentAnswers: Record<string, boolean>) => {
    if (!user || !firestore) return;
    const isQuickFire = currentQuestions.length <= 5;
    const now = Date.now();

    setExamAnswers(answers);
    setExamTime(timeSpent);
    setIsCalibrating(true);
    setLoadingMessage("Syncing Results...");

    const results = currentQuestions.map(q => {
      const isCorrect = answers[q.id] === q.correctAnswer;
      const isConfident = confidentAnswers[q.id] || false;
      return { ...q, questionId: q.id, userAnswer: answers[q.id], isCorrect, isConfident };
    });
    
    const correctCount = results.filter(h => h.isCorrect).length;
    const overallScore = Math.round((correctCount / (currentQuestions.length || 1)) * 100);
    let xpEarned = correctCount * XP_REWARDS.CORRECT_ANSWER;

    const resultsData = sanitizeData({ userId: user.uid, displayName: user.displayName || 'Guest Educator', timestamp: now, overallScore, timeSpent, xpEarned, results, lastActiveDate: serverTimestamp() });

    try {
      if (!user.uid.startsWith('bypass')) {
        const docRef = await addDoc(collection(firestore, "exam_results"), resultsData);
        setNewResultId(docRef.id);
        const updatePayload: any = { 
          dailyQuestionsAnswered: increment(currentQuestions.length), 
          xp: increment(xpEarned), 
          lastActiveDate: serverTimestamp() 
        };
        if (isQuickFire) updatePayload.lastQuickFireTimestamp = now;
        await updateDoc(doc(firestore, 'users', user.uid), updatePayload);
      }
      await refreshUser();
    } catch (e) {
      console.error("Result sync error:", e);
    } finally {
      setIsCalibrating(false);
      if (isQuickFire) setState('quickfire_results');
      else setState('results');
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim() || !firestore || !user) return;
    setIsSubmittingFeedback(true);
    try {
      if (!user.uid.startsWith('bypass')) {
        await addDoc(collection(firestore, 'feedback'), {
          userId: user.uid,
          userName: user.displayName,
          text: feedbackText,
          timestamp: serverTimestamp()
        });
      }
      toast({ variant: "reward", title: "Trace Recorded!", description: "Feedback saved." });
      setFeedbackText("");
      setShowFeedbackModal(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Feedback error." });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (authLoading) return <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background"><EducationalLoader message="Synchronizing Session" /></div>;

  const currentRankData = user ? getRankData(user.xp || 0) : null;
  const displayStats = user ? [
    { icon: <Sparkles className="w-4 h-4 text-yellow-500 animate-sparkle" />, label: 'Credits', value: user.credits || 0, color: 'text-yellow-500 bg-yellow-500/10' },
    { icon: <Trophy className="w-4 h-4 text-primary" />, label: 'Arena', value: userRank, color: 'text-primary bg-primary/10' },
    { icon: user.isPro ? <Crown className="w-4 h-4 text-yellow-600 fill-current" /> : <Shield className="w-4 h-4 text-blue-500" />, label: 'Tier', value: user.isPro ? 'Platinum' : 'FREE', color: 'text-blue-500 bg-blue-500/10' },
    { icon: <Flame className="w-4 h-4 text-orange-500 fill-current animate-pulse" />, label: 'Streak', value: user.streakCount || 0, color: 'text-orange-500 bg-orange-500/10' }
  ] : [
    { icon: <Users className="w-4 h-4 text-blue-500" />, label: 'Community', value: '1.7K+', color: 'text-blue-500 bg-blue-500/5' },
    { icon: <Sparkles className="w-4 h-4 text-purple-500 animate-sparkle" />, label: 'AI Solved', value: '8.2K+', color: 'text-purple-500 bg-purple-500/5' },
    { icon: <Star className="w-4 h-4 text-pink-500" />, label: 'Items', value: '3.5K+', color: 'text-pink-500 bg-pink-500/5' },
    { icon: <Trophy className="w-4 h-4 text-yellow-500" />, label: 'Readiness', value: '82%', color: 'text-yellow-500 bg-yellow-500/5' }
  ];

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { 
    hidden: { opacity: 0, y: 20, scale: 0.95 }, 
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring", stiffness: 100, damping: 12 }
    } 
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background text-foreground font-body" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined }}>
      <Toaster />
      
      <AnimatePresence>
        {isCalibrating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1500] flex items-center justify-center bg-background/80 backdrop-blur-md"
          >
            <EducationalLoader message={loadingMessage} />
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-w-sm outline-none overflow-hidden">
          <div className="bg-emerald-500/10 p-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-card rounded-[2rem] flex items-center justify-center shadow-xl mb-4 border-2 border-emerald-500/20">
              <ShieldCheck className="w-10 h-10 text-emerald-500" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">Verified Access</DialogTitle>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">Credentials Required</p>
          </div>
          <div className="p-8 space-y-4">
            <Button onClick={async () => { await loginWithGoogle(); setShowAuthModal(false); }} className="w-full h-14 rounded-2xl font-black gap-3 bg-white text-black border border-border shadow-md hover:bg-muted active:scale-95 transition-all"><GoogleIcon /> Continue with Google</Button>
            <Button onClick={async () => { await loginWithFacebook(); setShowAuthModal(false); }} className="w-full h-14 rounded-2xl font-black gap-3 bg-[#1877F2] text-white shadow-md hover:bg-[#1877F2]/90 active:scale-95 transition-all"><Facebook className="w-5 h-5 fill-current" /> Continue with Facebook</Button>
            
            <div className="pt-4 border-t border-border/50">
              <Button 
                variant="ghost" 
                onClick={async () => { await bypassLogin(); setShowAuthModal(false); }} 
                className="w-full h-12 rounded-xl font-bold text-xs gap-2 text-muted-foreground hover:bg-muted active:scale-95 transition-all"
              >
                <FlaskConical className="w-4 h-4" />
                Launch Test Environment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-md outline-none overflow-hidden">
          <div className="bg-primary/10 p-10 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center shadow-lg mb-4"><MessageSquare className="w-8 h-8 text-primary" /></div>
            <DialogTitle className="text-2xl font-black">Feedback Vault</DialogTitle>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Your Suggestions</Label>
              <Textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Improve the simulation..." className="rounded-2xl min-h-[120px] border-2 p-4 text-sm font-medium resize-none focus:border-primary transition-all" />
            </div>
            <DialogFooter className="sm:flex-col gap-3">
              <Button onClick={handleFeedbackSubmit} disabled={isSubmittingFeedback || !feedbackText.trim()} className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-xl shadow-primary/30 active:scale-95 transition-all">
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
          <motion.div key="dashboard" variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto px-4 pt-4 pb-8 space-y-6 pt-safe">
            <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {displayStats.map((stat, i) => (
                <motion.div 
                  key={i} 
                  variants={itemVariants} 
                  whileTap={{ scale: 0.95 }}
                  className="android-surface rounded-2xl p-4 flex items-center gap-4 border-none shadow-md3-1"
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner", stat.color)}>{stat.icon}</div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">{stat.label}</p>
                    <p className="text-xl font-black text-foreground leading-none">{stat.value}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <motion.div variants={itemVariants} whileHover={{ y: -4 }}>
                  <Card className="overflow-hidden border-none shadow-2xl rounded-[3rem] bg-gradient-to-br from-primary/30 via-card to-background p-8 md:p-14 relative group">
                    <div className="relative z-10 space-y-8">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-black text-[10px] uppercase px-4 py-1.5 bg-primary/20 text-primary border-none rounded-lg shadow-sm">Verified Learning Path</Badge>
                        <Badge variant="outline" className="font-black text-[10px] uppercase px-3 py-1 bg-white/10 text-primary-foreground border-primary/20 mix-blend-difference">Alpha v2.1</Badge>
                      </div>
                      <div className="space-y-4">
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95] text-foreground">
                          Elite Board <br /><span className="text-primary italic">Simulations.</span>
                        </h1>
                        <p className="text-muted-foreground font-medium text-lg md:text-2xl max-w-xl leading-relaxed">
                          Sharpen your professional reasoning with AI-driven analysis built for the Filipino educator.
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 pt-2">
                        {user ? (
                          <Button 
                            size="lg" 
                            disabled={isCalibrating} 
                            onClick={() => startExam('all')} 
                            className="h-16 md:h-20 px-10 md:px-14 rounded-2xl font-black text-lg md:text-xl gap-4 shadow-2xl shadow-primary/40 active:scale-95 transition-all group relative overflow-hidden bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            {isCalibrating ? <Loader2 className="animate-spin w-7 h-7" /> : <Zap className="w-7 h-7 fill-current" />} 
                            <span>Launch Full Battle</span> 
                            <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                          </Button>
                        ) : (
                          <motion.div 
                            className="w-full sm:w-fit"
                            animate={{ scale: [1, 1.02, 1] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          >
                            <Button 
                              size="lg" 
                              onClick={() => setShowAuthModal(true)} 
                              className="w-full h-16 md:h-20 px-10 md:px-14 rounded-3xl font-black text-xl gap-6 shadow-2xl shadow-primary/40 bg-primary text-primary-foreground hover:bg-primary/90 transition-all group relative overflow-hidden"
                            >
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
                    </div>
                    {/* Background Visual Juice */}
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [0.05, 0.1, 0.05],
                        rotate: [0, 10, 0]
                      }} 
                      transition={{ duration: 15, repeat: Infinity }} 
                      className="absolute -top-20 -right-20 w-96 h-96 bg-primary/20 rounded-full blur-[80px]" 
                    />
                  </Card>
                </motion.div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between px-4">
                    <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shadow-inner">
                        <Target className="w-5 h-5 text-primary" />
                      </div>
                      Sector Maps
                    </h3>
                    <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest text-muted-foreground opacity-60">Quest Selection</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-1">
                    {[
                      { id: 'General Education', name: 'Gen Ed', icon: <Languages />, rnk: UNLOCK_RANKS.GENERAL_ED, bg: 'from-blue-500/10' },
                      { id: 'Professional Education', name: 'Prof Ed', icon: <BookOpen />, rnk: UNLOCK_RANKS.PROFESSIONAL_ED, bg: 'from-purple-500/10' },
                      { id: 'Specialization', name: user?.majorship || 'Major', icon: <Star />, rnk: UNLOCK_RANKS.SPECIALIZATION, bg: 'from-emerald-500/10' }
                    ].map((track, i) => {
                      const isLocked = user && !isTrackUnlocked(currentRankData?.rank || 1, track.id, user.unlockedTracks);
                      return (
                        <motion.div key={i} variants={itemVariants} whileTap={{ scale: 0.97 }}>
                          <Card 
                            onClick={() => !isLocked && startExam(track.id)} 
                            className={cn(
                              "cursor-pointer border-2 rounded-[2.5rem] bg-card overflow-hidden active:scale-95 transition-all relative h-full group hover:shadow-xl", 
                              isLocked ? "opacity-60 grayscale border-muted" : "hover:border-primary border-border/50 bg-gradient-to-br via-card to-card " + track.bg
                            )}
                          >
                            <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                              <div className="relative">
                                <div className="w-16 h-16 bg-muted rounded-[1.5rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">{track.icon}</div>
                                {isLocked && <div className="absolute -top-2 -right-2 w-8 h-8 bg-background border-2 border-muted rounded-full flex items-center justify-center shadow-sm"><Lock className="w-3.5 h-3.5 text-muted-foreground" /></div>}
                              </div>
                              <div>
                                <h4 className="font-black text-xl text-foreground">{track.name}</h4>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{isLocked ? `Unlock at Rank ${track.rnk}` : "Ready for Trace"}</p>
                              </div>
                              {!isLocked && <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="w-5 h-5 text-primary" /></div>}
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="text-xl font-black tracking-tight flex items-center gap-3 px-4">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center shadow-inner">
                      <Users className="w-5 h-5 text-emerald-600" />
                    </div>
                    Lounge & Support
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1">
                    <motion.div variants={itemVariants} whileTap={{ scale: 0.98 }}>
                      <Card onClick={() => setShowFeedbackModal(true)} className="android-surface cursor-pointer rounded-[2rem] p-6 flex items-center gap-5 border-none shadow-md3-1">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner"><MessageSquare className="text-primary w-7 h-7" /></div>
                        <div><h4 className="font-black text-lg">Send Feedback</h4><p className="text-[10px] font-bold text-muted-foreground uppercase">Improve the simulation</p></div>
                      </Card>
                    </motion.div>
                    <motion.div variants={itemVariants} whileTap={{ scale: 0.98 }}>
                      <Card onClick={() => window.location.href = 'mailto:support@letprep.app'} className="android-surface cursor-pointer rounded-[2rem] p-6 flex items-center gap-5 border-none shadow-md3-1">
                        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center shadow-inner"><Mail className="text-emerald-600 w-7 h-7" /></div>
                        <div><h4 className="font-black text-lg">Contact Us</h4><p className="text-[10px] font-bold text-muted-foreground uppercase">Technical support</p></div>
                      </Card>
                    </motion.div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <motion.div variants={itemVariants}>
                  <Card className="android-surface border-none shadow-2xl rounded-[2.5rem] bg-foreground text-background p-8 overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                      <Smartphone className="w-24 h-24" />
                    </div>
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center shadow-inner">
                          <Download className="w-7 h-7 text-primary" />
                        </div>
                        <Badge variant="outline" className="font-black text-[9px] border-primary/30 text-primary bg-primary/5 uppercase">{isApkLoading ? '---' : `v${apkInfo?.version}`}</Badge>
                      </div>
                      <div>
                        <h3 className="text-2xl font-black tracking-tight leading-none mb-2">Native Client</h3>
                        <p className="text-xs font-medium opacity-60 leading-relaxed">Install the high-fidelity Android trace for seamless offline preparation.</p>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center p-6 bg-background rounded-3xl border-2 border-dashed border-white/10 relative min-h-[180px] shadow-inner">
                        <AnimatePresence mode="wait">
                          {isApkLoading ? (
                            <motion.div key="apk-loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
                              <Loader2 className="animate-spin text-primary w-8 h-8" />
                              <span className="text-[8px] font-black uppercase text-primary/60 tracking-[0.3em]">Syncing Trace...</span>
                            </motion.div>
                          ) : qrCodeUrl ? (
                            <motion.div key="apk-qr" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4 flex flex-col items-center">
                              <div className="w-32 h-32 bg-white p-1.5 rounded-2xl shadow-xl border-4 border-white/5 overflow-hidden">
                                <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
                              </div>
                              <p className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-2"><QrCode className="w-3 h-3" /> Scan to Sideload</p>
                            </motion.div>
                          ) : (
                            <motion.p key="apk-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-muted-foreground text-center">Unable to generate QR code.</motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      <Button onClick={() => window.location.href = apkInfo?.downloadUrl || GITHUB_APK_URL} disabled={isApkLoading} className="w-full h-16 rounded-[1.75rem] font-black gap-3 bg-primary text-primary-foreground shadow-2xl shadow-primary/30 active:scale-95 transition-all">
                        {isApkLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Download className="w-5 h-5" />} Direct Install
                      </Button>
                    </div>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card className="border-none shadow-xl rounded-[2.5rem] bg-card p-8 flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
                      <BrainCircuit className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-black">Strategic Core</h4>
                      <p className="text-xs text-muted-foreground font-medium px-4">Over 3.5K+ curated items analyzed by professional pedagogical engines.</p>
                    </div>
                    <div className="w-full grid grid-cols-2 gap-3 pt-2">
                      <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
                        <p className="text-2xl font-black text-primary leading-none">82%</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1">Readiness</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
                        <p className="text-2xl font-black text-emerald-600 leading-none">100%</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1">Access</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </div>
            </div>

            <motion.div variants={itemVariants} className="pt-8 text-center pb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-[1px] w-16 bg-border" />
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                  <Heart className="w-5 h-5 text-rose-500 fill-current" />
                </motion.div>
                <div className="h-[1px] w-16 bg-border" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-40">Dedicated to the Filipino Educator</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function LetsPrepApp() { return <Suspense fallback={null}><LetsPrepContent /></Suspense>; }