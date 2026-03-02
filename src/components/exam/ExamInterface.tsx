'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  // Apply immersive mode class to body to hide layout navbars
  useEffect(() => {
    document.body.classList.add('immersive-mode');
    return () => {
      document.body.classList.remove('immersive-mode');
    };
  }, []);

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

  useEffect(() => {
    setSelectedOption(answers[questions[currentIdx]?.id] || null);
  }, [currentIdx, answers, questions]);

  const handleAnswer = (val: string) => {
    const currentQ = questions[currentIdx];
    const isCorrect = val === currentQ.correctAnswer;

    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
    setSelectedOption(val);
    
    if (isCorrect) {
      setCorrectStreak(prev => prev + 1);
    } else {
      setCorrectStreak(0);
    }

    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    
    if (currentIdx < questions.length - 1) {
      autoAdvanceTimer.current = setTimeout(() => {
        setCurrentIdx(prev => prev + 1);
      }, 450);
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
    <div className="fixed inset-0 z-[2000] bg-background flex flex-col overflow-hidden animate-in fade-in duration-300 font-body">
      <header className="pt-safe border-b bg-card shrink-0 shadow-sm relative z-10">
        <div className="h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowExitConfirm(true)}
              className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="h-8 w-[1px] bg-border mx-1" />
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-all shadow-sm",
              timeLeft < 60 ? "bg-rose-500/10 border-rose-500 text-rose-600 animate-pulse" : "bg-primary/5 border-primary/20 text-primary"
            )}>
              <Timer className="w-4 h-4" />
              <span className="text-sm font-black font-mono tracking-tighter">{formatTime(timeLeft)}</span>
            </div>
          </div>

          <div className="flex flex-col items-center flex-1 mx-4 max-w-xs">
            <div className="flex justify-between w-full mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Quest {currentIdx + 1}/{questions.length}</span>
              <span className="text-[10px] font-black text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5 rounded-full shadow-inner" />
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence>
              {correctStreak >= 3 && (
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0, x: 20 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-orange-500 text-white rounded-full shadow-lg"
                >
                  <Flame className="w-3.5 h-3.5 fill-current animate-bounce" />
                  <span className="text-[10px] font-black uppercase">{correctStreak} Streak</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-10 md:p-12 no-scrollbar bg-background">
        <div className="max-w-2xl mx-auto space-y-8 pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center px-1">
                <Badge variant="secondary" className="px-4 py-1.5 font-black uppercase text-[10px] tracking-[0.2em] bg-muted/50 border-none rounded-xl">
                  {currentQuestion.subject}
                </Badge>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleConfidence}
                  className={cn(
                    "h-10 rounded-2xl gap-2 transition-all active:scale-95 border-2",
                    confidentAnswers[currentQuestion.id] 
                      ? "bg-emerald-500 border-emerald-600 text-white shadow-lg" 
                      : "bg-card border-border text-muted-foreground"
                  )}
                >
                  {confidentAnswers[currentQuestion.id] ? <ShieldCheck className="w-4 h-4 fill-current" /> : <ShieldAlert className="w-4 h-4" />}
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {confidentAnswers[currentQuestion.id] ? "Confident" : "Skill Mode"}
                  </span>
                </Button>
              </div>

              <h2 className="text-2xl md:text-4xl font-black leading-tight text-foreground tracking-tight px-1">
                {currentQuestion.text}
              </h2>

              <RadioGroup 
                value={selectedOption || ""} 
                onValueChange={handleAnswer} 
                className="grid grid-cols-1 gap-4"
              >
                {currentQuestion.options.map((opt, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 + 0.1 }}
                  >
                    <Label 
                      className={cn(
                        "flex items-center p-6 rounded-[2.25rem] border-2 cursor-pointer transition-all active:scale-[0.97] group relative overflow-hidden",
                        selectedOption === opt 
                          ? "border-primary bg-primary/5 ring-8 ring-primary/5 shadow-xl" 
                          : "border-border bg-card hover:bg-muted/10 shadow-sm"
                      )}
                    >
                      <RadioGroupItem value={opt} className="sr-only" />
                      <div className={cn(
                        "w-12 h-12 rounded-2xl border-2 flex items-center justify-center mr-5 font-black text-base transition-all shrink-0",
                        selectedOption === opt 
                          ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg" 
                          : "border-border bg-muted/30 text-muted-foreground"
                      )}>
                        {String.fromCharCode(65+i)}
                      </div>
                      <span className="text-lg md:text-xl font-bold text-foreground leading-snug flex-1 pr-6">{opt}</span>
                      
                      {selectedOption === opt && (
                        <motion.div 
                          layoutId="active-check"
                          className="absolute right-8"
                        >
                          <Sparkles className="w-6 h-6 text-primary animate-sparkle" />
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

      <footer className="shrink-0 border-t bg-card/95 backdrop-blur-2xl px-6 pb-safe z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="h-24 flex items-center justify-between w-full max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            disabled={currentIdx === 0}
            className="rounded-2xl px-8 h-14 font-black text-[11px] uppercase tracking-widest hover:bg-muted active:scale-95 disabled:opacity-20 transition-all"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Previous
          </Button>

          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ y: 20, scale: 0.9, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
              >
                <Button 
                  variant="default" 
                  onClick={() => setShowSubmitConfirm(true)}
                  className="rounded-[2rem] px-12 h-16 font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/40 bg-primary text-primary-foreground animate-breathing-primary active:scale-95"
                >
                  <Send className="w-5 h-5 mr-3" />
                  Finish Trace
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={cn("flex flex-col items-end", isComplete && "hidden sm:flex")}>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Progress</p>
            <span className="text-base font-black text-foreground tabular-nums">{answeredCount}/{questions.length} Solved</span>
          </div>
        </div>
      </footer>

      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-[3rem] bg-card border-none shadow-2xl p-10 max-w-sm z-[2100] outline-none">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 border-2 border-primary/20 shadow-xl">
              <Zap className="w-10 h-10 text-primary fill-current" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-3xl font-black tracking-tighter">Sync Simulation?</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest leading-relaxed">
                All professional items calibrated. <br />Finalize your pedagogical trace now.
              </DialogDescription>
            </div>
            <div className="grid gap-3 pt-2">
              <Button onClick={handleSubmit} className="h-16 rounded-[1.75rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/30 active:scale-95 transition-all bg-primary text-primary-foreground">
                Commit to Vault
              </Button>
              <Button variant="ghost" onClick={() => setShowSubmitConfirm(false)} className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                Review Items
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="rounded-[3rem] bg-card border-none shadow-2xl p-10 max-w-sm z-[2100] outline-none">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 border-2 border-rose-500/20 shadow-xl">
              <AlertTriangle className="w-10 h-10 text-rose-600" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-3xl font-black tracking-tighter">Abort Simulation?</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest leading-relaxed">
                Active progress trace will be purged. <br />This cannot be recovered.
              </DialogDescription>
            </div>
            <div className="grid gap-3 pt-2">
              <Button variant="destructive" onClick={() => window.location.reload()} className="h-16 rounded-[1.75rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 active:scale-95 transition-all">
                Terminate Trace
              </Button>
              <Button variant="ghost" onClick={() => setShowExitConfirm(false)} className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                Stay in Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}