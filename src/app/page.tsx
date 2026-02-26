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
  BrainCircuit, 
  ChevronRight, 
  Zap,
  Trophy,
  Flame,
  Star,
  Loader2,
  BookOpen,
  Smartphone,
  Facebook,
  ShieldCheck,
  CheckCircle2,
  Languages,
  User,
  Users,
  Moon,
  Sun,
  Crown,
  Shield,
  Heart,
  LayoutGrid,
  Sparkles,
  Lock,
  Timer,
  Play,
  BellRing,
  Download,
  QrCode,
  Info,
  ShieldAlert
} from "lucide-react";
import QRCode from 'qrcode';
import { ExamInterface } from "@/components/exam/ExamInterface";
import { ResultsOverview } from "@/components/exam/ResultsOverview";
import { QuickFireInterface } from "@/components/exam/QuickFireInterface";
import { QuickFireResults } from "@/components/exam/QuickFireResults";
import { ResultUnlockDialog } from "@/components/exam/ResultUnlockDialog";
import { RankUpDialog } from "@/components/ui/rank-up-dialog";
import { Question, MAJORSHIPS } from "@/app/lib/mock-data";
import { useUser, useFirestore } from "@/firebase";
import { collection, addDoc, doc, onSnapshot, updateDoc, increment, serverTimestamp, query, where, getCountFromServer } from "firebase/firestore";
import { fetchQuestionsFromFirestore, seedInitialQuestions } from "@/lib/db-seed";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getRankData, isTrackUnlocked, XP_REWARDS, COOLDOWNS, UNLOCK_RANKS, getCareerRankTitle } from '@/lib/xp-system';

