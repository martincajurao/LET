'use client'

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle, 
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  GraduationCap, 
  BrainCircuit, 
  Languages,
  ChevronRight,
  Clock,
  Zap,
  Target,
  Trophy,
  Flame,
  Star,
  Users,
  Loader2,
  BookOpen
} from "lucide-react";
import { ExamInterface } from "@/components/exam/ExamInterface";
import { ResultsOverview } from "@/components/exam/ResultsOverview";
import { Question, MAJORSHIPS } from "@/app/lib/mock-data";
import { generatePersonalizedPerformanceSummary, PersonalizedPerformanceSummaryOutput } from "@/ai/flows/personalized-performance-summary-flow";
import { useUser, useFirestore } from "@/firebase";
import { collection, addDoc, doc, onSnapshot, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { fetchQuestionsFromFirestore } from "@/lib/db-seed";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DailyTaskDashboard } from '@/components/ui/daily-task-dashboard';
import { ReferralSystem } from '@/components/ui/referral-system';
import { Leaderboard } from '@/components/ui/leaderboard';
import { EventsSection } from '@/components/ui/EventsSection';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';

type AppState = 'dashboard' | 'exam' | 'results' | 'registration';

interface HistoryEntry {
  questionId: string;
  subject: string;
  subCategory?: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  isCorrect: boolean;
  timestamp?: number;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

function sanitizeData(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeData);
  const sanitized: any = {};
  for (const key in data) { sanitized[key] = sanitizeData(data[key]); }
  return sanitized;
}

