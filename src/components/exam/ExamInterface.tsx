'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
} from "@/components/ui/dialog";
import { 
  ChevronLeft, 
  Send, 
  Timer,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Flame,
  Sparkles,
  X,
  AlertTriangle
} from "lucide-react";
import { Question } from "@/app/lib/mock-data";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ExamInterfaceProps {
  questions: Question[];
  timePerQuestion?: number;
  onComplete: (answers: Record<string, string>, timeSpent: number, confidentAnswers: Record<string, boolean>) => void;
}

export function ExamInterface({ questions, timePerQuestion = 60, onComplete }: ExamInterfaceProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confidentAnswers, setConfidentAnswers] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(questions.length * timePerQuestion);
  const [startTime] = useState(Date.now());
  const [correctStreak, setCorrectStreak] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = useCallback(() => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    onComplete(answers, timeSpent, confidentAnswers);
  }, [answers, startTime, confidentAnswers, onComplete]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit]);

  const handleAnswer = (val: string) => {
    const currentQ = questions[currentIdx];
    const isCorrect = val === currentQ.correctAnswer;

    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
    
    // Streak logic
    if (isCorrect) {
      setCorrectStreak(prev => prev + 1);
    } else {
      setCorrectStreak(0);
    }

    // Auto-advance after small delay
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    
    if (currentIdx < questions.length - 1) {
      autoAdvanceTimer.current = setTimeout(() => {
        setCurrentIdx(prev => prev + 1);
      }, 400);
    }
  };

  const toggleConfidence = () => {
    const currentQ = questions[currentIdx];
    setConfidentAnswers(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === questions.length;
  const progress = ((currentIdx + 1) / questions.length) * 100;

  if (!currentQuestion) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-background flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* Immersive Header - Overwrites layout Navbar */}
      <header className="pt-safe border-b bg-card shrink-0 shadow-sm">
        <div className="h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowExitConfirm(true)}
              className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="h-8 w-[1px] bg-border mx-1" />
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all",
              timeLeft < 60 ? "bg-rose-500/10 border-rose-500 text-rose-600 animate-pulse" : "bg-primary/10 border-primary/20 text-primary"
            )}>
              <Timer className="w-4 h-4" />
              <span className="text-sm font-black font-mono tracking-tight">{formatTime(timeLeft)}</span>
            </div>
          </div>

          <div className="flex flex-col items-center flex-1 mx-4 max-w-xs">
            <div className="flex justify-between w-full mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trace {currentIdx + 1}/{questions.length}</span>
              <span className="text-[10px] font-black text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5 rounded-full" />
          </div>

          <div className="flex items-center gap-2">
            {correctStreak >= 3 && (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5 px-3 py-1 bg-orange-500 text-white rounded-full shadow-lg"
              >
                <Flame className="w-3.5 h-3.5 fill-current animate-bounce" />
                <span className="text-[10px] font-black uppercase">{correctStreak} Streak</span>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-8 md:p-12 no-scrollbar">
        <div className="max-w-2xl mx-auto space-y-8 pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <Badge variant="secondary" className="px-4 py-1 font-black uppercase text-[10px] tracking-widest bg-muted/50 border-none rounded-xl">
                  {currentQuestion.subject}
                </Badge>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleConfidence}
                  className={cn(
                    "h-9 rounded-xl gap-2 transition-all active:scale-95 border-2",
                    confidentAnswers[currentQuestion.id] 
                      ? "bg-emerald-500 border-emerald-600 text-white shadow-lg" 
                      : "bg-background border-border text-muted-foreground"
                  )}
                >
                  {confidentAnswers[currentQuestion.id] ? <ShieldCheck className="w-4 h-4 fill-current" /> : <ShieldAlert className="w-4 h-4" />}
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {confidentAnswers[currentQuestion.id] ? "Confident" : "Skill Bonus"}
                  </span>
                </Button>
              </div>

              <h2 className="text-xl md:text-3xl font-black leading-tight text-foreground tracking-tight px-1">
                {currentQuestion.text}
              </h2>

              <RadioGroup 
                value={answers[currentQuestion.id] || ""} 
                onValueChange={handleAnswer} 
                className="grid grid-cols-1 gap-4"
              >
                {currentQuestion.options.map((opt, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Label 
                      className={cn(
                        "flex items-center p-5 rounded-[2rem] border-2 cursor-pointer transition-all active:scale-[0.98] group relative overflow-hidden",
                        answers[currentQuestion.id] === opt 
                          ? "border-primary bg-primary/5 ring-4 ring-primary/5 shadow-md" 
                          : "border-border bg-card hover:bg-muted/5"
                      )}
                    >
                      <RadioGroupItem value={opt} className="sr-only" />
                      <div className={cn(
                        "w-10 h-10 rounded-2xl border-2 flex items-center justify-center mr-4 font-black text-sm transition-all shrink-0",
                        answers[currentQuestion.id] === opt 
                          ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg" 
                          : "border-border bg-muted/30 text-muted-foreground"
                      )}>
                        {String.fromCharCode(65+i)}
                      </div>
                      <span className="text-base md:text-lg font-bold text-foreground leading-snug flex-1 pr-4">{opt}</span>
                      
                      {answers[currentQuestion.id] === opt && (
                        <motion.div 
                          layoutId="active-check"
                          className="absolute right-6"
                        >
                          <Sparkles className="w-5 h-5 text-primary animate-sparkle" />
                        </motion.div>
                      )}
                    </Label>
                  </motion.div>
                ))}
              </RadioGroup>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Simplified Immersive Footer */}
      <footer className="shrink-0 border-t bg-card/95 backdrop-blur-xl px-6 pb-safe z-50">
        <div className="h-24 flex items-center justify-between w-full max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            disabled={currentIdx === 0}
            className="rounded-2xl px-6 h-14 font-black text-[11px] uppercase tracking-widest hover:bg-muted active:scale-95 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Previous
          </Button>

          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
              >
                <Button 
                  variant="default" 
                  onClick={() => setShowSubmitConfirm(true)}
                  className="rounded-[1.75rem] px-10 h-16 font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/40 bg-primary text-primary-foreground animate-focus-glow"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Finish Simulation
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={cn("flex flex-col items-end", isComplete && "hidden sm:flex")}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Status</p>
            <span className="text-sm font-black text-foreground">{answeredCount}/{questions.length} Solved</span>
          </div>
        </div>
      </footer>

      {/* Confirmations */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-[3rem] bg-card border-none shadow-2xl p-10 max-w-sm z-[2100] outline-none">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
              <Zap className="w-10 h-10 text-primary fill-current" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-black tracking-tight">Sync Simulation?</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">
                All {questions.length} items calibrated.
              </DialogDescription>
            </div>
            <div className="grid gap-3 pt-2">
              <Button onClick={handleSubmit} className="h-16 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/30 active:scale-95 transition-all bg-primary text-primary-foreground">
                Commit Results
              </Button>
              <Button variant="ghost" onClick={() => setShowSubmitConfirm(false)} className="h-12 rounded-xl font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                Continue Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="rounded-[3rem] bg-card border-none shadow-2xl p-10 max-w-sm z-[2100] outline-none">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-rose-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-rose-600" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-black tracking-tight">Abort Simulation?</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">
                Progress trace will be lost.
              </DialogDescription>
            </div>
            <div className="grid gap-3 pt-2">
              <Button variant="destructive" onClick={() => window.location.reload()} className="h-16 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">
                Exit to Hub
              </Button>
              <Button variant="ghost" onClick={() => setShowExitConfirm(false)} className="h-12 rounded-xl font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                Stay in Simulation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
