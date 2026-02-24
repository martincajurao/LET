'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Ticket,
  Moon,
  Sun,
  Crown,
  Shield,
  Heart,
  LayoutGrid
} from "lucide-react";
import { ExamInterface } from "@/components/exam/ExamInterface";
import { ResultsOverview } from "@/components/exam/ResultsOverview";
import { Question, MAJORSHIPS } from "@/app/lib/mock-data";
import { PersonalizedPerformanceSummaryOutput } from "@/ai/flows/personalized-performance-summary-flow";
import { useUser, useFirestore } from "@/firebase";
import { collection, addDoc, doc, onSnapshot, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { fetchQuestionsFromFirestore } from "@/lib/db-seed";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type AppState = 'dashboard' | 'exam' | 'results' | 'onboarding';

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
  if (Array.isArray(data)) return data.map(sanitizeData);
  const sanitized: any = {};
  for (const key in data) { sanitized[key] = sanitizeData(data[key]); }
  return sanitized;
}

function LetsPrepContent() {
  const { user, loading: authLoading, updateProfile, loginWithGoogle, loginWithFacebook, bypassLogin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isDark, toggleDarkMode } = useTheme();
  const searchParams = useSearchParams();
  
  const [state, setState] = useState<AppState>('dashboard');
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examTime, setExamTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [aiSummary, setAiSummary] = useState<PersonalizedPerformanceSummaryOutput | undefined>();
  const [authIssue, setAuthIssue] = useState(false);
  
  const [timePerQuestion, setTimePerQuestion] = useState(60);
  const [limits, setLimits] = useState({ limitGenEd: 10, limitProfEd: 10, limitSpec: 10 });

  // Onboarding States
  const [setupStep, setSetupStep] = useState(1);
  const [nickname, setNickname] = useState("");
  const [selectedMajorship, setSelectedMajorship] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  useEffect(() => {
    const startCat = searchParams.get('start');
    if (startCat && state === 'dashboard' && user) {
      startExam(startCat as any);
    }
  }, [searchParams, user, state]);

  useEffect(() => {
    if (user && !user.onboardingComplete && state === 'dashboard' && !user.uid.startsWith('bypass')) {
      setState('onboarding');
      if (user.displayName) setNickname(user.displayName);
      if (user.majorship) setSelectedMajorship(user.majorship);
    }
  }, [user, state]);

  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(doc(firestore, "system_configs", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTimePerQuestion(data.timePerQuestion || 60);
        setLimits({
          limitGenEd: data.limitGenEd || 10,
          limitProfEd: data.limitProfEd || 10,
          limitSpec: data.limitSpec || 10
        });
      }
    });
    return () => unsub();
  }, [firestore]);

  const startExam = async (category: string | 'all' = 'all') => {
    if (loading) return;
    setLoading(true);
    setLoadingStep(5);
    setLoadingMessage("Checking session...");

    if (!user) {
      setAuthIssue(true);
      setLoading(false);
      return;
    }

    try {
      if (!firestore) throw new Error("Cloud synchronization error.");
      const questionPool = await fetchQuestionsFromFirestore(firestore);
      if (!questionPool || questionPool.length === 0) throw new Error("Question bank is empty.");

      let finalQuestions: Question[] = [];
      const sequenceOrder = ['General Education', 'Professional Education', 'Specialization'];

      if (category === 'all') {
        for (const subjectName of sequenceOrder) {
          const pool = questionPool.filter(q => {
            if (subjectName === 'Specialization') return q.subject === 'Specialization' && q.subCategory === (user?.majorship || 'English');
            return q.subject === subjectName;
          });
          if (pool.length > 0) {
            let limitCount = subjectName === 'Professional Education' ? limits.limitProfEd : (subjectName === 'Specialization' ? limits.limitSpec : limits.limitGenEd);
            finalQuestions = [...finalQuestions, ...shuffleArray(pool).slice(0, limitCount)];
          }
        }
      } else {
        const pool = questionPool.filter(q => {
          const target = category === 'Major' ? 'Specialization' : category;
          if (target === 'Specialization') return q.subject === 'Specialization' && q.subCategory === (user?.majorship || 'English');
          return q.subject === target;
        });
        let limitCount = (category === 'Professional Education' || category === 'Prof Ed') ? limits.limitProfEd : 
                         (category === 'Specialization' || category === 'Major') ? limits.limitSpec : 
                         limits.limitGenEd;
        finalQuestions = shuffleArray(pool).slice(0, limitCount);
      }

      if (finalQuestions.length === 0) throw new Error(`Insufficient items for: ${category}`);

      setCurrentQuestions(finalQuestions);
      setLoadingStep(100);
      setTimeout(() => { setState('exam'); setLoading(false); }, 300);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Simulation Failed", description: e.message });
      setLoading(false);
    }
  };

  const handleExamComplete = async (answers: Record<string, string>, timeSpent: number) => {
    if (!user || !firestore) return;
    setExamAnswers(answers);
    setExamTime(timeSpent);
    setLoading(true);
    setLoadingMessage("Calibrating performance...");

    const results = currentQuestions.map(q => ({
      questionId: q.id,
      subject: q.subject,
      subCategory: q.subCategory || null,
      difficulty: q.difficulty,
      isCorrect: answers[q.id] === q.correctAnswer
    }));
    
    const overallScore = Math.round((results.filter(h => h.isCorrect).length / (currentQuestions.length || 1)) * 100);

    const resultsData = sanitizeData({
      userId: user.uid,
      displayName: user.displayName || 'Guest Educator',
      timestamp: Date.now(),
      overallScore,
      timeSpent,
      results,
      lastActiveDate: serverTimestamp()
    });

    if (!user.uid.startsWith('bypass')) {
      await addDoc(collection(firestore, "exam_results"), resultsData);
      await updateDoc(doc(firestore, 'users', user.uid), {
        dailyQuestionsAnswered: increment(currentQuestions.length),
        dailyTestsFinished: increment(1),
        lastActiveDate: serverTimestamp()
      });
    }

    setLoadingStep(100);
    setTimeout(() => { setState('results'); setLoading(false); }, 500);
  };

  const finishOnboarding = async () => {
    if (!selectedMajorship || !nickname) {
      toast({ title: "Missing Info", description: "Please provide a nickname and select your track." });
      return;
    }
    setSavingOnboarding(true);
    try {
      await updateProfile({
        displayName: nickname,
        majorship: selectedMajorship,
        referredBy: referralCode || undefined,
        onboardingComplete: true
      });
      toast({ title: "Welcome!", description: "Account setup complete. Good luck, Educator!" });
      setState('dashboard');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Setup Error", description: e.message });
    } finally {
      setSavingOnboarding(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const displayStats = user ? [
    { icon: <Zap className="w-4 h-4 text-yellow-500" />, label: 'Credits', value: user?.credits || 0, color: 'text-yellow-500 bg-yellow-500/10' },
    { icon: <Flame className="w-4 h-4 text-orange-500" />, label: 'Streak', value: user?.streakCount || 0, color: 'text-orange-500 bg-orange-500/10' },
    { icon: user?.isPro ? <Crown className="w-4 h-4 text-yellow-600" /> : <Shield className="w-4 h-4 text-blue-500" />, label: 'Tier', value: user?.isPro ? 'Platinum' : 'Standard', color: user?.isPro ? 'text-yellow-600 bg-yellow-500/10' : 'text-blue-500 bg-blue-500/10' },
    { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, label: 'Pass Rate', value: '92%', color: 'text-emerald-500 bg-emerald-500/10' }
  ] : [
    { icon: <Users className="w-4 h-4 text-blue-500" />, label: 'Community', value: '1.7K+', color: 'text-blue-500 bg-blue-500/5' },
    { icon: <BookOpen className="w-4 h-4 text-purple-500" />, label: 'Items Mastered', value: '15K+', color: 'text-purple-500 bg-purple-500/5' },
    { icon: <LayoutGrid className="w-4 h-4 text-pink-500" />, label: 'Questions', value: '25K+', color: 'text-pink-500 bg-pink-500/5' },
    { icon: <Trophy className="w-4 h-4 text-yellow-500" />, label: 'Board Ready', value: '82%', color: 'text-yellow-500 bg-yellow-500/5' }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-body transition-all duration-300">
      <Toaster />
      
      <Dialog open={authIssue} onOpenChange={setAuthIssue}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-8 max-w-sm z-[1001]">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black">Authentication Required</DialogTitle>
            <DialogDescription className="text-muted-foreground">Sign in to track your progress and earn credits. <span className="text-primary font-black">Free Forever Access.</span></DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Button onClick={async () => { await loginWithGoogle(); setAuthIssue(false); }} className="h-12 rounded-xl font-bold gap-2 shadow-lg"><Zap className="w-4 h-4 fill-current" /> Continue with Google</Button>
            <Button onClick={async () => { await loginWithFacebook(); setAuthIssue(false); }} className="h-12 rounded-xl font-bold gap-2 shadow-lg bg-[#1877F2] text-white hover:bg-[#1877F2]/90 border-none">
              <Facebook className="w-4 h-4 fill-current" /> Continue with Facebook
            </Button>
            <Button variant="outline" onClick={() => { bypassLogin(); setAuthIssue(false); }} className="h-12 rounded-xl font-bold border-2">Guest Simulation</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={loading}>
        <DialogContent className="max-w-[300px] border-none shadow-2xl bg-card rounded-[2.5rem] p-8 z-[1001]">
          <DialogHeader>
            <DialogTitle className="sr-only">Initializing Simulation</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 bg-primary/10 rounded-full animate-ping absolute inset-0" />
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center relative z-10">
                <BrainCircuit className="w-10 h-10 text-primary animate-pulse" />
              </div>
            </div>
            <p className="font-black text-center text-lg">{loadingMessage}</p>
            <Progress value={loadingStep} className="h-1.5 w-full rounded-full" />
          </div>
        </DialogContent>
      </Dialog>

      {state === 'exam' ? (
        <div className="animate-md-slide-up h-full">
          <ExamInterface questions={currentQuestions} timePerQuestion={timePerQuestion} onComplete={handleExamComplete} />
        </div>
      ) : state === 'results' ? (
        <div className="animate-md-slide-up h-full p-4">
          <ResultsOverview questions={currentQuestions} answers={examAnswers} timeSpent={examTime} aiSummary={aiSummary} onRestart={() => setState('dashboard')} />
        </div>
      ) : state === 'onboarding' ? (
        <div className="min-h-[85vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-md rounded-[3rem] bg-card border-none shadow-2xl overflow-hidden animate-md-slide-up">
            <div className="bg-primary/10 p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-card rounded-[1.5rem] flex items-center justify-center shadow-lg mb-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">Finalizing Profile</h2>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">Professional Verification</p>
            </div>
            
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Leaderboard Nickname</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="e.g. Master Teacher" 
                      className="pl-11 h-12 rounded-xl border-2 focus:ring-primary/20"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Majorship Track</Label>
                  <Select value={selectedMajorship} onValueChange={setSelectedMajorship}>
                    <SelectTrigger className="h-12 rounded-xl border-2 px-4 font-bold">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        <SelectValue placeholder="Select your track..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {MAJORSHIPS.map(m => (
                        <SelectItem key={m} value={m} className="font-bold py-3">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Referral Code (Optional)</Label>
                  <div className="relative">
                    <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Enter invite code" 
                      className="pl-11 h-12 rounded-xl border-2 focus:ring-primary/20"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-3 block">Simulation Mode</Label>
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border-2 border-dashed">
                    <div className="flex items-center gap-3">
                      {isDark ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                      <span className="text-sm font-bold">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={toggleDarkMode} className="h-8 rounded-lg font-black text-[10px] uppercase">Toggle</Button>
                  </div>
                </div>
              </div>

              <Button 
                onClick={finishOnboarding} 
                disabled={savingOnboarding || !nickname || !selectedMajorship}
                className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/30 gap-3 transition-all active:scale-[0.98]"
              >
                {savingOnboarding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                Enter Learning Vault
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {displayStats.map((stat, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", stat.color)}>{stat.icon}</div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                  <p className="text-lg font-black text-foreground leading-none">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-6">
              <Card className="overflow-hidden border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-card to-background relative p-8 md:p-12">
                <div className="relative z-10 space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="secondary" className="font-black text-[10px] uppercase px-4 py-1 bg-primary/20 text-primary border-none">Free Forever Practice</Badge>
                    <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full"><Heart className="w-3.5 h-3.5" /><span className="text-[10px] font-black uppercase">Open to All</span></div>
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] text-foreground">Prepare for the <br /><span className="text-primary italic">Board Exam.</span></h1>
                    <p className="text-muted-foreground font-medium md:text-xl max-w-lg">Experience high-fidelity simulations with AI pedagogical analysis tailored for Filipino educators. <span className="text-foreground font-black">Completely free practice.</span></p>
                  </div>
                  <Button size="lg" disabled={loading} onClick={() => startExam('all')} className="h-14 md:h-16 px-8 md:px-12 rounded-2xl font-black text-base md:text-lg gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all group">
                    <Zap className="w-6 h-6 fill-current" /> <span>Launch Full Battle</span> <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 animate-md-slide-up" />
              </Card>

              <div className="space-y-4">
                <h3 className="text-xl font-black tracking-tight px-2 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> Training Grounds
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { name: 'Gen Ed', icon: <Languages />, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Core Knowledge' },
                    { name: 'Prof Ed', icon: <GraduationCap />, color: 'text-purple-500', bg: 'bg-purple-500/10', desc: 'Teaching Strategy' },
                    { name: user?.majorship || 'Major', icon: <Star />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Subject Mastery' }
                  ].map((track, i) => (
                    <Card key={i} onClick={() => startExam(track.name as any)} className="group cursor-pointer border-2 border-border/50 hover:border-primary transition-all rounded-3xl bg-card overflow-hidden active:scale-95">
                      <CardContent className="p-6 space-y-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", track.bg, track.color)}>{track.icon}</div>
                        <div>
                          <h4 className="font-black text-lg text-foreground">{track.name}</h4>
                          <p className="text-xs text-muted-foreground font-medium">{track.desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Card className="border-none shadow-xl rounded-[2.5rem] bg-foreground text-background p-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-primary" /> Verified Professional Platform
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <p className="text-4xl font-black text-primary">15K+</p>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">Practice Items Mastered</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-4xl font-black text-secondary">82%</p>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">Avg Board Readiness</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-4xl font-black text-blue-400">100%</p>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">Free Simulation Mode</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LetsPrepApp() {
  return (
    <Suspense fallback={null}>
      <LetsPrepContent />
    </Suspense>
  );
}
