'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Clock, ChevronLeft, ChevronRight, Flag, Send, Layers, Coffee, PlayCircle, Sparkles, Loader2 } from "lucide-react";
import { Question } from "@/app/lib/mock-data";
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { explainQuestion } from '@/ai/flows/explain-question';

interface ExamInterfaceProps {
  questions: Question[];
  timePerQuestion?: number;
  onComplete: (answers: Record<string, string>, timeSpent: number) => void;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export function ExamInterface({ questions, timePerQuestion = 60, onComplete }: ExamInterfaceProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(questions.length * (timePerQuestion || 60));
  const [startTime] = useState(Date.now());
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [explaining, setExplaining] = useState(false);

  const handleSubmit = useCallback(() => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    onComplete(answers, timeSpent);
  }, [answers, startTime, onComplete]);

  useEffect(() => {
    if (isResting) return;
    
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isResting, timeLeft, handleSubmit]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isResting) {
      timer = setInterval(() => {
        setRestTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isResting]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (val: string) => {
    setAnswers(prev => ({ ...prev, [questions[currentIdx].id]: val }));
  };

  const toggleFlag = () => {
    setFlags(prev => ({ ...prev, [questions[currentIdx].id]: !prev[questions[currentIdx].id] }));
  };

  const handleNext = () => {
    const nextIdx = currentIdx + 1;
    if (nextIdx < questions.length) {
      const currentSubject = questions[currentIdx].subject;
      const nextSubject = questions[nextIdx].subject;
      
      if (nextSubject !== currentSubject) {
        setShowBreakDialog(true);
      } else {
        setCurrentIdx(nextIdx);
      }
    }
  };
  
  const handleExplain = async () => {
    if (explaining || !user || !firestore) return;
    
    setExplaining(true);
    try {
      const question = questions[currentIdx];
      const explanationRef = doc(firestore, 'ai_explanations', question.id);

      const cachedDoc = await getDoc(explanationRef);
      if (cachedDoc.exists()) {
        setExplanation(cachedDoc.data().explanation);
        setShowExplanation(true);
        setExplaining(false);
        return;
      }

      if (!user.isPro && (user.credits || 0) < 2) {
        throw new Error("Insufficient AI Credits. Complete daily tasks to earn more!");
      }

      const result = await explainQuestion({
        questionText: question.text,
        options: question.options,
        correctAnswer: question.correctAnswer
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setExplanation(result.explanation);
      setShowExplanation(true);
      
      const userRef = doc(firestore, 'users', user.uid);
      
      if (!user.isPro) {
        updateDoc(userRef, {
          credits: increment(-2),
          dailyAiUsage: increment(1),
          lastExplanationRequest: Date.now()
        });
      }

      setDoc(explanationRef, {
        explanation: result.explanation,
        createdAt: serverTimestamp()
      });

    } catch (e: any) {
      console.error(e);
      setExplanation(e.message || "Could not generate AI explanation.");
      setShowExplanation(true);
    } finally {
      setExplaining(false);
    }
  };

  const currentQuestion = questions[currentIdx];
  const progress = ((currentIdx + 1) / (questions.length || 1)) * 100;

  const currentPhase = useMemo(() => {
    if (!currentQuestion) return { step: '?', name: 'Unknown' };
    const order = ['General Education', 'Professional Education', 'Specialization'];
    const idx = order.indexOf(currentQuestion.subject);
    const phaseName = currentQuestion.subject === 'Specialization' && currentQuestion.subCategory 
      ? `Specialization (${currentQuestion.subCategory})`
      : currentQuestion.subject;

    return {
      step: idx !== -1 ? idx + 1 : '?',
      name: phaseName
    };
  }, [currentQuestion]);

  const shuffledOptions = useMemo(() => {
    if (!currentQuestion) return [];
    return shuffleArray(currentQuestion.options);
  }, [currentQuestion?.id]);

  const categorizedNavigator = useMemo(() => {
    const categories: Record<string, { questions: (Question & { originalIndex: number })[] }> = {};
    questions.forEach((q, idx) => {
      const key = q.subject === 'Specialization' && q.subCategory 
        ? `${q.subject}: ${q.subCategory}`
        : q.subject;

      if (!categories[key]) {
        categories[key] = { questions: [] };
      }
      categories[key].questions.push({ ...q, originalIndex: idx });
    });
    return categories;
  }, [questions]);

  if (!currentQuestion) return null;

  return (
    <div ref={containerRef} className="h-[calc(100vh-100px)] min-h-[400px] flex flex-col">
      {/* Compact Header */}
      <div className="flex-shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-sm border border-border sticky top-0 z-10 gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
<div className="flex items-center gap-2 pr-2 sm:pr-3 border-r">
              <Clock className="w-4 h-4 text-primary" />
              <p className={`text-sm sm:text-base font-mono font-bold tabular-nums ${timeLeft < 60 ? 'text-destructive animate-pulse' : ''}`}>
                {formatTime(timeLeft)}
              </p>
            </div>
            <div className="flex items-center gap-1 truncate">
              <Layers className="w-4 h-4 text-secondary-foreground shrink-0" />
              <p className="text-xs sm:text-sm font-bold truncate">Phase {currentPhase.step}: {currentPhase.name}</p>
            </div>
          </div>
          <div className="flex-1 px-2 w-full order-first sm:order-none">
            <Progress value={progress} className="h-1.5 rounded-full" />
          </div>
          <Button variant="default" size="sm" className="font-bold gap-1 h-9 px-3 sm:px-5 rounded-lg" onClick={() => setShowSubmitConfirm(true)}>
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Finish Test</span>
            <span className="sm:hidden text-sm">Submit</span>
          </Button>
        </div>
      </div>

      {/* Main Content - Compact */}
      <div className="flex-1 overflow-hidden pt-2 pb-2">
        <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-2">
          {/* Question Area */}
          <div className="lg:col-span-3 h-full overflow-y-auto">
            <Card className="border-none shadow-md overflow-hidden rounded-lg h-fit">
<CardHeader className="bg-primary/5 py-3 px-4 border-b border-primary/10">
                <div className="flex flex-row justify-between items-center gap-2">
                  <Badge variant="outline" className="bg-white border-primary/20 text-xs font-bold uppercase tracking-wider w-fit">{currentQuestion.subject}</Badge>
                  <Button variant="ghost" size="sm" onClick={toggleFlag} className={`h-8 px-2 rounded text-sm font-bold ${flags[currentQuestion.id] ? "text-orange-500 bg-orange-50" : "text-muted-foreground"}`}>
                    <Flag className={`w-4 h-4 ${flags[currentQuestion.id] ? "fill-orange-500" : ""}`} />
                  </Button>
                </div>
                <CardTitle className="text-base sm:text-lg leading-tight font-headline tracking-tight">{currentQuestion.text}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4 px-4">
<RadioGroup value={answers[currentQuestion.id] || ""} onValueChange={handleAnswer} className={`grid ${shuffledOptions.some(o => o.length > 60) ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                  {shuffledOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center">
                      <RadioGroupItem value={opt} id={`opt-${idx}`} className="sr-only" />
                      <Label htmlFor={`opt-${idx}`} className={`flex flex-1 items-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-primary/5 text-sm ${answers[currentQuestion.id] === opt ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/5" : "border-border bg-white"}`}>
                        <span className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full mr-2 text-xs font-bold border-2 shrink-0 transition-colors ${answers[currentQuestion.id] === opt ? "bg-primary text-primary-foreground border-primary" : "border-border bg-muted text-muted-foreground"}`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-sm font-medium leading-relaxed">{opt}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
<CardFooter className="flex flex-wrap justify-center sm:justify-between bg-muted/20 p-2 sm:p-3 border-t gap-1">
                <Button variant="outline" size="sm" className="font-bold rounded px-2 sm:px-4 flex-1 sm:flex-none h-8 text-xs" onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))} disabled={currentIdx === 0}>
                  <ChevronLeft className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">Prev</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
                <Button variant="outline" size="sm" className="font-bold rounded px-2 sm:px-4 flex-1 sm:flex-none h-8 text-xs" onClick={handleNext} disabled={currentIdx === questions.length - 1}>
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          </div>

{/* Navigator - Fixed on lg screens */}
          <div className="lg:col-span-1 hidden lg:block h-full">
            <Card className="border-none shadow-md sticky top-0 rounded-lg overflow-hidden h-full flex flex-col">
              <CardHeader className="py-2 px-3 border-b bg-muted/20 flex-shrink-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Navigator</CardTitle>
                {/* Compact Legend */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.keys(categorizedNavigator).slice(0, 3).map((subject, idx) => (
                    <div key={subject} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-green-500' : 'bg-purple-500'}`} />
                      <span className="text-[8px] text-muted-foreground truncate max-w-[60px]">{subject.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-2 overflow-y-auto flex-1">
                {/* Compact Grid - 10 columns for 450 questions */}
                <div className="grid grid-cols-8 gap-0.5">
                  {questions.map((q, idx) => {
                    const catIdx = Object.keys(categorizedNavigator).findIndex(cat => 
                      cat.includes(q.subject) || (q.subject === 'Specialization' && cat.includes('Specialization'))
                    );
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIdx(idx)}
                        title={`Q${idx + 1}`}
                        className={`
                          w-full aspect-square rounded text-[8px] font-bold transition-all relative flex items-center justify-center
                          ${currentIdx === idx ? 'ring-1 ring-primary ring-offset-1 z-10' : ''}
                          ${answers[q.id] ? (currentIdx === idx ? 'bg-primary text-primary-foreground' : 'bg-blue-100 text-blue-700') : 'bg-muted/40 text-muted-foreground'}
                          ${flags[q.id] ? 'border border-orange-500' : ''}
                        `}
                        style={{
                          backgroundColor: answers[q.id] 
                            ? (currentIdx === idx ? undefined : catIdx === 0 ? '#dbeafe' : catIdx === 1 ? '#dcfce7' : '#f3e8ff')
                            : undefined,
                          color: answers[q.id] 
                            ? (currentIdx === idx ? 'white' : catIdx === 0 ? '#1d4ed8' : catIdx === 1 ? '#15803d' : '#7e22ce')
                            : undefined
                        }}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
              {/* Quick Stats Footer */}
              <CardFooter className="py-2 px-3 border-t bg-muted/20 flex-shrink-0">
                <div className="flex justify-between text-[8px] font-medium text-muted-foreground w-full">
                  <span>Answered: {Object.keys(answers).length}/{questions.length}</span>
                  <span>Flagged: {Object.keys(flags).filter(k => flags[k]).length}</span>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showBreakDialog} onOpenChange={setShowBreakDialog}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-none shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="mx-auto w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
              <Coffee className="w-6 h-6 text-secondary-foreground" />
            </div>
            <DialogTitle className="text-center text-xl font-black tracking-tight">Phase Complete!</DialogTitle>
            <DialogDescription className="text-center text-xs font-medium text-slate-500">
              You've finished the current phase. Take a short rest or proceed directly to the next track.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center space-y-3 py-2">
            {isResting ? (
              <div className="space-y-2">
                <div className="font-bold text-primary text-sm">Resting... Take a deep breath.</div>
                <div className="text-3xl font-mono font-black tabular-nums">{formatTime(restTimer)}</div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-foreground font-medium leading-relaxed px-2">
                  You've finished the <span className="font-black text-primary underline underline-offset-2">{currentPhase.name}</span> phase.
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            {!isResting && (
              <Button variant="outline" className="w-full gap-2 font-bold h-10 rounded-lg" onClick={() => setIsResting(true)}>
                <Coffee className="w-4 h-4" />
                Rest
              </Button>
            )}
            <Button className="w-full gap-2 font-bold h-10 rounded-lg shadow-lg" onClick={() => { setShowBreakDialog(false); setIsResting(false); setCurrentIdx(prev => prev + 1); }}>
              {isResting ? <PlayCircle className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {isResting ? "Resume" : "Next Phase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">Submit Simulation?</DialogTitle>
            <DialogDescription className="text-xs">
              You are about to finish your board track. Your analytics and board readiness score will be calculated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="font-bold text-xs" onClick={() => setShowSubmitConfirm(false)}>Review</Button>
            <Button className="font-black rounded-xl text-xs" onClick={handleSubmit}>Submit Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExplanation} onOpenChange={setShowExplanation}>
        <DialogContent className="max-w-md rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black text-sm">
               <Sparkles className="w-4 h-4 text-primary" /> AI Insight
            </DialogTitle>
            <DialogDescription className="text-xs">
              Board-standard reasoning for this item.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 italic text-slate-700 leading-relaxed text-xs font-medium">
            "{explanation}"
          </div>
          <DialogFooter>
            <Button variant="secondary" className="w-full rounded-xl font-black text-xs" onClick={() => setShowExplanation(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