type AppState = 'dashboard' | 'exam' | 'results' | 'onboarding' | 'quickfire' | 'quickfire_results';

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
  
  if (data.constructor?.name === 'FieldValue' || (data._methodName && data._methodName.startsWith('FieldValue.'))) {
    return data;
  }

  if (Array.isArray(data)) return data.map(sanitizeData);
  
  const sanitized: any = {};
  for (const key in data) {
    const val = sanitizeData(data[key]);
    if (val !== undefined) {
      sanitized[key] = val;
    }
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
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="w-32 h-32 border-2 border-dashed border-primary/10 rounded-full absolute -inset-4 scale-110"
      />
      
      <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center relative z-10 shadow-2xl shadow-primary/10 overflow-hidden">
        <motion.div
          animate={{ 
            y: [0, -6, 0],
            rotate: [0, 3, -3, 0]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <GraduationCap className="w-12 h-12 text-primary" />
        </motion.div>
        
        <motion.div
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
            x: [0, 15, -5, 0],
            y: [0, -10, 15, 0]
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-4 right-4"
        >
          <Sparkles className="w-5 h-5 text-yellow-500 fill-current" />
        </motion.div>
      </div>
    </div>
    
    {message && (
      <div className="space-y-3 text-center">
        <p className="font-black text-xl tracking-tight text-foreground">{message}</p>
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
  const { user, loading: authLoading, updateProfile, loginWithGoogle, loginWithFacebook, bypassLogin } = useUser();
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
  
  const [apkInfo, setApkInfo] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isQrLoading, setIsQrLoading] = useState(true);
  
  // Result unlock dialog state
  const [showResultUnlock, setShowResultUnlock] = useState(false);
  const [resultsUnlocked, setResultsUnlocked] = useState(false);

  const rankData = useMemo(() => user ? getRankData(user.xp || 0) : null, [user?.xp]);

  useEffect(() => {
    const fetchApkAndGenerateQR = async () => {
      try {
        setIsQrLoading(true);
        // Use Firebase Functions URL with fallback
        const getFunctionsUrl = () => {
          if (process.env.NODE_ENV === 'development') {
            return process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_DEV_URL || 'http://localhost:5001/your-project-id/us-central1';
          }
          return process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL || 'https://us-central1-your-project-id.cloudfunctions.net';
        };
        
        const functionsUrl = getFunctionsUrl();
        
        const res = await fetch(`${functionsUrl}/apk`).catch(err => {
          console.error('Failed to fetch APK info:', err);
          throw err;
        });
        const data = await res.json();
        setApkInfo(data);

        const downloadUrl = `${functionsUrl}/download`;
        
        const qrDataUrl = await QRCode.toDataURL(downloadUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: '#10b981',
            light: '#ffffff'
          }
        });
        setQrCodeUrl(qrDataUrl);
      } catch (e) {
        console.error('Error fetching APK info or generating QR code:', e);
      } finally {
        setIsQrLoading(false);
      }
    };
    fetchApkAndGenerateQR();
  }, []);

  useEffect(() => {
    if (searchParams.get('start') === 'quickfire') {
      startExam('quickfire');
    } else if (searchParams.get('start')) {
      startExam(searchParams.get('start') as any);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(doc(firestore, "system_configs", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTimePerQuestion(data.timePerQuestion || 60);
        setLimits({ limitGenEd: data.limitGenEd || 10, limitProfEd: data.limitProfEd || 10, limitSpec: data.limitSpec || 10 });
      }
    });
    return () => unsub();
  }, [firestore]);

  useEffect(() => {
    if (!user || !firestore) return;
    const q = query(collection(firestore, "exam_results"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, async () => {
      const snap = await getCountFromServer(q);
      const count = snap.data().count;
      setUserRank(count > 0 ? `#${count}` : '---');
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
      setTimeout(() => { setState(category === 'quickfire' ? 'quickfire' : 'exam'); setLoading(false); }, 300);
    } catch (e: any) { toast({ variant: "destructive", title: "Simulation Failed", description: e.message }); setLoading(false); }
  };

  const handleExamComplete = async (answers: Record<string, string>, timeSpent: number) => {
    if (!user || !firestore) return;
    setExamAnswers(answers);
    setExamTime(timeSpent);
    setLoading(true);
    setLoadingMessage("Calibrating...");

    const results = currentQuestions.map(q => ({
      questionId: q.id,
      subject: q.subject,
      subCategory: q.subCategory || null,
      difficulty: q.difficulty,
      isCorrect: answers[q.id] === q.correctAnswer
    }));
    
    const correctCount = results.filter(h => h.isCorrect).length;
    const overallScore = Math.round((correctCount / (currentQuestions.length || 1)) * 100);
    let xpEarned = correctCount * XP_REWARDS.CORRECT_ANSWER;
    const isQuickFire = currentQuestions.length <= 5;
    if (!isQuickFire) xpEarned += (currentQuestions.length >= 50 ? XP_REWARDS.FINISH_FULL_SIM : XP_REWARDS.FINISH_TRACK);
    else xpEarned += Math.round((correctCount / 5) * XP_REWARDS.QUICK_FIRE_COMPLETE);

    setLastXpEarned(xpEarned);
    const resultsData = sanitizeData({ userId: user.uid, displayName: user.displayName || 'Guest Educator', timestamp: Date.now(), overallScore, timeSpent, xpEarned, results, lastActiveDate: serverTimestamp() });

    if (!user.uid.startsWith('bypass')) {
      await addDoc(collection(firestore, "exam_results"), resultsData);
      const updateData: any = { dailyQuestionsAnswered: increment(currentQuestions.length), dailyTestsFinished: increment(!isQuickFire ? 1 : 0), xp: increment(xpEarned), lastActiveDate: serverTimestamp() };
      if (isQuickFire) updateData.lastQuickFireTimestamp = Date.now();
      await updateDoc(doc(firestore, 'users', user.uid), updateData);
    }

    setLoadingStep(100);
    setLoading(false);
    
    // Show unlock dialog for non-pro users on full exams
    if (!user.isPro && !isQuickFire) {
      setShowResultUnlock(true);
    } else {
      setResultsUnlocked(true);
      setTimeout(() => { setState(isQuickFire ? 'quickfire_results' : 'results'); }, 300);
    }
  };

  const handleResultUnlock = () => {
    setResultsUnlocked(true);
    setTimeout(() => { setState('results'); }, 300);
  };

  const handleDownloadApk = () => {
    const functionsUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5001/your-project-id/us-central1'
      : 'https://us-central1-your-project-id.cloudfunctions.net';
    const downloadUrl = `${functionsUrl}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'letpractice-app.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Starting Download", description: "Your professional mobile tool is being prepared." });
  };

  const handleWatchXpAd = async () => {
    if (!user || !firestore || adCooldown > 0) return;
    setClaimingXp(true);
    setTimeout(async () => {
      try {
        await updateDoc(doc(firestore, 'users', user.uid), { xp: increment(XP_REWARDS.AD_WATCH_XP), credits: increment(5), lastAdXpTimestamp: Date.now() });
        toast({ title: "Growth Boost!", description: `+${XP_REWARDS.AD_WATCH_XP} XP earned.` });
      } catch (e) { toast({ variant: "destructive", title: "Claim Failed", description: "Sync error." }); } finally { setClaimingXp(false); }
    }, 2500);
  };

  const [nickname, setNickname] = useState("");
  const [selectedMajorship, setSelectedMajorship] = useState("");
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  const [showRankUp, setShowRankUp] = useState(false);
  const [celebratedRank, setCelebratedRank] = useState(1);
  const [celebratedReward, setCelebratedReward] = useState(0);

  const finishOnboarding = async () => {
    if (!selectedMajorship || !nickname) { toast({ title: "Missing Info", description: "Complete the setup." }); return; }
    setSavingOnboarding(true);
    try {
      await updateProfile({ displayName: nickname, majorship: selectedMajorship, onboardingComplete: true });
      setState('dashboard');
    } catch (e: any) { toast({ variant: "destructive", title: "Setup Error", description: e.message }); } finally { setSavingOnboarding(false); }
  };

  const formatCooldown = (ms: number) => {
    const mins = Math.ceil(ms / (1000 * 60));
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  };

  if (authLoading) return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-background bg-gradient-to-b from-background via-background to-primary/5"
    >
      <EducationalLoader message="Synchronizing Educator Session" />
    </motion.div>
  );

  const displayStats = user ? [
    { icon: <Zap className="w-4 h-4 text-yellow-500" />, label: 'Credits', value: typeof user.credits === 'number' ? user.credits : 0, color: 'text-yellow-500 bg-yellow-500/10' },
    { icon: <Trophy className="w-4 h-4 text-primary" />, label: 'Arena', value: userRank, color: 'text-primary bg-primary/10' },
    { icon: user?.isPro ? <Crown className="w-4 h-4 text-yellow-600" /> : <Shield className="w-4 h-4 text-blue-500" />, label: 'Tier', value: user?.isPro ? 'Platinum' : 'FREE', color: user?.isPro ? 'text-yellow-600 bg-yellow-500/10' : 'text-blue-500 bg-blue-500/10' },
    { icon: <Flame className="w-4 h-4 text-orange-500" />, label: 'Streak', value: typeof user.streakCount === 'number' ? user.streakCount : 0, color: 'text-orange-500 bg-orange-500/10' }
  ] : [
    { icon: <Users className="w-4 h-4 text-blue-500" />, label: 'Community', value: '1.7K+', color: 'text-blue-500 bg-blue-500/5' },
    { icon: <Sparkles className="w-4 h-4 text-purple-500" />, label: 'AI Solved', value: '8.2K+', color: 'text-purple-500 bg-purple-500/5' },
    { icon: <LayoutGrid className="w-4 h-4 text-pink-500" />, label: 'Curated Items', value: '3.5K+', color: 'text-pink-500 bg-pink-500/5' },
    { icon: <Trophy className="w-4 h-4 text-yellow-500" />, label: 'Board Ready', value: '82%', color: 'text-yellow-500 bg-yellow-500/5' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="min-h-screen bg-background text-foreground font-body transition-all duration-300"
    >
      <Toaster />
      
      <RankUpDialog 
        isOpen={showRankUp} 
        onClose={() => setShowRankUp(false)} 
        rank={celebratedRank} 
        reward={celebratedReward} 
      />

      <ResultUnlockDialog
        open={showResultUnlock}
        onClose={() => setShowResultUnlock(false)}
        onUnlock={handleResultUnlock}
        questionsCount={currentQuestions.length}
        correctAnswers={Object.values(examAnswers).filter((answer, index) => {
          const question = currentQuestions[index];
          return question && answer === question.correctAnswer;
        }).length}
        timeSpent={examTime}
      />

      <Dialog open={authIssue} onOpenChange={setAuthIssue}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-0 max-w-sm z-[1001] outline-none overflow-hidden">
          <div className="bg-emerald-500/10 p-10 flex flex-col items-center text-center relative">
            <div className="w-20 h-20 bg-card rounded-[2rem] flex items-center justify-center shadow-xl mb-4 relative z-10">
              <ShieldCheck className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="space-y-1 relative z-10">
              <DialogTitle className="text-2xl font-black tracking-tight">Verified Access</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">
                Professional Credentials Required
              </DialogDescription>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent z-0" />
          </div>
          <div className="p-8 space-y-6 bg-card">
            <div className="space-y-4">
              <p className="text-center text-sm font-medium text-muted-foreground leading-relaxed">
                Sign in to track your board readiness, maintain streaks, and sync across devices.
              </p>
              <div className="grid gap-3 pt-2">
                <Button 
                  onClick={async () => { await loginWithGoogle(); setAuthIssue(false); }} 
                  className="h-14 rounded-2xl font-black gap-3 shadow-xl bg-white text-black border border-border hover:bg-muted transition-all active:scale-95"
                >
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </Button>
                <Button 
                  onClick={async () => { await loginWithFacebook(); setAuthIssue(false); }} 
                  className="h-14 rounded-2xl font-black gap-3 shadow-xl bg-[#1877F2] text-white hover:bg-[#1877F2]/90 border-none transition-all active:scale-95"
                >
                  <Facebook className="w-5 h-5 fill-current text-white" />
                  <span>Continue with Facebook</span>
                </Button>
              </div>
            </div>
            <div className="pt-4 border-t border-border/50 text-center">
              <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest border-emerald-500/20 text-emerald-600 bg-emerald-500/5 py-1 px-4">
                Free Forever Practice Access
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={loading}>
        <DialogContent className="max-w-[320px] border-none shadow-2xl bg-card rounded-[2.5rem] p-10 z-[1001] outline-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Loading Session</DialogTitle>
            <DialogDescription>Please wait while we calibrate your professional simulation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
            <EducationalLoader message={loadingMessage} />
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <span>Calibrating Simulation</span>
                <span>{loadingStep}%</span>
              </div>
              <Progress value={loadingStep} className="h-2 w-full rounded-full" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence mode="wait">
        {state === 'exam' ? (
          <motion.div key="exam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full"><ExamInterface questions={currentQuestions} timePerQuestion={timePerQuestion} onComplete={handleExamComplete} /></motion.div>
        ) : state === 'quickfire' ? (
          <motion.div key="quickfire" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full"><QuickFireInterface questions={currentQuestions} onComplete={handleExamComplete} onExit={() => setState('dashboard')} /></motion.div>
        ) : state === 'results' ? (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4"><ResultsOverview questions={currentQuestions} answers={examAnswers} timeSpent={examTime} onRestart={() => setState('dashboard')} /></motion.div>
        ) : state === 'quickfire_results' ? (
          <motion.div key="quickfire_results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4"><QuickFireResults questions={currentQuestions} answers={examAnswers} timeSpent={examTime} xpEarned={lastXpEarned} onRestart={() => setState('dashboard')} /></motion.div>
        ) : state === 'onboarding' ? (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-[85vh] flex items-center justify-center p-4">
            <Card className="w-full max-w-md rounded-[2.5rem] bg-card border-none shadow-2xl overflow-hidden">
              <div className="bg-primary/10 p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center shadow-lg mb-4"><ShieldCheck className="w-8 h-8 text-primary" /></div>
                <h2 className="text-2xl font-black tracking-tight">Finalizing Profile</h2>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">Professional Verification</p>
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Leaderboard Nickname</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="e.g. Master Teacher" className="pl-11 h-12 rounded-xl border-2 font-medium" value={nickname} onChange={(e) => setNickname(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Majorship Track</Label>
                    <Select value={selectedMajorship} onValueChange={setSelectedMajorship}>
                      <SelectTrigger className="h-12 rounded-xl border-2 px-4 font-bold"><div className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-muted-foreground" /><SelectValue placeholder="Select track..." /></div></SelectTrigger>
                      <SelectContent className="rounded-xl">{MAJORSHIPS.map(m => (<SelectItem key={m} value={m} className="font-medium py-3">{m}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={finishOnboarding} disabled={savingOnboarding || !nickname || !selectedMajorship} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/30">{savingOnboarding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />} Enter Learning Vault</Button>
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
                        <Button onClick={handleWatchXpAd} disabled={claimingXp || adCooldown > 0} variant="outline" className="h-12 rounded-xl font-bold text-xs gap-2 border-primary/20 hover:bg-primary/5">{claimingXp ? <Loader2 className="w-4 h-4 animate-spin" /> : adCooldown > 0 ? <Timer className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}{adCooldown > 0 ? formatCooldown(adCooldown) : "XP Boost Clip"}</Button>
                        <Button onClick={() => startExam('quickfire')} disabled={quickFireCooldown > 0} variant="default" className="h-12 rounded-xl font-bold text-xs gap-2 shadow-lg shadow-primary/20">{quickFireCooldown > 0 ? <Timer className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}{quickFireCooldown > 0 ? formatCooldown(quickFireCooldown) : "Brain Teaser"}</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="overflow-hidden border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-card to-background relative p-8 md:p-12">
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
                  <h3 className="text-xl font-black tracking-tight px-2 flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Training Grounds</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'General Education', name: 'Gen Ed', icon: <Languages />, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Core Knowledge', rnk: UNLOCK_RANKS.GENERAL_ED, title: getCareerRankTitle(UNLOCK_RANKS.GENERAL_ED) },
                      { id: 'Professional Education', name: 'Prof Ed', icon: <GraduationCap />, color: 'text-purple-500', bg: 'bg-purple-500/10', desc: 'Teaching Strategy', rnk: UNLOCK_RANKS.PROFESSIONAL_ED, title: getCareerRankTitle(UNLOCK_RANKS.PROFESSIONAL_ED) },
                      { id: 'Specialization', name: user?.majorship || 'Major', icon: <Star />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Subject Mastery', rnk: UNLOCK_RANKS.SPECIALIZATION, title: getCareerRankTitle(UNLOCK_RANKS.SPECIALIZATION) }
                    ].map((track, i) => {
                      const isLocked = user && !isTrackUnlocked(rankData?.rank || 1, track.id, user.unlockedTracks);
                      return (
                        <Card key={i} onClick={() => !isLocked && startExam(track.id as any)} className={cn("group cursor-pointer border-2 transition-all rounded-[2rem] bg-card overflow-hidden active:scale-95 relative", isLocked ? "border-muted opacity-60" : "border-border/50 hover:border-primary")}>
                          {isLocked && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[1px] p-4 text-center">
                              <div className="bg-card/90 p-2 rounded-xl border shadow-sm flex flex-col items-center">
                                <Lock className="w-4 h-4 text-muted-foreground mb-1" />
                                <span className="text-[8px] font-black uppercase text-muted-foreground leading-tight">Rank {track.rnk} <br />({track.title})</span>
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
                <Card className="border-none shadow-xl rounded-[2.25rem] bg-gradient-to-br from-emerald-500/20 via-card to-background p-6 overflow-hidden">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                          <Smartphone className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-black text-lg text-foreground">Get Mobile App</h3>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Study anywhere</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-black text-[9px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5 uppercase">
                        {apkInfo?.version ? `v${apkInfo.version}` : 'Official APK'}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center p-5 bg-white rounded-3xl border-2 border-dashed border-emerald-500/20 relative group overflow-hidden">
                      <AnimatePresence mode="wait">
                        {isQrLoading ? (
                          <motion.div 
                            key="loader"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-32 h-32 flex items-center justify-center"
                          >
                            <div className="w-full h-full bg-emerald-50/50 animate-pulse rounded-xl flex items-center justify-center">
                              <Loader2 className="w-6 h-6 text-emerald-300 animate-spin" />
                            </div>
                          </motion.div>
                        ) : qrCodeUrl ? (
                          <motion.div 
                            key="qr"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: "spring", damping: 15, stiffness: 200 }}
                            className="flex flex-col items-center"
                          >
                            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                            <div className="w-32 h-32 relative z-10 bg-white p-1 rounded-xl shadow-sm border border-emerald-100">
                              <img src={qrCodeUrl} alt="Download QR Code" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex items-center gap-2 mt-3 text-emerald-600 relative z-10">
                              <QrCode className="w-3.5 h-3.5" />
                              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Scan to Download</p>
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-3">
                      <Button 
                        onClick={handleDownloadApk}
                        className="w-full h-14 rounded-2xl font-black gap-3 bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-95"
                      >
                        <Download className="w-5 h-5" />
                        Direct Download
                      </Button>
                      <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified Professional Installer</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="border-none shadow-xl rounded-[2.25rem] bg-foreground text-background p-8 relative overflow-hidden group">
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
