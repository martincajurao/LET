"use client"

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { CheckCircle2, XCircle, Trophy, Target, BookOpen, ArrowLeft, BrainCircuit, Sparkles, Loader2, AlertCircle, LayoutDashboard, ChevronRight, Lock, Play, MessageSquare } from "lucide-react";
import { PersonalizedPerformanceSummaryOutput } from "@/ai/flows/personalized-performance-summary-flow";
import { explainMistakesBatch } from "@/ai/flows/explain-mistakes-batch-flow";
import { Question } from "@/app/lib/mock-data";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface ResultsOverviewProps {
  questions: Question[];
  answers: Record<string, string>;
  timeSpent: number;
  aiSummary?: PersonalizedPerformanceSummaryOutput;
  onRestart: () => void;
}

export function ResultsOverview({ questions, answers, timeSpent, aiSummary, onRestart }: ResultsOverviewProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [localExplanations, setLocalExplanations] = useState<Record<string, string>>({});
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

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

  const handleUnlockAnalysis = async () => {
    if (!user || !firestore) return;
    setUnlocking(true);
    // Simulating Ad watching
    setTimeout(async () => {
      try {
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, {
          dailyAdCount: increment(1)
        });
        setIsUnlocked(true);
        toast({
          title: "Analysis Unlocked",
          description: "Detailed performance insights are now available.",
        });
      } catch (e) {
        toast({ variant: "destructive", title: "Unlock Failed", description: "Could not verify ad completion." });
      } finally {
        setUnlocking(false);
      }
    }, 2000);
  };

  const handleGenerateExplanation = async (q: Question) => {
    if (!isUnlocked) {
      toast({ title: "Locked Feature", description: "Unlock full analysis to use AI review." });
      return;
    }
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "Please sign in to use AI explanation." });
      return;
    }
    if (generatingIds.has(q.id)) return;
    
    // Check credits for non-pro users
    if (!user.isPro && (user.credits || 0) < 2) {
      toast({ variant: "destructive", title: "Insufficient AI Credits", description: "Complete daily tasks to earn more credits!" });
      return;
    }
    
    setGeneratingIds(prev => new Set(prev).add(q.id));
    
    try {
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
        
        // Deduct credits for non-pro users and track mistakes reviewed for daily tasks
        if (!user.isPro && firestore) {
          const userRef = doc(firestore, 'users', user.uid);
          await updateDoc(userRef, {
            credits: increment(-2),
            dailyAiUsage: increment(1),
            mistakesReviewed: increment(1) // Track for daily tasks
          });
        } else if (user.isPro && firestore) {
          // Even for Pro users, track mistakes reviewed for daily tasks
          const userRef = doc(firestore, 'users', user.uid);
          await updateDoc(userRef, {
            mistakesReviewed: increment(1)
          });
        }
      } else {
        throw new Error("Empty explanation");
      }
    } catch (e) {
      const fallbackMsg = q.explanation || "Review the core concepts related to this subject track.";
      setLocalExplanations(prev => ({ ...prev, [q.id]: fallbackMsg }));
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border">
        <div className="space-y-1">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            Simulation Report
          </Badge>
          <h1 className="text-3xl font-black font-headline tracking-tight leading-none">Overall Performance</h1>
          <p className="text-muted-foreground text-sm font-medium">Verified analytical results based on LET board standards.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={onRestart} className="flex-1 md:flex-none h-12 px-6 rounded-xl font-black text-xs gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Exit
          </Button>
          <Button onClick={onRestart} className="flex-1 md:flex-none h-12 px-8 rounded-xl font-black text-xs shadow-lg gap-2">
            Retake Track
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className={cn(
          "lg:col-span-1 border-none shadow-sm flex flex-col items-center justify-center p-8 rounded-[2.5rem]",
          stats.isPassed ? "bg-emerald-50/50 border border-emerald-100" : "bg-orange-50/50 border border-orange-100"
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
              <span className="text-3xl font-black tracking-tight">{stats.overallScore}%</span>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Accuracy</span>
            </div>
          </div>
          
          <div className="text-center mb-6">
            <Badge variant={stats.isPassed ? "secondary" : "destructive"} className="px-6 py-1.5 text-sm font-black uppercase tracking-[0.2em] shadow-sm">
              {stats.isPassed ? "Simulation Passed" : "Retake Suggested"}
            </Badge>
          </div>

          <div className="w-full grid grid-cols-2 gap-3">
            <div className="p-4 bg-white rounded-2xl border shadow-sm text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Correct</p>
              <p className="text-xl font-black">{stats.correct}</p>
            </div>
            <div className="p-4 bg-white rounded-2xl border shadow-sm text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-destructive mb-1">Missed</p>
              <p className="text-xl font-black">{stats.total - stats.correct}</p>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-sm rounded-[2.5rem] bg-white p-8">
          <CardHeader className="p-0 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-black tracking-tight">Subject Breakdown</CardTitle>
                <CardDescription className="text-xs font-medium">Proficiency analysis by simulation phase.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.subjectChartData} layout="vertical" margin={{ left: 60, right: 40 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" width={120} style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.1)' }} />
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
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 text-white p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-10"><Lock className="w-32 h-32" /></div>
          <CardHeader className="space-y-4">
            <CardTitle className="text-4xl font-black tracking-tight">Unlock Detailed Analysis</CardTitle>
            <CardDescription className="text-slate-400 font-medium max-w-lg mx-auto text-lg">
              Get access to AI pedagogical insights, strength/weakness breakdown, and mistake review by watching a short ad.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Button 
              size="lg" 
              onClick={handleUnlockAnalysis} 
              disabled={unlocking}
              className="h-16 px-12 rounded-2xl font-black text-xl gap-3 shadow-2xl bg-primary text-slate-900 hover:bg-primary/90 transition-transform active:scale-95"
            >
              {unlocking ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6 fill-current" />}
              {unlocking ? "Verifying Ad..." : "Unlock Full Analysis"}
            </Button>
            <p className="mt-6 text-xs text-slate-500 font-bold uppercase tracking-widest">Immediate Access for Pro Users</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {aiSummary && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8">
              <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden rounded-[2.5rem]">
                <div className="h-1.5 bg-primary w-full" />
                <CardHeader className="flex flex-row items-center gap-4 p-8 pb-4">
                  <div className="p-3 bg-primary/10 rounded-2xl"><Trophy className="w-6 h-6 text-primary" /></div>
                  <CardTitle className="text-xl font-black tracking-tight">Pedagogical Analysis</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-6">
                  <div className="p-6 bg-primary/5 rounded-[2rem] italic text-lg leading-relaxed border-l-4 border-primary font-medium text-slate-700">
                    "{aiSummary.summary}"
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 font-black text-emerald-600 uppercase tracking-widest text-[10px]"><Target className="w-4 h-4" /> Conceptual Strengths</h3>
                      <div className="flex flex-wrap gap-2">
                        {aiSummary.strengths.map((s, idx) => (
                          <Badge key={idx} variant="secondary" className="px-3 py-1 text-[11px] font-bold rounded-lg">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 font-black text-destructive uppercase tracking-widest text-[10px]"><BookOpen className="w-4 h-4" /> Recommended Focus</h3>
                      <div className="flex flex-wrap gap-2">
                        {aiSummary.weaknesses.map((w, idx) => (
                          <Badge key={idx} variant="outline" className="px-3 py-1 border-destructive/20 text-destructive text-[11px] font-bold rounded-lg">{w}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-1 border-none shadow-sm bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                <CardHeader className="p-0 mb-6"><CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Actionable Roadmap</CardTitle></CardHeader>
                <CardContent className="p-0 text-sm text-slate-300 font-medium leading-relaxed">{aiSummary.recommendations}</CardContent>
              </Card>
            </div>
          )}

          <div className="space-y-6">
            <h2 className="text-2xl font-black font-headline tracking-tight flex items-center gap-3">
              <BrainCircuit className="w-6 h-6 text-primary" /> Mistake Review & AI Tutor
            </h2>
            {totalMistakes > 0 ? (
              <Accordion type="single" collapsible className="w-full space-y-4">
                {Object.entries(categorizedMistakes).map(([subject, mistakes]) => (
                  <div key={subject} className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-primary px-2">{subject}</p>
                    {mistakes.map((q) => (
                      <AccordionItem key={q.id} value={q.id} className="border-none bg-white rounded-2xl px-2 overflow-hidden shadow-sm">
                        <AccordionTrigger className="hover:no-underline py-4 px-4 text-left">
                          <span className="text-xs font-bold line-clamp-1">{q.text}</span>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0 space-y-4">
                          {/* Show the question without highlighting correct answer - user must ask AI */}
                          <div className="bg-slate-50 p-4 rounded-xl border">
                            <p className="font-bold text-sm mb-3">{q.text}</p>
                            <div className="grid gap-2">
                              {q.options.map((opt, i) => {
                                const isUserAnswer = opt === answers[q.id];
                                return (
                                  <div 
                                    key={i} 
                                    className={cn(
                                      "p-3 rounded-lg border text-xs flex items-center gap-2",
                                      isUserAnswer 
                                        ? "bg-orange-50 border-orange-200 text-orange-700 font-bold" 
                                        : "bg-white opacity-70"
                                    )}
                                  >
                                    <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[9px] shrink-0">
                                      {String.fromCharCode(65 + i)}
                                    </span>
                                    {opt}
                                    {isUserAnswer && <span className="ml-auto text-[10px] font-black">YOUR ANSWER</span>}
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-3 italic">Tap "Ask AI for Explanation" to reveal the correct answer and learn why.</p>
                          </div>
                          
                          {/* AI Generation Animation */}
                          {!localExplanations[q.id] ? (
                            <Button 
                              onClick={() => handleGenerateExplanation(q)} 
                              disabled={generatingIds.has(q.id)} 
                              size="sm" 
                              className={cn(
                                "w-full font-black gap-2 transition-all",
                                generatingIds.has(q.id) 
                                  ? "bg-primary/10 text-primary border-2 border-primary/20" 
                                  : "hover:bg-primary/5"
                              )}
                            >
                              {generatingIds.has(q.id) ? (
                                <>
                                  <div className="relative">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <div className="absolute inset-0 w-4 h-4 border-2 border-primary/30 rounded-full animate-ping" />
                                  </div>
                                  <span className="flex items-center gap-1">
                                    Analyzing your mistake
                                    <span className="flex gap-0.5">
                                      <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                      <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                      <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </span>
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  Ask AI for Explanation (2 AI Credits)
                                </>
                              )}
                            </Button>
                          ) : (
                            <div className="relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" />
                              <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 italic text-sm text-slate-700 leading-relaxed relative">
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-xl" />
                                <div className="flex items-start gap-2 mb-2">
                                  <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">AI Explanation</span>
                                </div>
                                "{localExplanations[q.id]}"
                              </div>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </div>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-20 bg-emerald-50/50 rounded-[3rem] border-2 border-dashed border-emerald-100">
                <Trophy className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black">Exceptional Mastery!</h3>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
