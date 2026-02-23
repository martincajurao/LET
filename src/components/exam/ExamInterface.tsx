
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    let timer: NodeJS.Timeout;
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

      // 1. Check Cache
      const cachedDoc = await getDoc(explanationRef);
      if (cachedDoc.exists()) {
        setExplanation(cachedDoc.data().explanation);
        setShowExplanation(true);
        setExplaining(false);
        return;
      }

      // 2. Check Credits
      if (!user.isPro && (user.credits || 0) < 2) {
        throw new Error("Insufficient AI Credits. Complete daily tasks to earn more!");
      }

      // 3. Call AI Flow
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
      
      // 4. Perform Client-Side Mutations
      const userRef = doc(firestore, 'users', user.uid);
      
      // Deduct Credits
      if (!user.isPro) {
        updateDoc(userRef, {
          credits: increment(-2),
          dailyAiUsage: increment(1),
          lastExplanationRequest: Date.now()
        });
      }

      // Cache Explanation
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
    <div className="max-w-4xl mx-auto space-y-4">
      <Dialog open={showBreakDialog} onOpenChange={setShowBreakDialog}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-none shadow-2xl">
          <DialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center">
              <Coffee className="w-8 h-8 text-secondary-foreground" />
            </div>
            <DialogTitle className="text-center text-2xl font-black tracking-tight">Phase Complete!</DialogTitle>
            <DialogDescription className="text-center text-sm font-medium text-slate-500">
              You've finished the current phase. Take a short rest or proceed directly to the next track.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center space-y-4 py-2">
            {isResting ? (
              <div className="space-y-3">
                <div className="font-bold text-primary text-lg">Resting... Take a deep breath.</div>
                <div className="text-4xl font-mono font-black tabular-nums">{formatTime(restTimer)}</div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-lg text-foreground font-medium leading-relaxed px-4">
                  You've finished the <span className="font-black text-primary underline underline-offset-4">{currentPhase.name}</span> phase.
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-3 mt-6">
            {!isResting && (
              <Button variant="outline" className="w-full gap-2 font-bold h-12 rounded-xl" onClick={() => setIsResting(true)}>
                <Coffee className="w-4 h-4" />
                Take a Rest
              </Button>
            )}
            <Button className="w-full gap-2 font-bold h-12 rounded-xl shadow-lg" onClick={() => { setShowBreakDialog(false); setIsResting(false); setCurrentIdx(prev => prev + 1); }}>
              {isResting ? <PlayCircle className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {isResting ? "Resume Simulation" : "Proceed to Next Phase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="font-black">Submit Simulation?</DialogTitle>
            <DialogDescription>
              You are about to finish your board track. Your analytics and board readiness score will be calculated based on your performance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" className="font-bold" onClick={() => setShowSubmitConfirm(false)}>Review More</Button>
            <Button className="font-black rounded-xl" onClick={handleSubmit}>Yes, Submit Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExplanation} onOpenChange={setShowExplanation}>
        <DialogContent className="max-w-lg rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black">
               <Sparkles className="w-5 h-5 text-primary" /> AI Pedagogical Insight
            </DialogTitle>
            <DialogDescription>
              A brief explanation focusing on the board-standard reasoning for this specific item.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 italic text-slate-700 leading-relaxed font-medium">
            "{explanation}"
          </div>
          <DialogFooter>
            <Button variant="secondary" className="w-full rounded-xl font-black" onClick={() => setShowExplanation(false)}>Understood</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-border sticky top-4 z-10 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 pr-4 border-r">
            <Clock className="w-4 h-4 text-primary" />
            <p className={`text-lg font-mono font-bold tabular-nums ${timeLeft < 60 ? 'text-destructive animate-pulse' : ''}`}>
              {formatTime(timeLeft)}
            </p>
          </div>
          <div className="flex items-center gap-2 truncate">
            <Layers className="w-4 h-4 text-secondary-foreground" />
            <p className="text-sm font-bold truncate">Phase {currentPhase.step}: {currentPhase.name}</p>
          </div>
        </div>
        <div className="flex-1 px-4 md:px-8 w-full">
          <Progress value={progress} className="h-1.5 rounded-full" />
        </div>
        <Button variant="default" size="sm" className="font-bold gap-2 ml-2 h-10 px-6 rounded-xl shadow-md transform active:scale-95" onClick={() => setShowSubmitConfirm(true)}>
          <Send className="w-4 h-4" />
          Finish Test
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-none shadow-md overflow-hidden rounded-[2rem]">
            <CardHeader className="bg-primary/5 py-6 px-8 border-b border-primary/10">
              <div className="flex justify-between items-center mb-4">
                <Badge variant="outline" className="bg-white border-primary/20 text-[10px] font-black uppercase tracking-widest">{currentQuestion.subject}</Badge>
                <Button variant="ghost" size="sm" onClick={toggleFlag} className={`h-8 px-3 rounded-lg text-[10px] font-bold ${flags[currentQuestion.id] ? "text-orange-500 bg-orange-50" : "text-muted-foreground"}`}>
                  <Flag className={`w-3.5 h-3.5 mr-1.5 ${flags[currentQuestion.id] ? "fill-orange-500" : ""}`} />
                  {flags[currentQuestion.id] ? "Flagged for Review" : "Flag Question"}
                </Button>
              </div>
              <CardTitle className="text-2xl leading-snug font-headline tracking-tight">{currentQuestion.text}</CardTitle>
             </CardHeader>
            <CardContent className="pt-8 pb-10 px-4 md:px-12">
              <RadioGroup value={answers[currentQuestion.id] || ""} onValueChange={handleAnswer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shuffledOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center">
                    <RadioGroupItem value={opt} id={`opt-${idx}`} className="sr-only" />
                    <Label htmlFor={`opt-${idx}`} className={`flex flex-1 items-center p-5 rounded-2xl border-2 cursor-pointer transition-all hover:bg-primary/5 min-h-[80px] ${answers[currentQuestion.id] === opt ? "border-primary bg-primary/10 shadow-sm ring-4 ring-primary/5" : "border-border bg-white"}`}>
                      <span className={`w-10 h-10 flex items-center justify-center rounded-full mr-4 text-xs font-black border-2 shrink-0 transition-colors ${answers[currentQuestion.id] === opt ? "bg-primary text-primary-foreground border-primary" : "border-border bg-muted text-muted-foreground"}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-base font-bold leading-tight">{opt}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
            <CardFooter className="flex justify-between bg-muted/20 p-6 border-t gap-2">
              <Button variant="outline" size="lg" className="font-bold rounded-xl px-8" onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))} disabled={currentIdx === 0}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button variant="outline" size="lg" className="font-bold rounded-xl px-8 shadow-sm border-primary/20 text-primary hover:bg-primary/5" onClick={handleExplain} disabled={explaining}>
                {explaining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Explain with AI
              </Button>
              <Button variant="outline" size="lg" className="font-bold rounded-xl px-8" onClick={handleNext} disabled={currentIdx === questions.length - 1}>
                Next Question
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="border-none shadow-md sticky top-24 rounded-[2rem] overflow-hidden">
            <CardHeader className="py-4 px-6 border-b bg-muted/20">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Simulation Navigator</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
              {Object.entries(categorizedNavigator).map(([subject, data]) => (
                <div key={subject} className="space-y-2">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-1">{subject}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {data.questions.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIdx(q.originalIndex)}
                        className={`w-full aspect-square rounded-xl text-[10px] font-black transition-all relative flex items-center justify-center shadow-sm ${currentIdx === q.originalIndex ? 'ring-2 ring-primary ring-offset-2 scale-105 z-10' : ''} ${answers[q.id] ? 'bg-primary text-primary-foreground shadow-primary/20' : 'bg-muted/50 text-muted-foreground'} ${flags[q.id] ? 'border-2 border-orange-400' : ''}`}
                      >
                        {q.originalIndex + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
