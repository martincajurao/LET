
'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  GraduationCap, 
  BrainCircuit, 
  Languages, 
  ChevronRight,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Target,
  BarChart3,
  BookOpen,
  Trophy,
  Flame,
  Star,
  Users,
  LogOut,
  Loader2,
  LayoutDashboard
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import { DailyTaskDashboard } from '@/components/ui/daily-task-dashboard';
import { ReferralSystem } from '@/components/ui/referral-system';
import { Leaderboard } from '@/components/ui/leaderboard';
import { EventsSection } from '@/components/ui/EventsSection';

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

function sanitizeData(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeData);
  const sanitized: any = {};
  for (const key in data) { sanitized[key] = sanitizeData(data[key]); }
  return sanitized;
}

export default function LetsPrepApp() {
  const { user, loading: authLoading, logout, updateProfile, loginWithGoogle, loginAnonymously, bypassLogin } = useUser();
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

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-body pb-20">
      <Toaster />
      <Dialog open={authIssue} onOpenChange={setAuthIssue}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader><DialogTitle className="font-black">Authentication Required</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Button onClick={loginWithGoogle} className="h-14 rounded-xl font-black gap-2"><GoogleIcon /> Sign in with Google</Button>
            <Button variant="secondary" onClick={loginAnonymously} className="h-14 rounded-xl font-black">Guest Access</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={loading}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl bg-white rounded-[2rem]">
          <DialogHeader><DialogTitle className="text-center font-black">{loadingMessage}</DialogTitle></DialogHeader>
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
          <Card className="max-w-md w-full rounded-[2.5rem]">
            <CardHeader className="text-center pt-10"><CardTitle className="text-2xl font-black">Choose Your Majorship</CardTitle></CardHeader>
            <CardContent className="pb-12 pt-4 px-10">
              <Select onValueChange={(val) => { updateProfile({ majorship: val }); setState('dashboard'); }}>
                <SelectTrigger className="h-14 rounded-2xl font-black"><SelectValue placeholder="Select track..." /></SelectTrigger>
                <SelectContent>{MAJORSHIPS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
             <Card className="lg:col-span-8 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white group relative">
              <CardHeader className="p-12 space-y-8 relative z-10">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="font-black text-[10px] uppercase px-4 py-1.5 bg-primary/10 text-primary border-none">LET Board Simulation</Badge>
                  <div className="flex items-center gap-1 text-orange-500 bg-orange-50 px-3 py-1 rounded-full"><Flame className="w-3 h-3 fill-current" /><span className="text-[10px] font-black uppercase">Adaptive Learning</span></div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-5xl md:text-6xl font-black tracking-tighter leading-[1.1]">The <span className="text-primary italic">Ultimate</span> <br /> Teacher Prep.</h2>
                  <p className="text-slate-500 font-medium max-w-lg text-lg">Master Gen Ed, Prof Ed, and your Majorship with high-fidelity Puter-powered simulations.</p>
                </div>
                <Button size="lg" disabled={loading} onClick={() => startExam('all')} className="h-16 px-10 rounded-2xl font-black text-lg gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all bg-primary hover:bg-primary/90 text-slate-900">
                  <Zap className="w-6 h-6 fill-current" /> Start Full Simulation
                </Button>
              </CardHeader>
            </Card>

            <div className="lg:col-span-4"><Leaderboard /></div>

            <div className="lg:col-span-12 space-y-12">
                <EventsSection />
                <DailyTaskDashboard />
                <ReferralSystem />
            </div>

            <div className="lg:col-span-12 space-y-8">
              <h3 className="text-3xl font-black tracking-tight px-4">Simulation Tracks</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { name: 'General Education', icon: <Languages className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600', id: 'General Education' },
                  { name: 'Professional Education', icon: <BookOpen className="w-6 h-6" />, color: 'bg-purple-50 text-purple-600', id: 'Professional Education' },
                  { name: user?.majorship || 'Specialization', icon: <Star className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600', id: 'Specialization' }
                ].map((track, i) => (
                  <Card key={i} onClick={() => !loading && startExam(track.id as any)} className="border-2 shadow-lg hover:shadow-primary/20 transition-all rounded-[2.5rem] bg-white group cursor-pointer overflow-hidden flex flex-col">
                    <CardHeader className="p-8 pb-4">
                        <div className={`w-16 h-16 ${track.color} rounded-2xl flex items-center justify-center mb-6 shadow-md border`}>{track.icon}</div>
                        <h4 className="text-xl font-black tracking-tight">{track.name}</h4>
                    </CardHeader>
                    <CardFooter className="p-8 pt-0 mt-auto"><div className="w-full justify-center font-bold text-sm h-12 px-6 rounded-xl flex items-center border-2 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">Start Track <ChevronRight className="w-4 h-4 ml-2" /></div></CardFooter>
                </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
