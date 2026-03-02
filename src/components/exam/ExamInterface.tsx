'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  AlertTriangle,
  Coffee,
  ArrowRight,
  BrainCircuit
} from "lucide-react";
import { Question } from "@/app/lib/mock-data";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ExamInterfaceProps {
  questions: Question[];
  timePerQuestion?: number;
  onComplete: (answers: Record<string, string>, timeSpent: number, confidentAnswers: Record<string, boolean>) => void;
}

type Phase = {
  name: string;
  questions: Question[];
  startIndex: number;
};

export function ExamInterface({ questions, timePerQuestion = 60, onComplete }: ExamInterfaceProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confidentAnswers, setConfidentAnswers] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(questions.length * timePerQuestion);
  const [startTime] = useState(Date.now());
  const [correctStreak, setCorrectStreak] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  // Apply immersive mode class to body to hide layout navbars
  useEffect(() => {
    document.body.classList.add('immersive-mode');
    return () => {
      document.body.classList.remove('immersive-mode');
    };
  }, []);

  // Group questions into phases based on Subject
  const phases = useMemo(() => {
    const p: Phase[] = [];
    let currentPhase: Phase | null = null;

    questions.forEach((q, idx) => {
      if (!currentPhase || currentPhase.name !== q.subject) {
        currentPhase = { name: q.subject, questions: [], startIndex: idx };
        p.push(currentPhase);
      }
      currentPhase.questions.push(q);
    });
    return p;
  }, [questions]);

  const currentPhaseIndex = useMemo(() => {
    return phases.findIndex(p => 
      currentIdx >= p.startIndex && currentIdx < p.startIndex + p.questions.length
    );
  }, [phases, currentIdx]);

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
    
    // Check if this is the end of a phase
    const phase = phases[currentPhaseIndex];
    const isEndOfPhase = currentIdx === phase.startIndex + phase.questions.length - 1;
    const isLastQuestionTotal = currentIdx === questions.length - 1;

    if (isLastQuestionTotal) {
      // Don't auto-advance on the very last question of the exam
      return;
    }

    autoAdvanceTimer.current = setTimeout(() => {
      if (isEndOfPhase) {
        setIsResting(true);
      } else {
        setCurrentIdx(prev => prev + 1);
      }
    }, 450);
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
      {/* Immersive Header */}
      <header className="pt-safe border-b bg-card shrink-0 shadow-sm relative z-10">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowExitConfirm(true)}
              className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
            >
              <X className="w-4 h-4" />
            </Button>
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all",
              timeLeft < 60 ? "bg-rose-500/10 border-rose-500 text-rose-600 animate-pulse" : "bg-muted border-border/50 text-muted-foreground"
            )}>
              <Timer className="w-3.5 h-3.5" />
              <span className="text-xs font-black font-mono tracking-tighter">{formatTime(timeLeft)}</span>
            </div>
          </div>

          <div className="flex flex-col items-center flex-1 mx-4 max-w-[140px]">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 mb-1">Total: {currentIdx + 1}/{questions.length}</span>
            <Progress value={progress} className="h-1 rounded-full bg-muted shadow-inner" />
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence>
              {correctStreak >= 3 && (
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0, x: 20 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white rounded-full shadow-lg"
                >
                  <Flame className="w-3 h-3 fill-current" />
                  <span className="text-[8px] font-black uppercase">{correctStreak}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleConfidence}
              className={cn(
                "h-8 rounded-lg gap-1.5 transition-all border",
                confidentAnswers[currentQuestion.id] 
                  ? "bg-emerald-500 border-emerald-600 text-white" 
                  : "bg-background border-border text-muted-foreground"
              )}
            >
              {confidentAnswers[currentQuestion.id] ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
              <span className="text-[8px] font-black uppercase tracking-tighter">
                {confidentAnswers[currentQuestion.id] ? "Fixed" : "Calibration"}
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:p-12 no-scrollbar bg-background relative">
        <div className="max-w-xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {isResting ? (
              <motion.div
                key="rest-phase"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.05, opacity: 0 }}
                className="flex flex-col items-center justify-center text-center space-y-8 pt-10"
              >
                <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center border-4 border-primary/20 shadow-xl animate-levitate">
                  <Coffee className="w-12 h-12 text-primary" />
                </div>
                <div className="space-y-2">
                  <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase px-4 py-1 mb-2">Phase Complete</Badge>
                  <h2 className="text-3xl font-black tracking-tight text-foreground">{phases[currentPhaseIndex]?.name} Secure</h2>
                  <p className="text-muted-foreground font-medium text-sm max-w-xs mx-auto">Items calibrated. Take a professional breather before the next pedagogical track.</p>
                </div>
                
                <div className="w-full grid gap-3 pt-4">
                  <Button 
                    onClick={() => {
                      setIsResting(false);
                      setCurrentIdx(prev => prev + 1);
                    }}
                    className="h-16 rounded-[1.75rem] font-black text-base uppercase tracking-widest gap-3 shadow-2xl shadow-primary/30 bg-primary text-primary-foreground active:scale-95 transition-all"
                  >
                    Continue to {phases[currentPhaseIndex + 1]?.name || 'Next Phase'}
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Simulation paused • Timer running</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={currentQuestion.id}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
              >
                <div className="flex items-center justify-center">
                  <Badge variant="outline" className="px-3 py-0.5 font-black uppercase text-[9px] tracking-[0.2em] border-primary/20 text-primary bg-primary/5 rounded-lg">
                    {currentQuestion.subject}
                  </Badge>
                </div>

                <h2 className="text-lg md:text-xl font-black leading-tight text-foreground text-center tracking-tight px-2">
                  {currentQuestion.text}
                </h2>

                <RadioGroup 
                  value={selectedOption || ""} 
                  onValueChange={handleAnswer} 
                  className="grid grid-cols-1 gap-2.5 pt-2"
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
                          "flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98] group relative overflow-hidden",
                          selectedOption === opt 
                            ? "border-primary bg-primary/5 ring-4 ring-primary/5 shadow-md" 
                            : "border-border/60 bg-card hover:bg-muted/10 shadow-sm"
                        )}
                      >
                        <RadioGroupItem value={opt} className="sr-only" />
                        <div className={cn(
                          "w-9 h-9 rounded-xl border-2 flex items-center justify-center mr-4 font-black text-xs transition-all shrink-0",
                          selectedOption === opt 
                            ? "bg-primary border-primary text-primary-foreground" 
                            : "border-border/50 bg-muted/20 text-muted-foreground"
                        )}>
                          {String.fromCharCode(65+i)}
                        </div>
                        <span className="text-sm font-bold text-foreground leading-tight flex-1 pr-4">{opt}</span>
                        
                        {selectedOption === opt && (
                          <Sparkles className="w-4 h-4 text-primary animate-sparkle absolute right-4" />
                        )}
                      </Label>
                    </motion.div>
                  ))}
                </RadioGroup>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="shrink-0 border-t bg-card/95 backdrop-blur-xl px-4 pb-safe z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="h-16 flex items-center justify-between w-full max-w-xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            disabled={currentIdx === 0 || isResting}
            className="rounded-xl px-4 h-10 font-black text-[10px] uppercase tracking-widest hover:bg-muted active:scale-90 disabled:opacity-20 transition-all"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Prev
          </Button>

          <AnimatePresence>
            {isComplete && !isResting && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
              >
                <Button 
                  onClick={() => setShowSubmitConfirm(true)}
                  className="rounded-xl px-8 h-11 font-black text-[10px] uppercase tracking-widest shadow-lg bg-primary text-primary-foreground active:scale-95"
                >
                  <Send className="w-3.5 h-3.5 mr-2" />
                  Finish Trace
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {!isComplete && !isResting && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-foreground tabular-nums">{answeredCount}/{questions.length} Solved</span>
              <p className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">Progression</p>
            </div>
          )}
        </div>
      </footer>

      {/* Confirmation Dialogs */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-8 max-w-xs z-[2100] outline-none">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto border-2 border-primary/20 shadow-lg">
              <Zap className="w-8 h-8 text-primary fill-current" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black tracking-tight">Sync Simulation?</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold text-[9px] uppercase tracking-widest leading-relaxed">
                Calibration complete. <br />Commit trace to professional vault?
              </DialogDescription>
            </div>
            <div className="grid gap-2 pt-2">
              <Button onClick={handleSubmit} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg bg-primary text-primary-foreground active:scale-95 transition-all">
                Commit to Vault
              </Button>
              <Button variant="ghost" onClick={() => setShowSubmitConfirm(false)} className="h-10 rounded-xl font-bold text-[9px] uppercase tracking-widest text-muted-foreground">
                Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-8 max-w-xs z-[2100] outline-none">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-rose-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto border-2 border-rose-500/20 shadow-lg">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black tracking-tight text-rose-600">Abort Trace?</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold text-[9px] uppercase tracking-widest leading-relaxed">
                Active pedagogical data <br />will be purged immediately.
              </DialogDescription>
            </div>
            <div className="grid gap-2 pt-2">
              <Button variant="destructive" onClick={() => window.location.reload()} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                Terminate Trace
              </Button>
              <Button variant="ghost" onClick={() => setShowExitConfirm(false)} className="h-10 rounded-xl font-bold text-[9px] uppercase tracking-widest text-muted-foreground">
                Stay in Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}