'use client'

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle, 
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Languages,
  ChevronRight,
  Zap,
  BookOpen,
  Trophy,
  Flame,
  Star,
  Loader2,
  BrainCircuit,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Users
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
  const { user, loading: authLoading, loginWithGoogle, loginWithFacebook, loginAnonymously, updateProfile } = useUser();
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

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-body pb-20 overflow-x-hidden">
      <Toaster />
      
      {/* Auth Dialog */}
      <Dialog open={authIssue} onOpenChange={setAuthIssue}>
        <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary h-2 w-full" />
          <div className="p-8 pt-6">
            <DialogHeader className="mb-6 text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight">Access Your Tracks</DialogTitle>
              <p className="text-slate-500 font-medium">Sign in to sync your board readiness score and earn AI credits.</p>
            </DialogHeader>
            <div className="grid gap-3">
              <Button onClick={loginWithGoogle} className="h-14 rounded-2xl font-black gap-3 shadow-lg shadow-primary/10 transition-transform active:scale-95"><GoogleIcon /> Continue with Google</Button>
              <Button onClick={loginWithFacebook} variant="outline" className="h-14 rounded-2xl font-black gap-3 border-2 transition-transform active:scale-95"><FacebookIcon /> Continue with Facebook</Button>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-white px-4 text-slate-400">Or proceed as guest</span></div>
              </div>
              <Button variant="secondary" onClick={loginAnonymously} className="h-12 rounded-xl font-bold transition-transform active:scale-95">Try Simulation (Guest)</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading Dialog */}
      <Dialog open={loading}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl bg-white rounded-[2.5rem] p-10 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${loadingStep}%` }} /></div>
          <div className="space-y-8 text-center py-4">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-primary/10 rounded-3xl animate-pulse-slow" />
              <div className="relative w-full h-full flex items-center justify-center">
                <BrainCircuit className="w-10 h-10 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-xl text-slate-800">{loadingMessage}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Board Prep Calibration</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {state === 'exam' ? (
        <div className="max-w-7xl mx-auto p-4 md:p-8"><ExamInterface questions={currentQuestions} timePerQuestion={timePerQuestion} onComplete={handleExamComplete} /></div>
      ) : state === 'results' ? (
        <div className="max-w-7xl mx-auto p-4 md:p-8"><ResultsOverview questions={currentQuestions} answers={examAnswers} timeSpent={examTime} aiSummary={aiSummary} onRestart={() => setState('dashboard')} /></div>
      ) : state === 'registration' ? (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <Card className="max-w-md w-full rounded-[3rem] shadow-2xl border-none overflow-hidden group">
            <div className="h-2 bg-primary group-hover:h-3 transition-all" />
            <CardHeader className="text-center pt-12">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-black tracking-tight">Tailor Your Path</CardTitle>
              <CardDescription className="text-slate-500 font-medium px-6">Select your professional majorship to calibrate your Specialization track.</CardDescription>
            </CardHeader>
            <CardContent className="pb-12 pt-6 px-10">
              <Select onValueChange={(val) => { updateProfile({ majorship: val }); setState('dashboard'); }}>
                <SelectTrigger className="h-16 rounded-[1.25rem] font-black border-2 text-lg shadow-sm">
                  <SelectValue placeholder="Select your majorship..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {MAJORSHIPS.map(m => <SelectItem key={m} value={m} className="font-bold py-3">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-12">
            {/* Enhanced Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-8">
                <Card className="overflow-hidden border-none shadow-2xl rounded-[2.5rem] lg:rounded-[3.5rem] bg-white relative group min-h-[400px] flex flex-col justify-center">
                  <div className="absolute inset-0 bg-mesh opacity-100" />
                  <div className="absolute top-10 right-10 w-24 h-24 bg-primary/20 blur-3xl rounded-full animate-float" />
                  <div className="absolute bottom-10 left-10 w-32 h-32 bg-secondary/20 blur-3xl rounded-full animate-float" style={{ animationDelay: '2s' }} />
                  
                  <CardHeader className="p-8 md:p-12 lg:p-16 space-y-6 relative z-10">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge className="bg-primary/20 text-primary border-none font-black text-[10px] md:text-xs px-4 py-1.5 rounded-full uppercase tracking-widest">
                        High-Fidelity Board Simulator
                      </Badge>
                      <div className="flex items-center gap-1.5 text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">AI Powered</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4 max-w-2xl">
                      <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] text-slate-900">
                        The <span className="text-primary italic relative">Ultimate<span className="absolute -bottom-2 left-0 w-full h-2 bg-primary/20 -skew-x-12" /></span> <br /> Teacher Prep.
                      </h1>
                      <p className="text-slate-500 font-medium text-lg md:text-xl leading-relaxed">
                        Master General Education, Professional Education, and your Majorship with high-fidelity adaptive simulations.
                      </p>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-4">
                      <Button size="lg" disabled={loading} onClick={() => startExam('all')} className="h-16 md:h-20 px-10 md:px-12 rounded-2xl md:rounded-[1.5rem] font-black text-lg md:text-xl gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all bg-primary hover:bg-primary/90 text-slate-900">
                        <Zap className="w-6 h-6 fill-current" /> Start Full Simulation
                      </Button>
                      <Button variant="outline" size="lg" className="h-16 md:h-20 px-8 rounded-2xl md:rounded-[1.5rem] font-black border-2 border-slate-200 text-slate-600 hover:bg-slate-50 gap-2">
                        View Track Roadmap <ArrowUpRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                {/* Trust/Impact Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
                  {[
                    { label: 'Questions', value: '10k+', color: 'text-blue-600' },
                    { label: 'Mock Tests', value: '5k+', color: 'text-purple-600' },
                    { label: 'Pass Rate', value: '92%', color: 'text-emerald-600' },
                    { label: 'AI Credits', value: '50k+', color: 'text-orange-600' }
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center justify-center p-4 bg-white/50 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-sm">
                      <span className={`text-2xl font-black ${item.color}`}>{item.value}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar Column */}
              <div className="lg:col-span-4 space-y-6">
                {user ? (
                  <Card className="border-none shadow-2xl rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden relative group">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-8 relative z-10">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-14 h-14 border-[3px] border-white/40 shadow-xl rounded-2xl">
                            <AvatarImage src={user.photoURL || ''} />
                            <AvatarFallback className="bg-white/20 text-white font-black text-lg">{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-black text-xl truncate max-w-[180px]">{user.displayName || 'Educator'}</p>
                            <Badge className="bg-white/20 text-white border-none font-black text-[9px] uppercase tracking-widest">{user.majorship || 'Not selected'}</Badge>
                          </div>
                        </div>
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/20">
                          <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-4 bg-white/15 rounded-2xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                          <Zap className="w-5 h-5 mx-auto mb-2 text-yellow-300" />
                          <p className="font-black text-2xl">{user.credits || 0}</p>
                          <p className="text-[8px] uppercase font-black tracking-widest opacity-70">Credits</p>
                        </div>
                        <div className="text-center p-4 bg-white/15 rounded-2xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                          <Flame className="w-5 h-5 mx-auto mb-2 text-orange-400" />
                          <p className="font-black text-2xl">{user.streakCount || 0}</p>
                          <p className="text-[8px] uppercase font-black tracking-widest opacity-70">Streak</p>
                        </div>
                        <div className="text-center p-4 bg-white/15 rounded-2xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                          <Trophy className="w-5 h-5 mx-auto mb-2 text-yellow-400" />
                          <p className="font-black text-2xl">{user.referralCount || 0}</p>
                          <p className="text-[8px] uppercase font-black tracking-widest opacity-70">Invites</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-none shadow-2xl rounded-[2.5rem] bg-slate-900 text-white overflow-hidden p-8 space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black tracking-tight">Ready to Rank?</h3>
                      <p className="text-slate-400 font-medium text-sm">Join thousands of professional educators preparing for excellence.</p>
                    </div>
                    <div className="space-y-3 pt-2">
                      <Button onClick={loginWithGoogle} className="w-full h-14 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-black gap-3 text-base shadow-xl active:scale-95 transition-all">
                        <GoogleIcon /> Sign in with Google
                      </Button>
                      <Button onClick={loginAnonymously} variant="outline" className="w-full h-12 border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl font-bold text-sm">
                        Continue as Guest
                      </Button>
                    </div>
                  </Card>
                )}
                <Leaderboard />
              </div>
            </div>

            {/* Simulation Tracks Grid */}
            <div className="space-y-8 pt-4">
              <div className="flex items-center justify-between px-4">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tight text-slate-900">Simulation Tracks</h3>
                  <p className="text-slate-500 font-medium text-sm uppercase tracking-widest">Focused Preparation Areas</p>
                </div>
                <Button variant="ghost" className="font-black text-primary gap-2">View All Tracks <ChevronRight className="w-4 h-4" /></Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {[
                  { name: 'General Education', icon: <Languages className="w-7 h-7" />, color: 'from-blue-500 to-blue-600', lightColor: 'bg-blue-50 text-blue-600', borderColor: 'border-blue-100', id: 'General Education', desc: 'Cover Humanities, Social Sciences, and Applied Sciences.' },
                  { name: 'Professional Education', icon: <BookOpen className="w-7 h-7" />, color: 'from-purple-500 to-purple-600', lightColor: 'bg-purple-50 text-purple-600', borderColor: 'border-purple-100', id: 'Professional Education', desc: 'Focus on Teaching Methodologies and Child Development.' },
                  { name: user?.majorship || 'Specialization', icon: <Star className="w-7 h-7" />, color: 'from-emerald-500 to-emerald-600', lightColor: 'bg-emerald-50 text-emerald-600', borderColor: 'border-emerald-100', id: 'Specialization', desc: 'Master your specific field of expertise and majorship.' }
                ].map((track, i) => (
                  <Card key={i} onClick={() => !loading && startExam(track.id as any)} className={`border-2 ${track.borderColor} shadow-lg hover:shadow-2xl transition-all rounded-[2.5rem] bg-white group cursor-pointer overflow-hidden flex flex-col hover:-translate-y-2`}>
                    <CardHeader className="p-8 pb-4 space-y-6">
                      <div className={`w-16 h-16 ${track.lightColor} rounded-2xl flex items-center justify-center shadow-inner border border-white/50 group-hover:scale-110 transition-transform duration-500`}>
                        {track.icon}
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-2xl font-black tracking-tight text-slate-900">{track.name}</h4>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">{track.desc}</p>
                      </div>
                    </CardHeader>
                    <CardFooter className="p-8 pt-4 mt-auto">
                      <div className={`w-full justify-center font-black text-sm h-14 px-6 rounded-2xl flex items-center border-2 border-slate-100 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all duration-300 gap-2`}>
                        Launch Simulation <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>

            {/* Gamification Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
              <div className="lg:col-span-12 space-y-12">
                <EventsSection />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <DailyTaskDashboard />
                  <ReferralSystem />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}