export default function LetsPrepApp() {
  const { user, loading: authLoading, updateProfile, loginWithGoogle, loginWithFacebook, loginAnonymously } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
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

  useEffect(() => {
    if (user && !user.majorship && state === 'dashboard' && !user.uid.startsWith('bypass')) {
      setState('registration');
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

    setLoadingStep(20);
    setLoadingMessage("Fetching question pool...");
    
    try {
      if (!firestore) throw new Error("Cloud synchronization error.");

      const questionPool = await fetchQuestionsFromFirestore(firestore);
      if (!questionPool || questionPool.length === 0) throw new Error("Question bank is empty.");

      let finalQuestions: Question[] = [];
      const sequenceOrder = ['General Education', 'Professional Education', 'Specialization'];

      if (category === 'all') {
        for (const subjectName of sequenceOrder) {
          const pool = questionPool.filter(q => {
            if (subjectName === 'Specialization') {
              return q.subject === 'Specialization' && q.subCategory === (user?.majorship || 'English');
            }
            return q.subject === subjectName;
          });
          
          if (pool.length > 0) {
            let limitCount = subjectName === 'Professional Education' ? limits.limitProfEd : (subjectName === 'Specialization' ? limits.limitSpec : limits.limitGenEd);
            finalQuestions = [...finalQuestions, ...shuffleArray(pool).slice(0, limitCount)];
          }
        }
      } else {
        const pool = questionPool.filter(q => {
          if (category === 'Specialization') {
            return q.subject === 'Specialization' && q.subCategory === (user?.majorship || 'English');
          }
          return q.subject === category;
        });

        let limitCount = category === 'Professional Education' ? limits.limitProfEd : (category === 'Specialization' ? limits.limitSpec : limits.limitGenEd);
        finalQuestions = shuffleArray(pool).slice(0, limitCount);
      }

      if (finalQuestions.length === 0) throw new Error(`Insufficient items for: ${category}`);

      setCurrentQuestions(finalQuestions);
      setLoadingStep(100);
      setTimeout(() => {
        setState('exam');
        setLoading(false);
      }, 300);
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

    const currentTestHistory: HistoryEntry[] = currentQuestions.map(q => ({
      questionId: q.id,
      subject: q.subject,
      subCategory: q.subCategory || null,
      difficulty: q.difficulty,
      isCorrect: answers[q.id] === q.correctAnswer
    }));
    
    const subjectStats: Record<string, { total: number; correct: number }> = {};
    currentQuestions.forEach(q => {
      const key = q.subject === 'Specialization' && q.subCategory ? `${q.subject}: ${q.subCategory}` : q.subject;
      if (!subjectStats[key]) subjectStats[key] = { total: 0, correct: 0 };
      subjectStats[key].total++;
      if (answers[q.id] === q.correctAnswer) subjectStats[key].correct++;
    });

    const testResults = Object.entries(subjectStats).map(([subjectName, data]) => ({
      subjectName,
      totalQuestions: data.total,
      correctAnswers: data.correct,
      incorrectAnswers: data.total - data.correct,
      scorePercentage: Math.round((data.correct / (data.total || 1)) * 100),
    }));

    const overallScore = Math.round((currentTestHistory.filter(h => h.isCorrect).length / (currentQuestions.length || 1)) * 100);

    let finalAiSummary: PersonalizedPerformanceSummaryOutput;
    try {
      finalAiSummary = (await generatePersonalizedPerformanceSummary({
        testResults,
        overallScorePercentage: overallScore,
        overallTimeSpentSeconds: timeSpent
      }))!;
    } catch (e) {
      finalAiSummary = {
        summary: `Finished with ${overallScore}%.`,
        strengths: [], weaknesses: [], recommendations: "Continue practicing all tracks."
      };
    }
    setAiSummary(finalAiSummary);

    const resultsData = sanitizeData({
      userId: user.uid,
      displayName: user.displayName || 'Guest Educator',
      timestamp: Date.now(),
      overallScore,
      timeSpent,
      results: currentTestHistory,
      subjectBreakdown: testResults,
      aiSummary: finalAiSummary || null
    });

    await addDoc(collection(firestore, "exam_results"), resultsData);
    await updateDoc(doc(firestore, 'users', user.uid), {
      dailyQuestionsAnswered: increment(currentQuestions.length),
      dailyTestsFinished: increment(1),
      lastActiveDate: serverTimestamp()
    });

    setLoadingStep(100);
    setTimeout(() => {
      setState('results');
      setLoading(false);
    }, 500);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-body pb-24 transition-colors duration-300">
      <Toaster />
      <Dialog open={authIssue} onOpenChange={setAuthIssue}>
        <DialogContent className="rounded-[2rem] bg-card border-border">
          <DialogHeader><DialogTitle className="font-black text-foreground">Authentication Required</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Button onClick={loginWithGoogle} className="h-14 rounded-xl font-black gap-2"><GoogleIcon /> Sign in with Google</Button>
            <Button onClick={loginWithFacebook} variant="outline" className="h-14 rounded-xl font-black gap-2 border-border"><FacebookIcon /> Sign in with Facebook</Button>
            <Button variant="secondary" onClick={loginAnonymously} className="h-14 rounded-xl font-black">Guest Access</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={loading}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl bg-card rounded-[2rem]">
          <DialogHeader><DialogTitle className="text-center font-black text-foreground">{loadingMessage}</DialogTitle></DialogHeader>
          <div className="space-y-6 py-6 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center"><BrainCircuit className="w-6 h-6 text-primary animate-pulse" /></div>
            <Progress value={loadingStep} className="h-2" />
          </div>
        </DialogContent>
      </Dialog>

      {state === 'exam' ? (
        <div className="max-w-7xl mx-auto p-4 md:p-8"><ExamInterface questions={currentQuestions} timePerQuestion={timePerQuestion} onComplete={handleExamComplete} /></div>
      ) : state === 'results' ? (
        <div className="max-w-7xl mx-auto p-4 md:p-8"><ResultsOverview questions={currentQuestions} answers={examAnswers} timeSpent={examTime} aiSummary={aiSummary} onRestart={() => setState('dashboard')} /></div>
      ) : state === 'registration' ? (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card className="max-w-md w-full rounded-[2.5rem] bg-card border-none shadow-xl">
            <CardHeader className="text-center pt-10"><CardTitle className="text-2xl font-black text-foreground">Choose Your Majorship</CardTitle></CardHeader>
            <CardContent className="pb-12 pt-4 px-10">
              <Select onValueChange={(val) => { updateProfile({ majorship: val }); setState('dashboard'); }}>
                <SelectTrigger className="h-14 rounded-2xl font-black border-border"><SelectValue placeholder="Select track..." /></SelectTrigger>
                <SelectContent>{MAJORSHIPS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="max-w-7xl mx-auto px-3 md:px-4 py-6 md:py-8 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { icon: <Users className="w-5 md:w-6 h-5 md:h-6 text-primary" />, label: 'Active Learners', value: '2.5K+', color: 'bg-primary/10' },
                { icon: <BrainCircuit className="w-5 md:w-6 h-5 md:h-6 text-secondary" />, label: 'Questions Solved', value: '50K+', color: 'bg-secondary/10' },
                { icon: <Trophy className="w-5 md:w-6 h-5 md:h-6 text-yellow-500" />, label: 'Avg. Score', value: '85%', color: 'bg-yellow-500/10' },
                { icon: <Flame className="w-5 md:w-6 h-5 md:h-6 text-orange-500" />, label: 'Pass Rate', value: '30%', color: 'bg-orange-500/10' }
              ].map((stat, i) => (
                <Card key={i} className="border-none shadow-md rounded-2xl bg-card overflow-hidden">
                  <CardContent className="p-3 md:p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.color} rounded-xl flex items-center justify-center shrink-0`}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-lg md:text-xl font-black text-foreground">{stat.value}</p>
                      <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
              <Card className="lg:col-span-8 overflow-hidden border-none shadow-xl rounded-2xl lg:rounded-[2.5rem] bg-gradient-to-br from-card to-background group relative">
                <CardHeader className="p-6 md:p-10 lg:p-12 space-y-4 md:space-y-6 lg:space-y-8 relative z-10">
                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <Badge variant="secondary" className="font-bold text-[9px] md:text-[10px] uppercase px-3 md:px-4 py-1 bg-primary/10 text-primary border-none">LET Board Simulation</Badge>
                    <div className="flex items-center gap-1 text-orange-500 bg-orange-500/10 px-2 md:px-3 py-1 rounded-full"><Flame className="w-3 h-3 fill-current" /><span className="text-[9px] md:text-[10px] font-bold uppercase">Adaptive</span></div>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] animate-fade-in-up text-foreground">The <span className="text-gradient italic">Ultimate</span> <br /> Teacher Prep.</h2>
                    <p className="text-muted-foreground font-medium md:text-lg animate-fade-in-up delay-200">Master Gen Ed, Prof Ed, and your Majorship with high-fidelity AI-powered simulations.</p>
                  </div>
                  <Button size="lg" disabled={loading} onClick={() => startExam('all')} className="h-12 md:h-16 px-6 md:px-10 rounded-xl md:rounded-2xl font-bold md:font-black text-sm md:text-lg gap-2 md:gap-3 shadow-lg md:shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all bg-primary hover:bg-primary/90 text-primary-foreground animate-fade-in-up delay-300 hover:animate-pulse-glow">
                    <Zap className="w-5 md:w-6 h-5 md:h-6 fill-current" /> <span className="hidden sm:inline">Start Full Simulation</span><span className="sm:hidden">Start Now</span>
                  </Button>
                </CardHeader>
                <div className="absolute top-0 right-0 w-24 h-24 md:w-40 md:h-40 lg:w-48 lg:h-48 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 md:translate-x-1/2 animate-float" />
                <div className="absolute bottom-0 left-0 w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 bg-secondary/10 rounded-full translate-y-1/2 -translate-x-1/3 md:-translate-x-1/2 animate-float delay-300" />
              </Card>

              <div className="lg:col-span-4 space-y-4">
                {!user ? (
                  <Card className="border-none shadow-xl rounded-2xl bg-card overflow-hidden relative border-2 border-primary/20">
                    <CardContent className="p-5 md:p-6 space-y-4 relative z-10 text-center">
                      <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
                        <GraduationCap className="w-8 h-8 text-primary" />
                      </div>
                      <p className="font-black text-xl md:text-2xl text-foreground">LET Prep Pro</p>
                      <p className="text-xs md:text-sm text-muted-foreground">Master your board exam with AI-powered simulations</p>
                      <div className="space-y-2 pt-2">
                        <Button onClick={loginWithGoogle} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold gap-2">
                          <GoogleIcon /> Continue with Google
                        </Button>
                        <Button onClick={loginWithFacebook} variant="outline" className="w-full h-12 border-primary text-primary hover:bg-primary/5 rounded-xl font-bold gap-2">
                          <FacebookIcon /> Sign in with Facebook
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-none shadow-lg rounded-2xl bg-primary text-primary-foreground overflow-hidden">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="flex items-center gap-2 md:gap-3">
                          <Avatar className="w-10 h-10 md:w-12 md:h-12 border-2 border-white/30">
                            <AvatarImage src={user.photoURL || ''} />
                            <AvatarFallback className="bg-white/20 text-white font-bold text-sm">{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-sm md:text-base truncate max-w-[100px] md:max-w-[180px]">{user.displayName || 'Educator'}</p>
                            <p className="text-[10px] md:text-xs opacity-80">{user.majorship || 'Not selected'}</p>
                          </div>
                        </div>
                        <Badge className="bg-white/20 text-white border-none text-[10px] md:text-xs font-bold">{user.isPro ? 'PRO' : 'FREE'}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 md:gap-4">
                        <div className="text-center p-2 md:p-3 bg-white/10 rounded-xl">
                          <Zap className="w-4 h-4 mx-auto mb-1" />
                          <p className="font-black text-lg md:text-xl">{user.credits || 0}</p>
                          <p className="text-[8px] md:text-[9px] uppercase opacity-80">Credits</p>
                        </div>
                        <div className="text-center p-2 md:p-3 bg-white/10 rounded-xl">
                          <Flame className="w-4 h-4 mx-auto mb-1" />
                          <p className="font-black text-lg md:text-xl">{user.streakCount || 0}</p>
                          <p className="text-[8px] md:text-[9px] uppercase opacity-80">Streak</p>
                        </div>
                        <div className="text-center p-2 md:p-3 bg-white/10 rounded-xl">
                          <Trophy className="w-4 h-4 mx-auto mb-1" />
                          <p className="font-black text-lg md:text-xl">{user.referralCount || 0}</p>
                          <p className="text-[8px] md:text-[9px] uppercase opacity-80">Referrals</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Leaderboard />
              </div>

              <div className="lg:col-span-12 space-y-8 md:space-y-10">
                <EventsSection />
                <DailyTaskDashboard />
                <ReferralSystem />
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-3 md:px-4 py-8 md:py-12 space-y-6 md:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-2 md:px-4">
              <h3 className="text-2xl md:text-3xl font-black tracking-tight animate-fade-in-up text-foreground">Simulation Tracks</h3>
              <p className="text-sm text-muted-foreground font-medium">Choose your exam category to begin</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {[
                { 
                  name: 'General Education', 
                  icon: <Languages className="w-6 md:w-7 h-6 md:h-7" />, 
                  color: 'bg-blue-500/10 text-blue-500', 
                  borderColor: 'border-blue-500/20', 
                  hoverBg: 'hover:bg-blue-500', 
                  bgGradient: 'from-blue-500/5 to-transparent',
                  id: 'General Education', 
                  delay: 'delay-100',
                  description: 'Language, Mathematics, Science & Humanities'
                },
                { 
                  name: 'Professional Education', 
                  icon: <BookOpen className="w-6 md:w-7 h-6 md:h-7" />, 
                  color: 'bg-purple-500/10 text-purple-500', 
                  borderColor: 'border-purple-500/20', 
                  hoverBg: 'hover:bg-purple-500', 
                  bgGradient: 'from-purple-500/5 to-transparent',
                  id: 'Professional Education', 
                  delay: 'delay-200',
                  description: 'Teaching Principles & Child Development'
                },
                { 
                  name: user?.majorship || 'Specialization', 
                  icon: <Star className="w-6 md:w-7 h-6 md:h-7" />, 
                  color: 'bg-emerald-500/10 text-emerald-500', 
                  borderColor: 'border-emerald-500/20', 
                  hoverBg: 'hover:bg-emerald-500', 
                  bgGradient: 'from-emerald-500/5 to-transparent',
                  id: 'Specialization', 
                  delay: 'delay-300',
                  description: 'Your chosen major field of specialization'
                }
              ].map((track, i) => (
                <Card 
                  key={i} 
                  onClick={() => !loading && startExam(track.id as any)} 
                  className={`
                    border-2 ${track.borderColor} 
                    shadow-md hover:shadow-2xl 
                    transition-all rounded-2xl 
                    bg-gradient-to-br ${track.bgGradient}
                    group cursor-pointer 
                    overflow-hidden flex flex-col 
                    animate-fade-in-up ${track.delay} 
                    hover:scale-[1.02] hover:-translate-y-1
                    relative bg-card
                  `}
                >
                  <div className="absolute top-3 right-3">
                    <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-[9px] font-black uppercase tracking-wider text-foreground border-border">
                      Practice Now
                    </Badge>
                  </div>
                  
                  <CardHeader className="p-5 md:p-7 pb-3 md:pb-4">
                    <div className={`w-14 h-14 md:w-16 md:h-16 ${track.color} rounded-2xl flex items-center justify-center mb-4 md:mb-5 shadow-sm border border-border`}>
                      {track.icon}
                    </div>
                    <h4 className="text-lg md:text-xl font-black tracking-tight group-hover:text-primary transition-colors text-foreground">{track.name}</h4>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground line-clamp-2">{track.description}</p>
                  </CardHeader>
                  <CardFooter className="p-5 md:p-7 pt-0 mt-auto">
                    <div className={`
                      w-full justify-center font-bold text-sm md:text-base 
                      h-11 md:h-12 px-5 md:px-6 rounded-xl 
                      flex items-center border-2 border-current
                      ${track.hoverBg} group-hover:text-primary-foreground 
                      transition-all bg-card text-foreground
                      group-hover:shadow-lg
                    `}>
                      Start Practice <ChevronRight className="w-4 h-4 ml-2" />
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
      <MobileBottomNav isSignedIn={!!user} />
    </div>
  );
}