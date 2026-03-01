
"use client"

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { 
  CheckCircle2, 
  Trophy, 
  Target, 
  BrainCircuit, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  LayoutDashboard, 
  ChevronRight, 
  Lock, 
  Play, 
  MessageSquare, 
  ShieldCheck, 
  ShieldAlert,
  Zap,
  Star,
  TrendingUp,
  History,
  ArrowDown
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { generatePersonalizedPerformanceSummary, PersonalizedPerformanceSummaryOutput } from "@/ai/flows/personalized-performance-summary-flow";
import { explainMistakesBatch } from "@/ai/flows/explain-mistakes-batch-flow";
import { Question } from "@/app/lib/mock-data";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { getRankData, DAILY_AD_LIMIT, AI_UNLOCK_COST, AI_DEEP_DIVE_COST, XP_REWARDS } from '@/lib/xp-system';

interface ResultsOverviewProps {
  questions: Question[];
  answers: Record<string, string>;
  timeSpent: number;
  onRestart: () => void;
  resultId?: string;
  isHistorical?: boolean;
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

export function ResultsOverview({ questions, answers, timeSpent, onRestart, resultId, isHistorical = false }: ResultsOverviewProps) {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isUnlocked, setIsUnlocked] = useState(isHistorical);
  const [unlocking, setUnlocking] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  
  const [aiSummary, setAiSummary] = useState<PersonalizedPerformanceSummaryOutput | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [localExplanations, setLocalExplanations] = useState<Record<string, string>>({});
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const initial: Record<string, string> = {};
    questions.forEach(q => {
      if ((q as any).aiExplanation) {
        initial[q.id] = (q as any).aiExplanation;
      }
    });
    if (Object.keys(initial).length > 0) {
      setLocalExplanations(prev => ({ ...initial, ...prev }));
    }
  }, [questions]);

  useEffect(() => {
    if (user?.isPro || isHistorical) {
      setIsUnlocked(true);
    }
  }, [user, isHistorical]);

  const stats = useMemo(() => {
    let correct = 0;
    const subjectStats: Record<string, { total: number; correct: number }> = {};

    questions.forEach(q => {
      const qId = q.id;
      const key = q.subject === 'Specialization' && q.subCategory 
        ? `${q.subject}: ${q.subCategory}`
        : q.subject;

      if (!subjectStats[key]) subjectStats[key] = { total: 0, correct: 0 };
      subjectStats[key].total++;
      
      const userAnswer = answers[qId];
      if (userAnswer === q.correctAnswer) {
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

  const generateReportAnalysis = useCallback(async () => {
    if (isGeneratingAi || aiSummary || !isUnlocked) return;
    setIsGeneratingAi(true);
    try {
      const summaryInput = {
        testResults: stats.subjectChartData.map(d => ({
          subjectName: d.name,
          totalQuestions: d.count,
          correctAnswers: Math.round((d.score / 100) * d.count),
          incorrectAnswers: d.count - Math.round((d.score / 100) * d.count),
          scorePercentage: d.score
        })),
        overallScorePercentage: stats.overallScore,
        overallTimeSpentSeconds: timeSpent
      };
      const summary = await generatePersonalizedPerformanceSummary(summaryInput);
      setAiSummary(summary);
    } catch (e) {
      console.error("AI Insight Sync Failed:", e);
    } finally {
      setIsGeneratingAi(false);
    }
  }, [stats, timeSpent, isGeneratingAi, aiSummary, isUnlocked]);

  useEffect(() => {
    generateReportAnalysis();
  }, [generateReportAnalysis]);

  const handleUnlockWithAd = async () => {
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
          await updateDoc(userRef, { dailyAdCount: increment(1) });
          await refreshUser();
          setIsUnlocked(true);
          setShowPurchaseSuccess(true);
        } catch (e) {
          toast({ variant: "destructive", title: "Unlock Failed", description: "Verification failed." });
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
    if (credits < AI_UNLOCK_COST) {
      toast({ variant: "destructive", title: "Vault Restricted", description: `Unlocking requires ${AI_UNLOCK_COST} credits (Current: ${credits}).` });
      return;
    }
    
    setUnlocking(true);
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, { credits: increment(-AI_UNLOCK_COST) });
      await refreshUser();
      setIsUnlocked(true);
      setShowPurchaseSuccess(true);
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Credit deduction failed." });
    } finally {
      setUnlocking(false);
    }
  };

  const handleGenerateExplanation = async (q: Question) => {
    if (!user || !firestore) return;
    if (generatingIds.has(q.id) || localExplanations[q.id]) return;

    const isPro = !!user.isPro;
    const credits = typeof user.credits === 'number' ? user.credits : 0;

    // NO POPUP IN EVERY QUESTION: Frequent actions use toasts instead of dialogs
    if (!isPro && credits < AI_DEEP_DIVE_COST) {
      toast({ 
        variant: "destructive", 
        title: "Credits Required", 
        description: `Deep dive requires ${AI_DEEP_DIVE_COST} credits. (Current: ${credits})` 
      });
      return;
    }
    
    setGeneratingIds(prev => new Set(prev).add(q.id));
    
    try {
      if (!isPro) {
        await updateDoc(doc(firestore, 'users', user.uid), {
          credits: increment(-AI_DEEP_DIVE_COST),
          mistakesReviewed: increment(1)
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
      
      if (result.explanations?.[0]) {
        const explanation = result.explanations[0].aiExplanation;
        setLocalExplanations(prev => ({ ...prev, [q.id]: explanation }));
        
        if (resultId && !user.uid.startsWith('bypass')) {
          const examDocRef = doc(firestore, 'exam_results', resultId);
          const docSnap = await getDoc(examDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const updatedResults = (data.results || []).map((r: any) => {
              if (r.questionId === q.id || r.id === q.id) {
                return { ...r, aiExplanation: explanation };
              }
              return r;
            });
            await updateDoc(examDocRef, { results: updatedResults });
          }
        }
        
        await refreshUser();
      }
    } catch (e) {
      console.error("Explanation Sync Error:", e);
      setLocalExplanations(prev => ({ ...prev, [q.id]: "Pedagogical insight temporarily unavailable." }));
    } finally {
      setGeneratingIds(prev => { const next = new Set(prev); next.delete(q.id); return next; });
    }
  };

  const pieData = [{ name: 'Correct', value: stats.correct }, { name: 'Incorrect', value: stats.total - stats.correct }];
  const COLORS = ['hsl(var(--secondary))', 'hsl(var(--destructive))'];

  const categorizedMistakes = useMemo(() => {
    const categories: Record<string, (Question & { originalIndex: number })[]> = {};
    questions.forEach((q, index) => {
      const userAnswer = answers[q.id];
      if (userAnswer !== q.correctAnswer) {
        const key = q.subject === 'Specialization' && q.subCategory ? `${q.subject}: ${q.subCategory}` : q.subject;
        if (!categories[key]) categories[key] = [];
        categories[key].push({ ...q, originalIndex: index });
      }
    });
    return categories;
  }, [questions, answers]);

  const totalMistakes = Object.values(categorizedMistakes).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-[2rem] shadow-sm border border-border/50">
        <div className="space-y-1">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Calibration Trace</Badge>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Simulation Result</h1>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{questions.length} Items Calibrated</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" disabled={unlocking} onClick={onRestart} className="flex-1 md:flex-none h-11 px-5 rounded-xl font-black text-[9px] uppercase tracking-widest gap-2 border-2 active:scale-95 transition-all">
            <LayoutDashboard className="w-3.5 h-3.5" /> Exit
          </Button>
          <Button onClick={onRestart} disabled={unlocking} className="flex-1 md:flex-none h-11 px-6 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-primary/20 gap-2 active:scale-95 transition-all">
            <History className="w-3.5 h-3.5" /> Retake
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          <motion.div key="locked-vault" initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -15, opacity: 0 }} className="w-full max-w-2xl mx-auto">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden relative border-primary/20">
              <div className="p-8 flex flex-col items-center text-center space-y-6 relative z-10">
                <div className="w-20 h-20 bg-primary/10 rounded-[1.75rem] flex items-center justify-center border-4 border-primary/20 shadow-xl animate-levitate"><BrainCircuit className="w-10 h-10 text-primary" /></div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight leading-tight text-foreground">Unlock Your <br /><span className="text-primary italic">Pedagogical Roadmap</span></h2>
                  <p className="text-muted-foreground font-medium text-sm max-w-sm mx-auto">Access accuracy charts, AI analysis, and full item review.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <Button onClick={handleUnlockWithAd} disabled={unlocking || (user?.dailyAdCount || 0) >= DAILY_AD_LIMIT} className="h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-3 shadow-lg relative overflow-hidden bg-primary text-primary-foreground active:scale-95 transition-all">
                    {unlocking && !verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : verifying ? <ShieldAlert className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4 fill-current" />}
                    {unlocking ? (verifying ? "Verifying..." : "Playing...") : "Watch Clip"}
                    <Badge className="absolute top-1.5 right-1.5 bg-background/20 text-background text-[7px] font-black uppercase border-none">FREE</Badge>
                  </Button>
                  <Button variant="outline" onClick={handleUnlockWithCredits} disabled={unlocking || (user?.credits || 0) < AI_UNLOCK_COST} className="h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 border-2 border-primary/30 bg-primary/5 text-primary active:scale-95 transition-all">
                    <span className="flex-1 text-left px-1">Unlock Vault</span>
                    <div className="bg-background/90 px-2 py-1 rounded-lg border border-primary/30 flex items-center gap-1.5">
                      <span className="font-black text-xs">{AI_UNLOCK_COST}</span>
                      <Sparkles className="w-3.5 h-3.5 fill-current animate-sparkle" />
                    </div>
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="unlocked-dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className={cn("lg:col-span-1 border-none shadow-xl flex flex-col items-center justify-center p-6 rounded-[2.5rem] relative overflow-hidden", stats.isPassed ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-orange-500/10 border border-orange-500/20")}>
                <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                  <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value" stroke="none">{pieData.map((e, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}</Pie></PieChart></ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-black text-foreground">{stats.overallScore}%</span><span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">Accuracy</span></div>
                </div>
                <Badge variant={stats.isPassed ? "secondary" : "destructive"} className="px-6 py-1 text-[10px] font-black uppercase tracking-[0.2em] shadow-md mb-6 rounded-full border-none">{stats.isPassed ? "Simulation Passed" : "Retake Suggested"}</Badge>
                <div className="w-full grid grid-cols-2 gap-3">
                  <div className="p-4 bg-card rounded-[1.5rem] border shadow-sm text-center"><p className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Correct</p><p className="text-xl font-black text-foreground">{stats.correct}</p></div>
                  <div className="p-4 bg-card rounded-[1.5rem] border shadow-sm text-center"><p className="text-[8px] font-black uppercase tracking-widest text-destructive">Missed</p><p className="text-xl font-black text-foreground">{stats.total - stats.correct}</p></div>
                </div>
              </Card>
              <Card className="lg:col-span-2 border-none shadow-xl rounded-[2.5rem] bg-card p-8 flex flex-col">
                <CardHeader className="p-0 mb-6"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-inner"><Target className="w-5 h-5 text-primary" /></div><div><CardTitle className="text-xl font-black tracking-tight">Track Mastery</CardTitle><CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Aggregate Performance Matrix</CardDescription></div></div></CardHeader>
                <CardContent className="p-0 flex-1 flex items-center"><div className="h-[200px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.subjectChartData} layout="vertical" margin={{ left: 40, right: 40 }}><XAxis type="number" domain={[0, 100]} hide /><YAxis dataKey="name" type="category" width={100} style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', fill: 'hsl(var(--muted-foreground))' }} /><Tooltip cursor={{ fill: 'hsl(var(--muted)/0.1)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '1rem', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} /><Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} barSize={24}><LabelList dataKey="score" position="right" formatter={(val: number) => `${val}%`} className="fill-foreground font-black text-[10px]" /></Bar></BarChart></ResponsiveContainer></div></CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-xl bg-card overflow-hidden rounded-[2.5rem]">
                <CardHeader className="flex flex-row items-center gap-4 p-8 pb-3"><div className="p-3 bg-primary/10 rounded-2xl shadow-inner"><Trophy className="w-6 h-6 text-primary" /></div><div><CardTitle className="text-xl font-black tracking-tight">AI Result Insight</CardTitle><p className="text-[9px] font-black uppercase text-primary tracking-[0.2em] mt-0.5">Pedagogical Analysis Roadmap</p></div></CardHeader>
                <CardContent className="p-8 pt-2 space-y-6">
                  {aiSummary ? (
                    <>
                      <div className="p-6 bg-primary/5 rounded-[1.75rem] italic text-lg leading-relaxed border-l-4 border-primary font-medium text-foreground shadow-inner"><TypewriterText text={aiSummary.summary} /></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3"><h3 className="flex items-center gap-2 font-black text-emerald-600 uppercase tracking-widest text-[9px]"><CheckCircle2 className="w-4 h-4" /> Conceptual Peaks</h3><div className="flex flex-wrap gap-2">{aiSummary.strengths.map((s, idx) => (<Badge key={idx} variant="secondary" className="px-3 py-1 text-[10px] font-black rounded-lg bg-emerald-500/10 text-emerald-700 border-none">{s}</Badge>))}</div></div>
                        <div className="space-y-3"><h3 className="flex items-center gap-2 font-black text-rose-600 uppercase tracking-widest text-[9px]"><AlertCircle className="w-4 h-4" /> Academic Gaps</h3><div className="flex flex-wrap gap-2">{aiSummary.weaknesses.map((w, idx) => (<Badge key={idx} variant="outline" className="px-3 py-1 border-rose-200 bg-rose-500/5 text-rose-700 text-[10px] font-black rounded-lg">{w}</Badge>))}</div></div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 space-y-3 opacity-40"><BrainCircuit className="w-10 h-10 text-muted-foreground animate-pulse" /><p className="text-[10px] font-black uppercase tracking-widest">Generating Insight Trace...</p></div>
                  )}
                </CardContent>
              </Card>
              <Card className="lg:col-span-1 border-none shadow-xl bg-foreground rounded-[2.5rem] p-8 text-background relative overflow-hidden flex flex-col justify-center text-center space-y-4">
                <div className="absolute top-0 right-0 p-6 opacity-10"><Zap className="w-24 h-24 fill-current" /></div>
                <CardHeader className="p-0"><CardTitle className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Strategic Action</CardTitle></CardHeader>
                <CardContent className="p-0 text-lg font-bold leading-snug px-2">{aiSummary ? <TypewriterText text={aiSummary.recommendations} /> : "Analyzing character metadata..."}</CardContent>
                <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 rounded-xl h-12 font-black uppercase tracking-[0.1em] text-[10px]">Access Detailed Guide</Button>
              </Card>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between px-4">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 text-foreground"><div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center shadow-inner"><BrainCircuit className="w-6 h-6 text-rose-600" /></div>Itemized Review</h2>
                <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest py-1 px-3 rounded-full border-muted-foreground/30">{totalMistakes} Review Items</Badge>
              </div>
              
              {totalMistakes > 0 ? (
                <Accordion type="single" collapsible className="w-full space-y-2">
                  {Object.entries(categorizedMistakes).map(([subject, mistakes]) => (
                    <div key={subject} className="space-y-2">
                      <div className="flex items-center gap-2 px-4 py-1"><div className="w-1 h-1 bg-primary rounded-full" /><p className="text-[10px] font-black uppercase text-primary tracking-widest">{subject}</p></div>
                      {mistakes.map((q) => {
                        const userAnswer = answers[q.id];
                        const hasStoredExplanation = !!localExplanations[q.id];
                        
                        return (
                          <AccordionItem key={q.id} value={q.id} className="border-none bg-card rounded-2xl px-1 overflow-hidden shadow-md border border-border/10">
                            <AccordionTrigger className="hover:no-underline py-4 px-4 text-left">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 font-black text-[10px] shadow-inner shrink-0">
                                  #{q.originalIndex + 1}
                                </div>
                                <span className="text-xs font-black line-clamp-1 pr-2 uppercase tracking-tight text-foreground opacity-80">
                                  {q.text}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 pt-0 space-y-4">
                              <div className="bg-muted/20 p-4 rounded-xl border-2 border-dashed border-border/50">
                                <p className="font-black text-base md:text-lg mb-4 leading-tight text-foreground">
                                  {q.text}
                                </p>
                                <div className="grid grid-cols-1 gap-2">
                                  {q.options.map((opt, i) => {
                                    const isCorrect = opt === q.correctAnswer;
                                    const isUserWrongChoice = opt === userAnswer;
                                    
                                    return (
                                      <div 
                                        key={i} 
                                        className={cn(
                                          "p-3 rounded-xl border-2 text-xs md:text-sm flex items-center gap-3 transition-all",
                                          isCorrect ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 font-black" : 
                                          isUserWrongChoice ? "bg-rose-500/10 border-rose-500/30 text-rose-700 font-black" : 
                                          "bg-card border-border/40 text-muted-foreground opacity-70"
                                        )}
                                      >
                                        <span className={cn(
                                          "w-7 h-7 rounded-lg border-2 flex items-center justify-center text-[10px] font-black shrink-0",
                                          isCorrect ? "border-emerald-500/40 bg-emerald-500/10" : 
                                          isUserWrongChoice ? "border-rose-500/40 bg-rose-500/10" : 
                                          "border-border bg-muted/20"
                                        )}>
                                          {String.fromCharCode(65 + i)}
                                        </span>
                                        <span className="flex-1 leading-tight">{opt}</span>
                                        {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                                        {isUserWrongChoice && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <AnimatePresence mode="wait">
                                {!hasStoredExplanation ? (
                                  <Button 
                                    onClick={() => handleGenerateExplanation(q)} 
                                    disabled={generatingIds.has(q.id)} 
                                    className={cn(
                                      "w-full h-12 rounded-xl font-black uppercase tracking-widest text-[9px] gap-2 transition-all relative overflow-hidden border-2 group shadow-sm active:scale-95", 
                                      generatingIds.has(q.id) ? "bg-primary/10 border-primary/20 text-primary" : "bg-foreground text-background"
                                    )}
                                  >
                                    {generatingIds.has(q.id) ? (
                                      <div className="flex items-center gap-2">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Calibrating Insight...</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between w-full px-2">
                                        <div className="flex items-center gap-2">
                                          <Sparkles className="w-3.5 h-3.5 text-primary fill-current group-hover:animate-pulse animate-sparkle" />
                                          <span>AI Tutor Deep Dive</span>
                                        </div>
                                        <div className="bg-background/90 px-3 py-1 rounded-lg border border-primary/20 flex items-center gap-1.5 shadow-inner">
                                          <span className="font-black text-xs text-primary">{AI_DEEP_DIVE_COST}</span>
                                          <Sparkles className="w-3.5 h-3.5 text-primary fill-current animate-sparkle" />
                                        </div>
                                      </div>
                                    )}
                                  </Button>
                                ) : (
                                  <motion.div 
                                    initial={{ scale: 0.98, opacity: 0 }} 
                                    animate={{ opacity: 1, scale: 1 }} 
                                    className="bg-primary/5 p-5 rounded-xl border-2 border-primary/10 relative overflow-hidden group shadow-inner"
                                  >
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                                        <Star className="w-4 h-4 fill-current" />
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-primary leading-none">Pedagogical Insight</p>
                                        <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-0.5">Analytical Reasoning Trace</p>
                                      </div>
                                    </div>
                                    <div className="text-sm leading-relaxed font-medium text-foreground p-4 bg-card rounded-lg border border-border/30 shadow-sm">
                                      <TypewriterText text={localExplanations[q.id]} />
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </div>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-16 bg-emerald-500/5 rounded-[2.5rem] border-2 border-dashed border-emerald-500/20 shadow-inner">
                  <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                    <Trophy className="w-16 h-16 text-emerald-500 mx-auto mb-4 opacity-40" />
                  </motion.div>
                  <h3 className="text-xl font-black text-foreground mb-1">Exceptional Calibration</h3>
                  <p className="text-muted-foreground font-black uppercase tracking-widest text-[8px]">Professional reasoning at 100% efficiency</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showPurchaseSuccess} onOpenChange={setShowPurchaseSuccess}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 max-w-[320px] overflow-hidden outline-none z-[1100]">
          <div className="bg-emerald-500/10 p-10 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12, stiffness: 200 }} className="w-20 h-20 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-2xl relative z-10"><CheckCircle2 className="w-10 h-10" /></motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-transparent z-0" />
          </div>
          <div className="p-8 pt-2 text-center space-y-6">
            <DialogHeader><div className="space-y-1"><span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-600">Access Granted</span><DialogTitle className="text-2xl font-black tracking-tight">Report Sync Complete</DialogTitle></div></DialogHeader>
            <Button onClick={() => setShowPurchaseSuccess(false)} className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all">Launch Analysis <ChevronRight className="w-4 h-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
