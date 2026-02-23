'use client'

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="min-h-screen bg-[#F8FAFC] font-body pb-10 overflow-x-hidden">
      <Toaster />
      
      {/* Auth Dialog */}
      <Dialog open={authIssue} onOpenChange={setAuthIssue}>
        <DialogContent className="rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary h-2 w-full" />
          <div className="p-8 pt-6">
            <DialogHeader className="mb-6 text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight">Access Your Tracks</DialogTitle>
              <p className="text-slate-500 font-medium text-sm">Sign in to sync your board readiness score and earn AI credits.</p>
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
        <div className="max-w-7xl mx-auto p-4"><ExamInterface questions={currentQuestions} timePerQuestion={timePerQuestion} onComplete={handleExamComplete} /></div>
      ) : state === 'results' ? (
        <div className="max-w-7xl mx-auto p-4"><ResultsOverview questions={currentQuestions} answers={examAnswers} timeSpent={examTime} aiSummary={aiSummary} onRestart={() => setState('dashboard')} /></div>
      ) : state === 'registration' ? (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <Card className="max-w-md w-full rounded-[2.5rem] shadow-2xl border-none overflow-hidden group">
            <div className="h-2 bg-primary group-hover:h-3 transition-all" />
            <CardHeader className="text-center pt-10 pb-4">
              <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-black tracking-tight">Tailor Your Path</CardTitle>
              <CardDescription className="text-slate-500 font-medium px-6 text-xs">Select your professional majorship to calibrate your Specialization track.</CardDescription>
            </CardHeader>
            <CardContent className="pb-10 pt-4 px-10">
              <Select onValueChange={(val) => { updateProfile({ majorship: val }); setState('dashboard'); }}>
                <SelectTrigger className="h-14 rounded-xl font-black border-2 text-base shadow-sm">
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
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-8">
          {/* Main Top Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              <Card className="overflow-hidden border-none shadow-xl rounded-[2rem] bg-white relative min-h-[380px] flex flex-col justify-center">
                <div className="absolute inset-0 bg-mesh opacity-100" />
                <div className="absolute top-10 right-10 w-24 h-24 bg-primary/20 blur-3xl rounded-full animate-float" />
                
                <CardHeader className="p-8 md:p-12 space-y-4 relative z-10">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-primary/20 text-primary border-none font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest">
                      Board Simulator
                    </Badge>
                    <div className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                      <Sparkles className="w-3 h-3 fill-current" />
                      <span className="text-[9px] font-black uppercase tracking-wider">AI Integrated</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-w-xl">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-slate-900">
                      The Ultimate <br /> <span className="text-primary italic">Teacher Prep.</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-base md:text-lg leading-relaxed">
                      Master General Education, Professional Education, and your Majorship with high-fidelity adaptive simulations.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <Button size="lg" disabled={loading} onClick={() => startExam('all')} className="h-14 md:h-16 px-8 rounded-xl font-black text-base gap-2 shadow-xl shadow-primary/30 hover:scale-[1.02] transition-all bg-primary hover:bg-primary/90 text-slate-900">
                      <Zap className="w-5 h-5 fill-current" /> Start Simulation
                    </Button>
                    <Button variant="outline" size="lg" className="h-14 md:h-16 px-6 rounded-xl font-black border-2 border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 text-sm">
                      Track Roadmap <ArrowUpRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Simulation Tracks Integrated Header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xl font-black tracking-tight text-slate-900">Focused Tracks</h3>
                  <Button variant="ghost" size="sm" className="font-black text-primary gap-1 text-xs">View All <ChevronRight className="w-3 h-3" /></Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { name: 'Gen Ed', icon: <Languages className="w-6 h-6" />, lightColor: 'bg-blue-50 text-blue-600', borderColor: 'border-blue-100', id: 'General Education', desc: 'Social Sciences & Applied Sciences.' },
                    { name: 'Prof Ed', icon: <BookOpen className="w-6 h-6" />, lightColor: 'bg-purple-50 text-purple-600', borderColor: 'border-purple-100', id: 'Professional Education', desc: 'Methodologies & Development.' },
                    { name: user?.majorship || 'Majorship', icon: <Star className="w-6 h-6" />, lightColor: 'bg-emerald-50 text-emerald-600', borderColor: 'border-emerald-100', id: 'Specialization', desc: 'Expertise in your specific field.' }
                  ].map((track, i) => (
                    <Card key={i} onClick={() => !loading && startExam(track.id as any)} className={`border-2 ${track.borderColor} shadow-sm hover:shadow-lg transition-all rounded-[1.5rem] bg-white group cursor-pointer overflow-hidden flex flex-col hover:-translate-y-1`}>
                      <CardHeader className="p-5 pb-3 space-y-3">
                        <div className={`w-12 h-12 ${track.lightColor} rounded-xl flex items-center justify-center border border-white/50 group-hover:scale-110 transition-transform duration-500`}>
                          {track.icon}
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-lg font-black tracking-tight text-slate-900">{track.name}</h4>
                          <p className="text-slate-400 text-[10px] font-medium leading-tight">{track.desc}</p>
                        </div>
                      </CardHeader>
                      <CardFooter className="p-5 pt-2 mt-auto">
                        <div className={`w-full justify-center font-black text-[10px] h-10 px-4 rounded-lg flex items-center border-2 border-slate-50 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all duration-300 gap-1.5`}>
                          Launch <ArrowUpRight className="w-3 h-3" />
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Section */}
            <div className="lg:col-span-4 space-y-6">
              {user ? (
                <Card className="border-none shadow-xl rounded-[2rem] bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden group">
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 border-2 border-white/40 shadow-lg rounded-xl">
                          <AvatarImage src={user.photoURL || ''} />
                          <AvatarFallback className="bg-white/20 text-white font-black text-base">{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-black text-lg truncate max-w-[140px]">{user.displayName || 'Educator'}</p>
                          <Badge className="bg-white/20 text-white border-none font-black text-[8px] uppercase tracking-widest">{user.majorship || 'Generalist'}</Badge>
                        </div>
                      </div>
                      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/20">
                        <ShieldCheck className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: <Zap className="w-4 h-4 text-yellow-300" />, val: user.credits || 0, label: 'Credits' },
                        { icon: <Flame className="w-4 h-4 text-orange-400" />, val: user.streakCount || 0, label: 'Streak' },
                        { icon: <Trophy className="w-4 h-4 text-yellow-400" />, val: user.referralCount || 0, label: 'Invites' }
                      ].map((stat, i) => (
                        <div key={i} className="text-center p-3 bg-white/15 rounded-xl border border-white/10">
                          {stat.icon}
                          <p className="font-black text-xl mt-1 leading-none">{stat.val}</p>
                          <p className="text-[7px] uppercase font-black tracking-widest opacity-70 mt-1">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-none shadow-xl rounded-[2rem] bg-slate-900 text-white overflow-hidden p-6 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black tracking-tight">Ready to Rank?</h3>
                    <p className="text-slate-400 font-medium text-xs">Join 5,000+ educators preparing for excellence.</p>
                  </div>
                  <div className="space-y-2 pt-1">
                    <Button onClick={loginWithGoogle} className="w-full h-12 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-black gap-2 text-sm shadow-xl transition-all">
                      <GoogleIcon /> Sign in with Google
                    </Button>
                    <Button onClick={loginAnonymously} variant="outline" className="w-full h-10 border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg font-bold text-xs">
                      Try as Guest
                    </Button>
                  </div>
                </Card>
              )}

              {/* Tighter Stats Row */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Pass Rate', value: '92%', color: 'text-emerald-600' },
                  { label: 'Board Items', value: '10k+', color: 'text-blue-600' }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <span className={`text-xl font-black ${item.color}`}>{item.value}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>

              <Leaderboard />
            </div>
          </div>

          {/* Bottom Gamification Section */}
          <div className="space-y-6">
            <EventsSection />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DailyTaskDashboard />
              <ReferralSystem />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
