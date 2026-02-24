'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Clock, ChevronLeft, ChevronRight, Flag, Layers, Send, AlertTriangle } from "lucide-react";
import { Question } from "@/app/lib/mock-data";
import { cn } from "@/lib/utils";

interface ExamInterfaceProps {
  questions: Question[];
  timePerQuestion?: number;
  onComplete: (answers: Record<string, string>, timeSpent: number) => void;
}

export function ExamInterface({ questions, timePerQuestion = 60, onComplete }: ExamInterfaceProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(questions.length * (timePerQuestion || 60));
  const [startTime] = useState(Date.now());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const handleSubmit = useCallback(() => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    onComplete(answers, timeSpent);
  }, [answers, startTime, onComplete]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (val: string) => {
    setAnswers(prev => ({ ...prev, [questions[currentIdx].id]: val }));
    // Emit event for analytics/daily tasks
    window.dispatchEvent(new CustomEvent('questionAnswered'));
  };

  const currentQuestion = questions[currentIdx];
  const progress = ((currentIdx + 1) / (questions.length || 1)) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col animate-in fade-in duration-300">
      {/* Simulation Top Bar (Android Status Bar Style) */}
      <header className="h-16 border-b bg-card/50 backdrop-blur-xl flex items-center justify-between px-4 sm:px-8 shrink-0">
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors",
            timeLeft < 60 ? "bg-destructive/10 border-destructive text-destructive animate-pulse" : "bg-primary/10 border-primary/20 text-primary"
          )}>
            <Clock className="w-4 h-4" />
            <span className="text-sm font-black font-mono">{formatTime(timeLeft)}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
            <Layers className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">{currentQuestion?.subject}</span>
          </div>
        </div>

        <div className="flex-1 max-w-xs mx-4 hidden md:block">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Overall Progress</span>
            <span className="text-[10px] font-black text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <Button 
          variant="default" 
          size="sm" 
          onClick={() => setShowSubmitConfirm(true)}
          className="font-black rounded-xl px-6 shadow-lg shadow-primary/20 bg-primary h-10"
        >
          <Send className="w-4 h-4 mr-2" />
          Finish
        </Button>
      </header>

      {/* Main Simulation Area */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-32">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <Badge variant="secondary" className="px-3 py-1 font-black uppercase text-[10px] tracking-widest bg-muted/50">
                Item {currentIdx + 1} of {questions.length}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setFlags(p => ({...p, [currentQuestion.id]: !p[currentQuestion.id]}))}
                className={cn("h-8 gap-2 rounded-lg", flags[currentQuestion.id] && "text-orange-500 bg-orange-500/10")}
              >
                <Flag className={cn("w-4 h-4", flags[currentQuestion.id] && "fill-current")} /> 
                <span className="text-xs font-bold">{flags[currentQuestion.id] ? "Flagged" : "Review Later"}</span>
              </Button>
            </div>

            <div className="space-y-8">
              <h2 className="text-xl md:text-3xl font-black leading-tight text-foreground tracking-tight">
                {currentQuestion?.text}
              </h2>

              <RadioGroup 
                value={answers[currentQuestion?.id] || ""} 
                onValueChange={handleAnswer} 
                className="grid grid-cols-1 gap-2"
              >
                {currentQuestion?.options.map((opt, i) => (
                  <Label 
                    key={i} 
                    className={cn(
                      "flex items-center p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98]",
                      answers[currentQuestion.id] === opt 
                        ? "border-primary bg-primary/5 ring-4 ring-primary/10" 
                        : "border-border bg-card hover:bg-muted/10"
                    )}
                  >
                    <RadioGroupItem value={opt} className="sr-only" />
                    <div className={cn(
                      "w-8 h-8 md:w-10 md:h-10 rounded-full border-2 flex items-center justify-center mr-3 font-black transition-colors shrink-0",
                      answers[currentQuestion.id] === opt 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "border-border bg-muted text-muted-foreground"
                    )}>
                      {String.fromCharCode(65+i)}
                    </div>
                    <span className="text-sm md:text-base font-bold text-foreground leading-snug">{opt}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </div>
        </div>

        {/* Desktop Side Navigator */}
        <aside className="hidden lg:flex w-72 border-l bg-muted/5 p-6 flex-col gap-6 overflow-y-auto">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Navigator</h3>
            <p className="text-[10px] font-medium text-muted-foreground">Jump to any question instantly.</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, i) => (
              <button 
                key={q.id} 
                onClick={() => setCurrentIdx(i)}
                className={cn(
                  "aspect-square rounded-xl text-xs font-black border-2 transition-all",
                  currentIdx === i 
                    ? "border-primary bg-primary text-primary-foreground shadow-lg" 
                    : answers[q.id] 
                      ? "border-primary/20 bg-primary/5 text-primary" 
                      : "border-border text-muted-foreground hover:bg-muted",
                  flags[q.id] && "border-orange-500/50 bg-orange-500/10 text-orange-600"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-auto pt-6 border-t space-y-4">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-muted-foreground">Answered</span>
              <span className="text-foreground">{answeredCount} / {questions.length}</span>
            </div>
            <Progress value={(answeredCount / questions.length) * 100} className="h-1.5" />
          </div>
        </aside>
      </main>

      {/* Mobile Sticky Navigation Footer */}
      <footer className="h-20 shrink-0 border-t bg-card/80 backdrop-blur-xl flex items-center justify-between px-6 pb-safe-area shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <Button 
          variant="outline" 
          onClick={() => setCurrentIdx(p => Math.max(0, p-1))} 
          disabled={currentIdx === 0}
          className="rounded-xl px-6 h-12 font-black text-xs border-border"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <div className="text-center md:hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Item</p>
          <p className="text-sm font-black text-foreground">{currentIdx + 1} / {questions.length}</p>
        </div>

        <Button 
          variant="outline" 
          onClick={() => setCurrentIdx(p => Math.min(questions.length-1, p+1))} 
          disabled={currentIdx === questions.length-1}
          className="rounded-xl px-6 h-12 font-black text-xs border-border"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </footer>

      {/* Submission Confirmation */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-8 max-w-sm">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
            <DialogTitle className="text-2xl font-black">Finalize Simulation?</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              You have answered <span className="text-foreground font-black">{answeredCount} out of {questions.length}</span> items. Once submitted, you cannot change your answers.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 pt-4">
            <Button 
              onClick={handleSubmit} 
              className="h-12 rounded-xl font-bold shadow-lg shadow-primary/30"
            >
              Submit Now
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowSubmitConfirm(false)} 
              className="h-12 rounded-xl font-bold text-muted-foreground"
            >
              Continue Reviewing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
