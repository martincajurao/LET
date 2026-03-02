'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  BrainCircuit,
  CheckCircle2
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

  const isContinuous = useMemo(() => questions.length <= 10, [questions]);

  useEffect(() => {
    document.body.classList.add('immersive-mode');
    return () => {
      document.body.classList.remove('immersive-mode');
    };
  }, []);

  const phases = useMemo(() => {
    if (isContinuous) {
      return [{ name: 'Quick Fire', questions, startIndex: 0 }];
    }

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
  }, [questions, isContinuous]);

  const currentPhaseIndex = useMemo(() => {
    return phases.findIndex(p => 
      currentIdx >= p.startIndex && currentIdx < p.startIndex + p.questions.length
    );
  }, [phases, currentIdx]);

  const handleContinue = useCallback(() => {
    setIsResting(false);
    setCurrentIdx(prev => prev + 1);
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
    if (isResting) return;
    
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
    
    const phase = phases[currentPhaseIndex];
    const isEndOfPhase = currentIdx === phase.startIndex + phase.questions.length - 1;
    const isLastQuestionTotal = currentIdx === questions.length - 1;

    if (isLastQuestionTotal) return;

    autoAdvanceTimer.current = setTimeout(() => {
      if (isEndOfPhase && !isContinuous) {
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
    <div className="fixed inset-0 z-[2000] bg-background flex flex-col overflow-hidden animate-in fade-in duration-300 font-body pointer-events-auto">
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
              "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all",
              timeLeft < 60 ? "bg-rose-500/10 border-rose-500 text-rose-600 animate-pulse" : "bg-muted border-border/50 text-muted-foreground"
            )}>
              <Timer className="w-3.5 h-3.5" />
              <span className="text-xs font-black font-mono tracking-tighter">{formatTime(timeLeft)}</span>
            </div>
          </div>

          <div className="flex flex-col items-center flex-1 mx-4 max-w-[140px]">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 mb-1">Items: {currentIdx + 1}/{questions.length}</span>
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
                "h-8 rounded-lg gap-1.5 transition-all border px-2",
                confidentAnswers[currentQuestion.id] 
                  ? "bg-emerald-500 border-emerald-600 text-white" 
                  : "bg-background border-border text-muted-foreground"
              )}
            >
              {confidentAnswers[currentQuestion.id] ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
              <span className="text-[8px] font-black uppercase tracking-tighter">
                {confidentAnswers[currentQuestion.id] ? "Fixed" : "Calib"}
              </span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 md:p-12 no-scrollbar bg-background relative">
        <div className="max-w-xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {isResting ? (
              <motion.div
                key="rest-phase"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.05, opacity: 0 }}
                className="flex flex-col items-center justify-center space-y-6 pt-2 pb-10"
              >
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 bg-primary/10 rounded-[1.25rem] flex items-center justify-center mx-auto border-4 border-primary/20 shadow-xl animate-levitate">
                    <Coffee className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-foreground">Phase Calibration</h2>
                    <p className="text-muted-foreground font-medium text-[10px] uppercase tracking-widest">A professional breather before the next track.</p>
                  </div>
                </div>

                <div className="w-full space-y-2.5 px-2">
                  <div className="flex items-center gap-2 mb-1 px-2">
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-primary/20 text-primary">Simulation Roadmap</Badge>
                  </div>
                  {phases.map((p, idx) => {
                    const isCompleted = idx < currentPhaseIndex + 1;
                    const isNext = idx === currentPhaseIndex + 1;
                    
                    return (
                      <div 
                        key={idx} 
                        onClick={() => isNext && handleContinue()}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-500",
                          isCompleted ? "bg-emerald-500/5 border-emerald-500/20" : 
                          isNext ? "bg-primary/5 border-primary shadow-lg scale-[1.02] ring-4 ring-primary/5 cursor-pointer active:scale-95" : 
                          "bg-muted/20 border-transparent opacity-40"
                        )}
                      >
                        <div className="flex items-center gap-4 pointer-events-none">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all",
                            isCompleted ? "bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20" : 
                            isNext ? "bg-primary border-primary text-primary-foreground shadow-primary/20 animate-pulse" : 
                            "bg-muted border-border text-muted-foreground"
                          )}>
                            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                          </div>
                          <div>
                            <span className={cn(
                              "font-black text-sm uppercase tracking-tight block leading-none",
                              isNext ? "text-primary" : "text-foreground"
                            )}>{p.name}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                              {isCompleted ? "Calibration Secure" : isNext ? "Tap to Launch Trace" : "Encrypted Track"}
                            </span>
                          </div>
                        </div>
                        {isNext && <Badge className="bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-tighter rounded-lg h-5 px-2 pointer-events-none">Up Next</Badge>}
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex flex-col items-center gap-1 p-5 bg-card rounded-[2rem] border shadow-inner w-full mx-2">
                  <div className="flex items-center gap-3 text-primary">
                    <Timer className="w-5 h-5 animate-pulse" />
                    <span className="text-4xl font-black font-mono tracking-tighter tabular-nums">{formatTime(timeLeft)}</span>
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40">Global Simulation Clock</p>
                </div>

                <div className="w-full px-2 pt-1">
                  <Button 
                    onClick={handleContinue}
                    className="w-full h-16 rounded-[1.75rem] font-black text-base uppercase tracking-widest gap-3 shadow-2xl shadow-primary/30 bg-primary text-primary-foreground active:scale-95 transition-all group"
                  >
                    Continue Trace
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={currentQuestion.id}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center">
                  <Badge variant="outline" className="px-3 py-0.5 font-black uppercase text-[8px] tracking-[0.2em] border-primary/20 text-primary bg-primary/5 rounded-lg">
                    {currentQuestion.subject}
                  </Badge>
                </div>

                <h2 className="text-base md:text-lg font-black leading-snug text-foreground text-center tracking-tight px-2">
                  {currentQuestion.text}
                </h2>

                <div className="grid grid-cols-1 gap-2 pt-1">
                  {currentQuestion.options.map((opt, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <button 
                        onClick={() => handleAnswer(opt)}
                        className={cn(
                          "w-full flex items-center p-3 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98] group relative overflow-hidden text-left",
                          selectedOption === opt 
                            ? "border-primary bg-primary/5 ring-2 ring-primary/5 shadow-md" 
                            : "border-border/60 bg-card hover:bg-muted/10 shadow-sm"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-xl border-2 flex items-center justify-center mr-3 font-black text-[10px] transition-all shrink-0 pointer-events-none",
                          selectedOption === opt 
                            ? "bg-primary border-primary text-primary-foreground" 
                            : "border-border/50 bg-muted/20 text-muted-foreground"
                        )}>
                          {String.fromCharCode(65+i)}
                        </div>
                        <span className="text-sm font-bold text-foreground leading-tight flex-1 pr-4 pointer-events-none">{opt}</span>
                        
                        {selectedOption === opt && (
                          <Sparkles className="w-3.5 h-3.5 text-primary animate-sparkle absolute right-3 pointer-events-none" />
                        )}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="shrink-0 border-t bg-card/95 backdrop-blur-xl px-4 pb-safe z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="h-14 flex items-center justify-between w-full max-xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            disabled={currentIdx === 0 || isResting}
            className="rounded-xl px-4 h-9 font-black text-[9px] uppercase tracking-widest hover:bg-muted active:scale-90 disabled:opacity-20 transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
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
                  className="rounded-xl px-6 h-10 font-black text-[9px] uppercase tracking-widest shadow-lg bg-primary text-primary-foreground active:scale-95"
                >
                  <Send className="w-3 h-3 mr-2" />
                  Commit
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {!isComplete && !isResting && (
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-foreground tabular-nums">{answeredCount}/{questions.length} Solved</span>
              <p className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">Progress</p>
            </div>
          )}
        </div>
      </footer>

      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-[2rem] bg-card border-none shadow-2xl p-6 max-w-xs z-[2100] outline-none">
          <div className="text-center space-y-5">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto border-2 border-primary/20 shadow-lg">
              <Zap className="w-7 h-7 text-primary fill-current" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black tracking-tight">Sync Simulation?</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold text-[8px] uppercase tracking-widest leading-relaxed">
                Calibration complete. <br />Commit trace to professional vault?
              </DialogDescription>
            </div>
            <div className="grid gap-2 pt-1">
              <Button onClick={handleSubmit} className="h-12 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg bg-primary text-primary-foreground active:scale-95 transition-all">
                Commit to Vault
              </Button>
              <Button variant="ghost" onClick={() => setShowSubmitConfirm(false)} className="h-9 rounded-xl font-bold text-[9px] uppercase tracking-widest text-muted-foreground">
                Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-6 max-w-xs z-[2100] outline-none">
          <div className="text-center space-y-5">
            <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto border-2 border-rose-500/20 shadow-lg">
              <AlertTriangle className="w-7 h-7 text-rose-600" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black tracking-tight text-rose-600">Abort Trace?</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold text-[8px] uppercase tracking-widest leading-relaxed">
                Active pedagogical data <br />will be purged immediately.
              </DialogDescription>
            </div>
            <div className="grid gap-2 pt-1">
              <Button variant="destructive" onClick={() => window.location.reload()} className="h-12 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                Terminate
              </Button>
              <Button variant="ghost" onClick={() => setShowExitConfirm(false)} className="h-9 rounded-xl font-bold text-[9px] uppercase tracking-widest text-muted-foreground">
                Stay
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}