'use client'

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
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
  BookOpen,
  TrendingUp,
  ShieldCheck,
  Smartphone,
  Facebook
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
import { cn } from "@/lib/utils";

type AppState = 'dashboard' | 'exam' | 'results' | 'registration';

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

export default function LetsPrepApp() {
  const { user, loading: authLoading, updateProfile, loginWithGoogle, loginWithFacebook, loginAnonymously } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
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

  useEffect(() => {
    const startCat = searchParams.get('start');
    if (startCat && state === 'dashboard' && user) {
      startExam(startCat as any);
    }
  }, [searchParams, user, state]);

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
          if (category === 'Specialization') return q.subject === 'Specialization' && q.subCategory === (user?.majorship || 'English');
          return q.subject === category;
        });
        let limitCount = category === 'Professional Education' ? limits.limitProfEd : (category === 'Specialization' ? limits.limitSpec : limits.limitGenEd);
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

    await addDoc(collection(firestore, "exam_results"), resultsData);
    await updateDoc(doc(firestore, 'users', user.uid), {
      dailyQuestionsAnswered: increment(currentQuestions.length),
      dailyTestsFinished: increment(1),
      lastActiveDate: serverTimestamp()
    });

    setLoadingStep(100);
    setTimeout(() => { setState('results'); setLoading(false); }, 500);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-body transition-all duration-300">
      <Toaster />
      
      <Dialog open={authIssue} onOpenChange={setAuthIssue}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-8 max-w-sm">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black">Authentication Required</DialogTitle>
            <DialogDescription className="text-muted-foreground">Sign in to track your progress and earn credits.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-6">
            <Button onClick={loginWithGoogle} className="h-14 rounded-2xl font-bold gap-3 shadow-lg"><Zap className="w-5 h-5 fill-current" /> Continue with Google</Button>
            <Button onClick={loginWithFacebook} className="h-14 rounded-2xl font-bold gap-3 shadow-lg bg-[#1877F2] text-white hover:bg-[#1877F2]/90 border-none">
              <Facebook className="w-5 h-5 fill-current" /> Continue with Facebook
            </Button>
            <Button variant="outline" onClick={loginAnonymously} className="h-14 rounded-2xl font-bold border-2">Guest Simulation</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={loading}>
        <DialogContent className="max-w-[300px] border-none shadow-2xl bg-card rounded-[2.5rem] p-8">
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
      ) : state === 'registration' ? (
        <div className="min-h-[80vh] flex items-center justify-center p-6 animate-md-slide-up">
          <Card className="w-full max-w-sm rounded-[3rem] bg-card border-none shadow-2xl p-8 text-center space-y-8">
            <div className="space-y-2">
              <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto">
                <GraduationCap className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">Select Majorship</h2>
              <p className="text-muted-foreground text-sm font-medium">This will calibrate your specialization track.</p>
            </div>
            <Select onValueChange={(val) => { updateProfile({ majorship: val }); setState('dashboard'); }}>
              <SelectTrigger className="h-16 rounded-2xl font-black border-2 text-lg px-6"><SelectValue placeholder="Select your field..." /></SelectTrigger>
              <SelectContent className="rounded-2xl">{MAJORSHIPS.map(m => <SelectItem key={m} value={m} className="font-bold py-4">{m}</SelectItem>)}</SelectContent>
            </Select>
          </Card>
        </div>
      ) : (
<<<<<<< HEAD
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Zap className="w-4 h-4 text-yellow-500" />, label: 'Credits', value: user?.credits || 0, color: 'text-yellow-500 bg-yellow-500/10' },
              { icon: <Flame className="w-4 h-4 text-orange-500" />, label: 'Streak', value: user?.streakCount || 0, color: 'text-orange-500 bg-orange-500/10' },
              { icon: <Target className="w-4 h-4 text-blue-500" />, label: 'Accuracy', value: '85%', color: 'text-blue-500 bg-blue-500/10' },
              { icon: <Trophy className="w-4 h-4 text-emerald-500" />, label: 'Rank', value: '#12', color: 'text-emerald-500 bg-emerald-500/10' }
            ].map((stat, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", stat.color)}>{stat.icon}</div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                  <p className="text-lg font-black text-foreground leading-none">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
=======
        <>
          <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-12">
            {/* Enhanced Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-8 space-y-10">
                <Card className="overflow-hidden border-none shadow-2xl rounded-[2.5rem] lg:rounded-[3.5rem] bg-white relative group min-h-[420px] flex flex-col justify-center">
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
>>>>>>> ee6a65c (fix the white spaces of columns)

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <Card className="overflow-hidden border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-card to-background relative p-8 md:p-12">
                <div className="relative z-10 space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="secondary" className="font-black text-[10px] uppercase px-4 py-1 bg-primary/20 text-primary border-none">Simulation 2.0</Badge>
                    <div className="flex items-center gap-1.5 text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full"><Smartphone className="w-3.5 h-3.5" /><span className="text-[10px] font-black uppercase">App Ready</span></div>
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] text-foreground">Prepare for the <br /><span className="text-primary italic">Board Exam.</span></h1>
                    <p className="text-muted-foreground font-medium md:text-xl max-w-lg">Experience high-fidelity simulations with AI pedagogical analysis tailored for Filipino educators.</p>
                  </div>
                  <Button size="lg" disabled={loading} onClick={() => startExam('all')} className="h-14 md:h-16 px-8 md:px-12 rounded-2xl font-black text-base md:text-lg gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all group">
                    <Zap className="w-6 h-6 fill-current" /> <span>Launch Full Battle</span> <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 animate-md-slide-up" />
              </Card>

<<<<<<< HEAD
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
=======
                {/* Trust/Impact Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Questions', value: '10k+', color: 'text-blue-600' },
                    { label: 'Mock Tests', value: '5k+', color: 'text-purple-600' },
                    { label: 'Pass Rate', value: '92%', color: 'text-emerald-600' },
                    { label: 'AI Credits', value: '50k+', color: 'text-orange-600' }
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.02] cursor-default">
                      <span className={`text-3xl font-black ${item.color} mb-1`}>{item.value}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
                    </div>
>>>>>>> ee6a65c (fix the white spaces of columns)
                  ))}
                </div>
              </div>

<<<<<<< HEAD
              <div id="events">
                <EventsSection />
=======
              {/* Sidebar Column */}
              <div className="lg:col-span-4 space-y-8">
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
              <div className="flex items-center justify-between px-2">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tight text-slate-900">Simulation Tracks</h3>
                  <p className="text-slate-500 font-medium text-sm uppercase tracking-widest">Focused Preparation Areas</p>
                </div>
                <Button variant="ghost" className="font-black text-primary gap-2">View All Tracks <ChevronRight className="w-4 h-4" /></Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-8">
              <div className="lg:col-span-12 space-y-12">
                <EventsSection />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <DailyTaskDashboard />
                  <ReferralSystem />
                </div>
>>>>>>> ee6a65c (fix the white spaces of columns)
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <DailyTaskDashboard />
              <Leaderboard />
              <ReferralSystem />
              
              <Card className="border-none shadow-lg rounded-[2rem] bg-foreground text-background p-6">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" /> Verified Platform
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-primary">50K+</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Items Solved</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-secondary">85%</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Avg Readiness</p>
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
