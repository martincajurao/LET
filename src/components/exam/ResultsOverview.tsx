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
  Star
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
import { DAILY_AD_LIMIT } from '@/lib/xp-system';

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
  const { user } = useUser();
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
    const unlocked = isUnlocked; 
    const credits = typeof user.credits === 'number' ? user.credits : 0;

    const needsCharge = !isPro && !unlocked;

    if (needsCharge && credits < 5) {
      toast({ 
        variant: "destructive", 
        title: "Insufficient Credits", 
        description: "You need 5 Credits for an AI Deep Dive. Refill via Tasks or Ads!" 
      });
      return;
    }
    
    setGeneratingIds(prev => new Set(prev).add(q.id));
    
    try {
      if (needsCharge) {
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
        if (needsCharge) {
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
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card p-8 rounded-[2.5rem] shadow-sm border">
        <div className="space-y-1">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            Simulation Report
          </Badge>
          <h1 className="text-3xl font-black font-headline tracking-tight leading-none text-foreground">Overall Performance</h1>
          <p className="text-muted-foreground text-sm font-medium">Verified analytical results based on LET board standards.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" disabled={unlocking} onClick={onRestart} className="flex-1 md:flex-none h-12 px-6 rounded-xl font-black text-xs gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Exit
          </Button>
          <Button onClick={onRestart} disabled={unlocking} className="flex-1 md:flex-none h-12 px-8 rounded-xl font-black text-xs shadow-lg gap-2">
            Retake Track
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className={cn(
          "lg:col-span-1 border-none shadow-sm flex flex-col items-center justify-center p-8 rounded-[2.5rem]",
          stats.isPassed ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-orange-500/10 border border-orange-500/20"
        )}>
          <div className="relative w-40 h-40 flex items-center justify-center mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={8}
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
              <span className="text-3xl font-black tracking-tight text-foreground">{stats.overallScore}%</span>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Accuracy</span>
            </div>
          </div>
          <Badge variant={stats.isPassed ? "secondary" : "destructive"} className="px-6 py-1.5 text-sm font-black uppercase tracking-[0.2em] shadow-sm mb-6">
            {stats.isPassed ? "Simulation Passed" : "Retake Suggested"}
          </Badge>
          <div className="w-full grid grid-cols-2 gap-3">
            <div className="p-4 bg-card rounded-2xl border shadow-sm text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Correct</p>
              <p className="text-xl font-black text-foreground">{stats.correct}</p>
            </div>
            <div className="p-4 bg-card rounded-2xl border shadow-sm text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-destructive mb-1">Missed</p>
              <p className="text-xl font-black text-foreground">{stats.total - stats.correct}</p>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-sm rounded-[2.5rem] bg-card p-8">
          <CardHeader className="p-0 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><Target className="w-5 h-5 text-primary" /></div>
              <div><CardTitle className="text-lg font-black tracking-tight text-foreground">Subject Breakdown</CardTitle><CardDescription className="text-xs font-medium text-muted-foreground">Proficiency analysis by simulation phase.</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.subjectChartData} layout="vertical" margin={{ left: 60, right: 40 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" width={120} style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.1)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 10, 10, 0]} barSize={28}>
                    <LabelList dataKey="score" position="right" formatter={(val: number) => `${val}%`} className="fill-foreground font-black text-[10px]" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {!isUnlocked ? (
        <div></div>
      ) : (
        <>
          {aiSummary && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8">
              <Card className="lg:col-span-2 border-none shadow-sm bg-card overflow-hidden rounded-[2.5rem]">
                <div className="h-1.5 bg-primary w-full" />
                <CardHeader className="flex flex-row items-center gap-4 p-8 pb-4">
                  <div className="p-3 bg-primary/10 rounded-2xl"><Trophy className="w-6 h-6 text-primary" /></div>
                  <CardTitle className="text-xl font-black tracking-tight text-foreground">Pedagogical Analysis</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-6">
                  <div className="p-6 bg-primary/5 rounded-[2rem] italic text-lg leading-relaxed border-l-4 border-primary font-medium text-foreground">
                    <TypewriterText text={aiSummary.summary} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 font-black text-emerald-600 uppercase tracking-widest text-[10px]"><Target className="w-4 h-4" /> Conceptual Strengths</h3>
                      <div className="flex flex-wrap gap-2">{aiSummary.strengths.map((s, idx) => (<Badge key={idx} variant="secondary" className="px-3 py-1 text-[11px] font-bold rounded-lg">{s}</Badge>))}</div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 font-black text-destructive uppercase tracking-widest text-[10px]"><BookOpen className="w-4 h-4" /> Recommended Focus</h3>
                      <div className="flex flex-wrap gap-2">{aiSummary.weaknesses.map((w, idx) => (<Badge key={idx} variant="outline" className="px-3 py-1 border-destructive/20 text-destructive text-[11px] font-bold rounded-lg">{w}</Badge>))}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-1 border-none shadow-sm bg-foreground rounded-[2.5rem] p-8 text-background relative overflow-hidden">
                <CardHeader className="p-0 mb-6"><CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Actionable Roadmap</CardTitle></CardHeader>
                <CardContent className="p-0 text-sm font-medium leading-relaxed"><TypewriterText text={aiSummary.recommendations} /></CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      <div className="space-y-6">
        <h2 className="text-2xl font-black font-headline tracking-tight flex items-center gap-3 text-foreground">
          <BrainCircuit className="w-6 h-6 text-primary" /> Mistake Review & AI Tutor
        </h2>
        {totalMistakes > 0 ? (
          <Accordion type="single" collapsible className="w-full space-y-4">
            {Object.entries(categorizedMistakes).map(([subject, mistakes]) => (
              <div key={subject} className="space-y-2">
                <p className="text-[10px] font-black uppercase text-primary px-2">{subject}</p>
                {mistakes.map((q) => (
                  <AccordionItem 
                    key={q.id} 
                    value={q.id} 
                    className="border-none bg-card rounded-2xl px-2 overflow-hidden shadow-sm"
                  >
                    <AccordionTrigger className="hover:no-underline py-4 px-4 text-left">
                      <span className="text-xs font-bold line-clamp-1 text-foreground">{q.text}</span>
                    </AccordionTrigger>
                    <AccordionContent className="p-6 pt-0 space-y-4">
                      <div className="bg-muted/30 p-4 rounded-xl border border-border">
                        <p className="font-bold text-sm mb-3 text-foreground">{q.text}</p>
                        <div className="grid gap-2">
                          {q.options.map((opt, i) => (
                            <div key={i} className={cn("p-3 rounded-lg border text-xs flex items-center gap-2", opt === answers[q.id] ? "bg-orange-500/10 border-orange-500/30 text-orange-600 font-bold" : "bg-card text-muted-foreground opacity-70")}>
                              <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[9px] shrink-0 border-border">{String.fromCharCode(65 + i)}</span>
                              {opt}{opt === answers[q.id] && <span className="ml-auto text-[10px] font-black uppercase">Your Choice</span>}
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
                            size="sm" 
                            className={cn(
                              "w-full font-black gap-3 transition-all h-16 rounded-2xl shadow-lg active:scale-95 group relative overflow-hidden border-2",
                              generatingIds.has(q.id) 
                                ? "border-primary/30 bg-primary/10 text-primary" 
                                : (user?.isPro || isUnlocked)
                                  ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 hover:text-emerald-800"
                                  : "border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary hover:shadow-primary/30"
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-3">
                                {generatingIds.has(q.id) ? (
                                  <>
                                    <div className="relative">
                                      <Loader2 className="w-5 h-5 animate-spin" />
                                      <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                      <span className="font-black text-sm">AI Processing</span>
                                      <span className="text-[10px] opacity-80">Analyzing mistake patterns...</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <Sparkles className={cn(
                                        "w-5 h-5",
                                        (user?.isPro || isUnlocked) ? "text-emerald-600" : "text-primary"
                                      )} />
                                      <span className="font-black">Get AI Deep Dive</span>
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              {!generatingIds.has(q.id) && (
                                <div className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] transition-all border-2 font-bold",
                                  (user?.isPro || isUnlocked) 
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" 
                                    : "animate-breathing-primary bg-primary/10 border-primary/20 text-primary"
                                )}>
                                  {(user?.isPro || isUnlocked) ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>FREE</span>
                                    </>
                                  ) : (
                                    <>
                                      <Coins className="w-3.5 h-3.5 fill-current text-primary" />
                                      <span className="text-primary">5 CREDITS</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Progress bar for generation */}
                            {generatingIds.has(q.id) && (
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 3, ease: "easeInOut" }}
                                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary/50 to-primary"
                              />
                            )}
                          </Button>
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className={cn(
                              "bg-gradient-to-br p-6 rounded-2xl border relative overflow-hidden group",
                              (user?.isPro || isUnlocked)
                                ? "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
                                : "from-primary/10 to-primary/5 border-primary/20"
                            )}
                          >
                            {/* Background decoration */}
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-transparent to-current opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
                            
                            <div className="flex items-start justify-between gap-3 mb-4">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2",
                                  (user?.isPro || isUnlocked)
                                    ? "bg-emerald-500/10 border-emerald-500/20"
                                    : "bg-primary/10 border-primary/20"
                                )}>
                                  <MessageSquare className={cn(
                                    "w-4 h-4",
                                    (user?.isPro || isUnlocked) ? "text-emerald-600" : "text-primary"
                                  )} />
                                </div>
                                <div>
                                  <span className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.2em] block",
                                    (user?.isPro || isUnlocked) ? "text-emerald-600" : "text-primary"
                                  )}>
                                    AI Tutor Insight
                                  </span>
                                  <span className="text-[8px] text-muted-foreground font-medium">
                                    Personalized explanation ready
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {(user?.isPro || isUnlocked) && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                    <Crown className="w-3 h-3 text-yellow-600" />
                                    <span className="text-[8px] font-black text-emerald-600">PRO</span>
                                  </div>
                                )}
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              </div>
                            </div>
                            
                            <div className={cn(
                              "text-sm leading-relaxed font-medium rounded-xl p-4 border",
                              (user?.isPro || isUnlocked)
                                ? "bg-emerald-50/50 border-emerald-500/10 text-emerald-800"
                                : "bg-primary/50 border-primary/10 text-primary"
                            )}>
                              <TypewriterText text={localExplanations[q.id]} />
                            </div>
                            
                            {/* Action buttons for unlocked content */}
                            <div className="flex items-center gap-2 mt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 rounded-lg text-[10px] font-black border-current/20 hover:bg-current/5"
                              >
                                <BrainCircuit className="w-3 h-3 mr-1" />
                                Related Topics
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 rounded-lg text-[10px] font-black hover:bg-current/5"
                              >
                                Save Note
                              </Button>
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
          <div className="text-center py-20 bg-emerald-500/5 rounded-[3rem] border-2 border-dashed border-emerald-500/20"><Trophy className="w-16 h-16 text-emerald-500 mx-auto mb-4" /><h3 className="text-2xl font-black text-foreground">Exceptional Mastery!</h3></div>
        )}
      </div>

      <Dialog open={showPurchaseSuccess} onOpenChange={setShowPurchaseSuccess}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 max-w-[340px] overflow-hidden outline-none z-[1100]">
          <div className="bg-emerald-500/10 p-12 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10"
            >
              <CheckCircle2 className="w-10 h-10" />
            </motion.div>
            
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.4, 0.2] 
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-transparent z-0" 
            />
            
            <div className="absolute inset-0 z-5 pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 0], y: -80, x: (i - 2) * 30 }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                  className="absolute bottom-0 left-1/2"
                >
                  <Sparkles className="w-3 h-3 text-emerald-500 fill-current" />
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="p-8 pt-4 text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <DialogHeader>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-1">Access Granted</span>
                  <DialogTitle className="text-2xl font-black tracking-tight text-foreground">Summary Unlocked!</DialogTitle>
                  <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-1">
                    Pedagogical insights are now active
                  </DialogDescription>
                </div>
              </DialogHeader>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-muted/30 rounded-2xl p-4 border border-border/50 flex flex-col items-center gap-1"
            >
              <span className="text-[9px] font-black uppercase text-muted-foreground">Session Value</span>
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-primary" />
                <span className="text-2xl font-black text-foreground">Summary Ready</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <Button 
                onClick={() => setShowPurchaseSuccess(false)}
                className="w-full h-14 rounded-2xl font-black text-base gap-2 shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Start Review
                <ChevronRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
