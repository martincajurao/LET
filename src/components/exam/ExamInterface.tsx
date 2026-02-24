'use client';

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
import { Clock, ChevronLeft, ChevronRight, Flag, Send, Layers, Coffee, PlayCircle, Sparkles } from "lucide-react";
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
    if (timeLeft <= 0) { handleSubmit(); return; }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [isResting, timeLeft, handleSubmit]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (val: string) => {
    setAnswers(prev => ({ ...prev, [questions[currentIdx].id]: val }));
    window.dispatchEvent(new CustomEvent('questionAnswered'));
  };

  const currentQuestion = questions[currentIdx];
  const progress = ((currentIdx + 1) / (questions.length || 1)) * 100;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      <header className="flex flex-col sm:flex-row justify-between items-center bg-card p-4 rounded-2xl shadow-sm border border-border gap-4 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-border">
            <Clock className="w-5 h-5 text-primary" />
            <span className={`text-lg font-mono font-bold ${timeLeft < 60 ? 'text-destructive animate-pulse' : 'text-foreground'}`}>{formatTime(timeLeft)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-bold text-foreground">Phase: {currentQuestion?.subject}</span>
          </div>
        </div>
        <Progress value={progress} className="flex-1 h-2 max-w-md" />
        <Button onClick={() => setShowSubmitConfirm(true)} className="font-bold shadow-lg shadow-primary/20">Submit Simulation</Button>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        <Card className="lg:col-span-3 bg-card border-none shadow-xl rounded-3xl overflow-y-auto">
          <CardHeader className="border-b border-border bg-muted/5">
            <div className="flex justify-between items-center mb-4">
              <Badge variant="secondary" className="px-3 py-1 font-black uppercase text-[10px]">{currentQuestion?.subject}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setFlags(p => ({...p, [currentQuestion.id]: !p[currentQuestion.id]}))} className={cn("gap-2", flags[currentQuestion.id] && "text-orange-500")}><Flag className={cn("w-4 h-4", flags[currentQuestion.id] && "fill-current")} /> {flags[currentQuestion.id] ? "Flagged" : "Flag"}</Button>
            </div>
            <CardTitle className="text-xl md:text-2xl font-black leading-tight text-foreground">{currentQuestion?.text}</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <RadioGroup value={answers[currentQuestion?.id] || ""} onValueChange={handleAnswer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion?.options.map((opt, i) => (
                <Label key={i} className={cn("flex items-center p-6 rounded-2xl border-2 cursor-pointer transition-all hover:bg-muted/10", answers[currentQuestion.id] === opt ? "border-primary bg-primary/5" : "border-border bg-card")}>
                  <RadioGroupItem value={opt} className="sr-only" />
                  <div className={cn("w-10 h-10 rounded-full border-2 flex items-center justify-center mr-4 font-black transition-colors", answers[currentQuestion.id] === opt ? "bg-primary border-primary text-primary-foreground" : "border-border bg-muted text-muted-foreground")}>{String.fromCharCode(65+i)}</div>
                  <span className="font-bold text-foreground">{opt}</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter className="p-8 bg-muted/5 border-t border-border flex justify-between">
            <Button variant="outline" onClick={() => setCurrentIdx(p => Math.max(0, p-1))} disabled={currentIdx === 0} className="rounded-xl px-8 border-border hover:bg-muted">Previous</Button>
            <Button variant="outline" onClick={() => setCurrentIdx(p => Math.min(questions.length-1, p+1))} disabled={currentIdx === questions.length-1} className="rounded-xl px-8 border-border hover:bg-muted">Next Item</Button>
          </CardFooter>
        </Card>

        <Card className="hidden lg:flex flex-col bg-card border-none shadow-xl rounded-3xl transition-colors duration-300">
          <CardHeader className="border-b border-border"><CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Navigator</CardTitle></CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, i) => (
                <button key={q.id} onClick={() => setCurrentIdx(i)} className={cn("aspect-square rounded-lg text-xs font-bold border-2 transition-all", currentIdx === i ? "border-primary bg-primary text-primary-foreground" : answers[q.id] ? "border-primary/20 bg-primary/5 text-primary" : "border-border text-muted-foreground", flags[q.id] && "bg-orange-500/10 border-orange-500/50 text-orange-600")}>{i + 1}</button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-[2rem] bg-card border-none">
          <DialogHeader><DialogTitle className="text-2xl font-black">Submit Simulation?</DialogTitle><DialogDescription>Your board readiness score will be calculated.</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>Review Items</Button><Button onClick={handleSubmit} className="font-black bg-primary">Finalize Simulation</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}