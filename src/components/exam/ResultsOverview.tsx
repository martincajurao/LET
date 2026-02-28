"use client"

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Target, 
  BookOpen, 
  ArrowLeft, 
  BrainCircuit, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  LayoutDashboard, 
  ChevronRight, 
  Lock, 
  Play, 
  MessageSquare, 
  Coins, 
  Crown, 
  ShieldCheck, 
  ShieldAlert,
  Zap,
  Star,
  FileText,
  TrendingUp,
  History
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { PersonalizedPerformanceSummaryOutput } from "@/ai/flows/personalized-performance-summary-flow";
import { explainMistakesBatch } from "@/ai/flows/explain-mistakes-batch-flow";
import { Question } from "@/app/lib/mock-data";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { getRankData, XP_REWARDS, DAILY_AD_LIMIT } from '@/lib/xp-system';

interface ResultsOverviewProps {
  questions: Question[];
  answers: Record<string, string>;
  timeSpent: number;
  aiSummary?: PersonalizedPerformanceSummaryOutput;
  onRestart: () => void;
}

function TypewriterText({ text, speed = 15 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return <span>{displayedText}</span>;
}

export function ResultsOverview({ questions, answers, timeSpent, aiSummary, onRestart }: ResultsOverviewProps) {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [localExplanations, setLocalExplanations] = useState<Record<string, string>>({});
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);

  useEffect(() => {
    if (user?.isPro) {
      setIsUnlocked(true);
    }
  }, [user]);

  const stats = useMemo(() => {
    let correct = 0;
    const subjectStats: Record<string, { total: number; correct: number }> = {};

    questions.forEach(q => {
      const key = q.subject === 'Specialization' && q.subCategory 
        ? `${q.subject}: ${q.subCategory}`
        : q.subject;

      if (!subjectStats[key]) subjectStats[key] = { total: 0, correct: 0 };
      subjectStats[key].total++;
      
      if (answers[q.id] === q.correctAnswer) {
        correct++;
        subjectStats[key].correct++;
      }
    });

    const overallScore = Math.round((correct / (questions.length || 1)) * 100);
    const isPassed = overallScore >= 75;
    
    const subjectChartData = Object.entries(subjectStats).map(([name, data]) => ({
      name,
      score: Math.round((data.correct / (data.total || 1)) * 100),
      count: data.total
    }));

    return { correct, total: questions.length, overallScore, isPassed, subjectChartData };
  }, [questions, answers]);

  const pieData = [
    { name: 'Correct', value: stats.correct },
    { name: 'Incorrect', value: stats.total - stats.correct }
  ];

  const COLORS = ['hsl(120, 73%, 75%)', 'hsl(0, 84%, 60%)'];

  const categorizedMistakes = useMemo(() => {
    const categories: Record<string, (Question & { originalIndex: number })[]> = {};
    questions.forEach((q, index) => {
      if (answers[q.id] !== q.correctAnswer) {
        const key = q.subject === 'Specialization' && q.subCategory 
          ? `${q.subject}: ${q.subCategory}`
          : q.subject;

        if (!categories[key]) {
          categories[key] = [];
        }
        categories[key].push({ ...q, originalIndex: index });
      }
    });
    return categories;
  }, [questions, answers]);

  const totalMistakes = useMemo(() => {
    return Object.values(categorizedMistakes).reduce((acc, curr) => acc + curr.length, 0);
  }, [categorizedMistakes]);

  const handleUnlockAnalysisWithAd = async () => {
    if (!user || !firestore) return;
    if ((user.dailyAdCount || 0) >= DAILY_AD_LIMIT) {
      toast({ title: "Allowance Reached", description: "Daily professional clip limit reached.", variant: "destructive" });
      return;
    }

    setUnlocking(true);
    setVerifying(false);

    setTimeout(async () => {
      setVerifying(true);
      setTimeout(async () => {
        try {
          const userRef = doc(firestore, 'users', user.uid);
          await updateDoc(userRef, {
            dailyAdCount: increment(1)
          });
          await refreshUser();
          setIsUnlocked(true);
          setShowPurchaseSuccess(true);
        } catch (e) {
          toast({ variant: "destructive", title: "Unlock Failed", description: "Could not verify clip completion." });
        } finally {
          setUnlocking(false);
          setVerifying(false);
        }
      }, 1500);
    }, 3500);
  };

  const handleUnlockWithCredits = async () => {
    if (!user || !firestore) return;
    const credits = typeof user.credits === 'number' ? user.credits : 0;
    if (credits < 10) {
      toast({ variant: "destructive", title: "Insufficient Credits", description: "Complete daily tasks or watch an ad to earn more!" });
      return;
    }
    
    setUnlocking(true);
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        credits: increment(-10)
      });
      await refreshUser();
      setIsUnlocked(true);
      setShowPurchaseSuccess(true);
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Could not process credit deduction." });
    } finally {
      setUnlocking(false);
    }
  };

  const handleGenerateExplanation = async (q: Question) => {
    if (!user || !firestore) return;
    if (generatingIds.has(q.id) || localExplanations[q.id]) return;

    const isPro = !!user.isPro;
    const credits = typeof user.credits === 'number' ? user.credits : 0;

    if (!isPro && credits < 5) {
      toast({ 
        variant: "destructive", 
        title: "Insufficient Credits", 
        description: "You need 5 Credits for an AI Deep Dive." 
      });
      return;
    }
    
    setGeneratingIds(prev => new Set(prev).add(q.id));
    
    try {
      if (!isPro) {
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, {
          credits: increment(-5),
          mistakesReviewed: increment(1),
          dailyAiUsage: increment(1)
        });
      }

      const result = await explainMistakesBatch({
        mistakes: [{
          questionId: q.id,
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          userAnswer: answers[q.id] || "No Answer",
          subject: q.subject
        }]
      });
      
      if (result.explanations && result.explanations.length > 0) {
        setLocalExplanations(prev => ({ ...prev, [q.id]: result.explanations[0].aiExplanation }));
        await refreshUser();
        if (!isPro) {
          toast({ 
            variant: "reward",
            title: "Insight Unlocked", 
            description: "-5 Credits spent on AI Deep Dive." 
          });
        }
      }
    } catch (e) {
      setLocalExplanations(prev => ({ ...prev, [q.id]: q.explanation || "Review core concepts for this track." }));
    } finally {
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(q.id);
        return next;
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card p-8 rounded-[2.5rem] shadow-sm border border-border/50">
        <div className="space-y-1">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.25em] mb-2 shadow-sm">
            Session Calibration
          </Badge>
          <h1 className="text-3xl font-black tracking-tight leading-none text-foreground">Simulation Result</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-muted-foreground text-sm font-medium">Verified Analytical Session</p>
            <div className="w-1 h-1 bg-border rounded-full" />
            <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">{questions.length} Items</p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" disabled={unlocking} onClick={onRestart} className="flex-1 md:flex-none h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 bg-background border-2 active:scale-95 transition-all">
            <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
            Exit
          </Button>
          <Button onClick={onRestart} disabled={unlocking} className="flex-1 md:flex-none h-12 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 gap-2 active:scale-95 transition-all">
            <History className="w-4 h-4" />
            Retake Simulation
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          <motion.div 
            key="locked-vault"
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: -20, opacity: 0 }}
            className="w-full max-w-2xl mx-auto"
          >
            <Card className="border-none shadow-2xl rounded-[3rem] bg-foreground text-background overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-12 opacity-5"><Lock className="w-48 h-48" /></div>
              <div className="p-10 flex flex-col items-center text-center space-y-8 relative z-10">
                <div className="w-24 h-24 bg-primary/20 rounded-[2.5rem] flex items-center justify-center border-4 border-primary/30 shadow-2xl animate-levitate">
                  <BrainCircuit className="w-12 h-12 text-primary" />
                </div>
                
                <div className="space-y-3">
                  <Badge variant="outline" className="border-primary/30 text-primary font-black text-[10px] uppercase tracking-[0.3em] px-4 py-1 mb-2">
                    Analysis Locked
                  </Badge>
                  <h2 className="text-4xl font-black tracking-tight leading-tight">Unlock Your <br /><span className="text-primary italic">Pedagogical Roadmap</span></h2>
                  <p className="text-muted-foreground font-medium text-base max-w-sm mx-auto leading-relaxed">
                    Get instant access to accuracy charts, subject mastery breakdown, and personalized AI recommendations.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <Button 
                    onClick={handleUnlockAnalysisWithAd}
                    disabled={unlocking || (user?.dailyAdCount || 0) >= DAILY_AD_LIMIT}
                    className="h-16 rounded-[1.75rem] font-black text-xs uppercase tracking-widest gap-3 shadow-2xl transition-all relative overflow-hidden group border-2 border-transparent"
                  >
                    {unlocking && !verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : verifying ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <Play className="w-5 h-5 fill-current" />}
                    {unlocking ? (verifying ? "Verifying..." : "Playing...") : "Watch Professional Clip"}
                    <Badge className="absolute top-2 right-2 bg-background/20 text-background text-[8px] font-black uppercase border-none">FREE</Badge>
                  </Button>

                  <Button 
                    variant="outline"
                    onClick={handleUnlockWithCredits}
                    disabled={unlocking || (user?.credits || 0) < 10}
                    className="h-16 rounded-[1.75rem] font-black text-xs uppercase tracking-widest gap-3 border-2 border-primary/30 bg-primary/5 text-primary shadow-xl shadow-primary/10 transition-all hover:bg-primary/10 active:scale-95 group"
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-black">Unlock Now</span>
                      </div>
                    </div>
                    <div className="animate-breathing-primary bg-background/90 px-3 py-1.5 rounded-xl border-2 border-primary/30 flex items-center gap-2 ml-auto">
                      <span className="font-black text-sm text-primary">10</span>
                      <Coins className="w-4 h-4 text-primary fill-current" />
                    </div>
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground/40 text-[9px] font-black uppercase tracking-[0.25em] pt-4">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Analytical Integrity Guaranteed</span>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div 
            key="unlocked-dashboard"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className={cn(
                "lg:col-span-1 border-none shadow-xl flex flex-col items-center justify-center p-8 rounded-[3rem] relative overflow-hidden",
                stats.isPassed ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-orange-500/10 border border-orange-500/20"
              )}>
                <div className="absolute top-0 left-0 p-6 opacity-5"><TrendingUp className="w-32 h-32" /></div>
                <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={10}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black tracking-tighter text-foreground">{stats.overallScore}%</span>
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">Accuracy</span>
                  </div>
                </div>
                <Badge variant={stats.isPassed ? "secondary" : "destructive"} className="px-8 py-2 text-xs font-black uppercase tracking-[0.3em] shadow-lg mb-8 rounded-full border-none">
                  {stats.isPassed ? "Simulation Passed" : "Retake Suggested"}
                </Badge>
                <div className="w-full grid grid-cols-2 gap-4">
                  <div className="p-5 bg-card rounded-[2rem] border shadow-md text-center space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Correct</p>
                    <p className="text-2xl font-black text-foreground">{stats.correct}</p>
                  </div>
                  <div className="p-5 bg-card rounded-[2rem] border shadow-md text-center space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-destructive">Missed</p>
                    <p className="text-2xl font-black text-foreground">{stats.total - stats.correct}</p>
                  </div>
                </div>
              </Card>

              <Card className="lg:col-span-2 border-none shadow-xl rounded-[3rem] bg-card p-10 flex flex-col">
                <CardHeader className="p-0 mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner"><Target className="w-6 h-6 text-primary" /></div>
                    <div>
                      <CardTitle className="text-2xl font-black tracking-tight text-foreground">Track Mastery</CardTitle>
                      <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60">Aggregate Performance Matrix</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex items-center">
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.subjectChartData} layout="vertical" margin={{ left: 60, right: 60 }}>
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="name" type="category" width={120} style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.1)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 12, 12, 0]} barSize={32}>
                          <LabelList dataKey="score" position="right" formatter={(val: number) => `${val}%`} className="fill-foreground font-black text-[11px]" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {aiSummary && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8">
                <Card className="lg:col-span-2 border-none shadow-xl bg-card overflow-hidden rounded-[3rem]">
                  <div className="h-2 bg-primary w-full" />
                  <CardHeader className="flex flex-row items-center gap-5 p-10 pb-4">
                    <div className="p-4 bg-primary/10 rounded-3xl shadow-inner"><Trophy className="w-8 h-8 text-primary" /></div>
                    <div>
                      <CardTitle className="text-2xl font-black tracking-tight text-foreground">Pedagogical Review</CardTitle>
                      <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mt-1">AI Generated Analysis</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-10 pt-4 space-y-8">
                    <div className="p-8 bg-primary/5 rounded-[2.5rem] italic text-xl leading-relaxed border-l-8 border-primary font-medium text-foreground shadow-inner">
                      <TypewriterText text={aiSummary.summary} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-3 font-black text-emerald-600 uppercase tracking-[0.25em] text-[11px]"><CheckCircle2 className="w-5 h-5" /> Conceptual Peaks</h3>
                        <div className="flex flex-wrap gap-2.5">{aiSummary.strengths.map((s, idx) => (<Badge key={idx} variant="secondary" className="px-4 py-1.5 text-xs font-black rounded-xl bg-emerald-500/10 text-emerald-700 border-none shadow-sm">{s}</Badge>))}</div>
                      </div>
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-3 font-black text-rose-600 uppercase tracking-[0.25em] text-[11px]"><AlertCircle className="w-5 h-5" /> Academic Gaps</h3>
                        <div className="flex flex-wrap gap-2.5">{aiSummary.weaknesses.map((w, idx) => (<Badge key={idx} variant="outline" className="px-4 py-1.5 border-rose-200 bg-rose-500/5 text-rose-700 text-xs font-black rounded-xl shadow-sm">{w}</Badge>))}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-1 border-none shadow-xl bg-foreground rounded-[3rem] p-10 text-background relative overflow-hidden flex flex-col justify-center text-center space-y-6">
                  <div className="absolute top-0 right-0 p-8 opacity-10"><Zap className="w-32 h-32 fill-current" /></div>
                  <CardHeader className="p-0"><CardTitle className="text-xs font-black uppercase tracking-[0.4em] text-primary">Strategic Action</CardTitle></CardHeader>
                  <CardContent className="p-0 text-xl font-bold leading-relaxed px-4"><TypewriterText text={aiSummary.recommendations} /></CardContent>
                  <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 rounded-2xl h-14 font-black uppercase tracking-[0.2em] text-xs">Access Detailed Guide</Button>
                </Card>
              </div>
            )}

            <div className="space-y-8 pt-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-3xl font-black tracking-tight flex items-center gap-4 text-foreground">
                  <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center shadow-inner"><BrainCircuit className="w-7 h-7 text-rose-600" /></div>
                  Itemized Review
                </h2>
                <Badge variant="outline" className="font-black text-[10px] uppercase tracking-[0.2em] py-1 px-4 rounded-full border-muted-foreground/30">
                  {totalMistakes} Points of Review
                </Badge>
              </div>

              {totalMistakes > 0 ? (
                <Accordion type="single" collapsible className="w-full space-y-4">
                  {Object.entries(categorizedMistakes).map(([subject, mistakes]) => (
                    <div key={subject} className="space-y-3">
                      <div className="flex items-center gap-3 px-4 py-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <p className="text-[11px] font-black uppercase text-primary tracking-[0.3em]">{subject}</p>
                      </div>
                      {mistakes.map((q) => (
                        <AccordionItem 
                          key={q.id} 
                          value={q.id} 
                          className="border-none bg-card rounded-[2rem] px-2 overflow-hidden shadow-xl border border-border/20 transition-all hover:shadow-2xl"
                        >
                          <AccordionTrigger className="hover:no-underline py-6 px-6 text-left">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 font-black text-xs shadow-inner">
                                #{q.originalIndex + 1}
                              </div>
                              <span className="text-sm font-black line-clamp-1 text-foreground pr-4 uppercase tracking-tight">{q.text}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-8 pt-0 space-y-6">
                            <div className="bg-muted/30 p-6 rounded-[2rem] border-2 border-dashed border-border/50">
                              <p className="font-black text-base md:text-lg mb-6 text-foreground leading-snug">{q.text}</p>
                              <div className="grid gap-3">
                                {q.options.map((opt, i) => (
                                  <div key={i} className={cn(
                                    "p-4 rounded-2xl border-2 text-sm flex items-center gap-4 transition-all shadow-sm", 
                                    opt === q.correctAnswer ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 font-black" :
                                    opt === answers[q.id] ? "bg-rose-500/10 border-rose-500/30 text-rose-700 font-black" : 
                                    "bg-card text-muted-foreground opacity-60 grayscale-[0.5]"
                                  )}>
                                    <span className="w-7 h-7 rounded-xl border-2 flex items-center justify-center text-[10px] font-black shrink-0 border-current/20">{String.fromCharCode(65 + i)}</span>
                                    <span className="flex-1">{opt}</span>
                                    {opt === q.correctAnswer && <Badge className="bg-emerald-500 text-white font-black text-[8px] uppercase border-none rounded-lg">Correct Result</Badge>}
                                    {opt === answers[q.id] && opt !== q.correctAnswer && <Badge className="bg-rose-500 text-white font-black text-[8px] uppercase border-none rounded-lg">Your Trace</Badge>}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <AnimatePresence mode="wait">
                                {!localExplanations[q.id] ? (
                                  <Button 
                                    onClick={() => handleGenerateExplanation(q)} 
                                    disabled={generatingIds.has(q.id)} 
                                    className={cn(
                                      "w-full h-16 rounded-[1.75rem] font-black uppercase tracking-[0.2em] text-xs gap-4 transition-all relative overflow-hidden border-2 group shadow-xl",
                                      generatingIds.has(q.id) 
                                        ? "bg-primary/10 border-primary/20 text-primary" 
                                        : "bg-foreground text-background hover:scale-[1.02] active:scale-[0.98]"
                                    )}
                                  >
                                    {generatingIds.has(q.id) ? (
                                      <div className="flex items-center gap-3">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Calibrating Insight...</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between w-full px-4">
                                        <div className="flex items-center gap-3">
                                          <Sparkles className="w-5 h-5 text-primary fill-current group-hover:animate-pulse" />
                                          <span>AI Tutor Deep Dive</span>
                                        </div>
                                        <div className="animate-breathing-primary bg-background/95 px-4 py-2 rounded-xl border-2 border-primary/30 flex items-center gap-2">
                                          <span className="font-black text-sm text-primary">5</span>
                                          <Coins className="w-4 h-4 text-primary fill-current" />
                                          <span className="text-[8px] font-black text-primary opacity-60">CREDIT</span>
                                        </div>
                                      </div>
                                    )}
                                    {generatingIds.has(q.id) && (
                                      <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 3 }} className="absolute bottom-0 left-0 h-1 bg-primary" />
                                    )}
                                  </Button>
                                ) : (
                                  <motion.div 
                                    initial={{ scale: 0.95, opacity: 0 }} 
                                    animate={{ scale: 1, opacity: 1 }} 
                                    className="bg-primary/5 p-8 rounded-[2.5rem] border-2 border-primary/20 relative overflow-hidden group shadow-inner"
                                  >
                                    <div className="absolute top-0 right-0 p-8 opacity-5"><MessageSquare className="w-24 h-24" /></div>
                                    <div className="flex items-center gap-3 mb-6">
                                      <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg"><Star className="w-5 h-5 fill-current" /></div>
                                      <div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary leading-none">Pedagogical Insight</p><p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Analytical Reasoning Trace</p></div>
                                    </div>
                                    <div className="text-base leading-relaxed font-medium text-foreground p-6 bg-card rounded-2xl border shadow-sm">
                                      <TypewriterText text={localExplanations[q.id]} />
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </div>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-24 bg-emerald-500/5 rounded-[4rem] border-4 border-dashed border-emerald-500/20 shadow-inner group">
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                    <Trophy className="w-24 h-24 text-emerald-500 mx-auto mb-6 group-hover:rotate-12 transition-transform" />
                  </motion.div>
                  <h3 className="text-3xl font-black text-foreground mb-2">Exceptional Calibration</h3>
                  <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Your professional reasoning is at 100% efficiency</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showPurchaseSuccess} onOpenChange={setShowPurchaseSuccess}>
        <DialogContent className="rounded-[3rem] border-none shadow-2xl p-0 max-w-[360px] overflow-hidden outline-none z-[1100]">
          <div className="bg-emerald-500/10 p-12 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12, stiffness: 200 }} className="w-24 h-24 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10">
              <CheckCircle2 className="w-12 h-12" />
            </motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-transparent z-0" />
          </div>
          <div className="p-10 pt-4 text-center space-y-8">
            <DialogHeader>
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Access Granted</span>
                <DialogTitle className="text-3xl font-black tracking-tight">Report Sync Complete</DialogTitle>
                <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Pedagogical analysis is now active</DialogDescription>
              </div>
            </DialogHeader>
            <Button onClick={() => setShowPurchaseSuccess(false)} className="w-full h-16 rounded-[1.75rem] font-black text-sm gap-3 shadow-2xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all">
              Launch Dashboard <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
