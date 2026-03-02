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
  Bookmark,
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
  CheckCircle2,
  Info,
  ChevronRight
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
  const [showBriefing, setShowBriefing] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confidentAnswers, setConfidentAnswers] = useState<Record<string, boolean>>({});
  const [flaggedIndices, setFlaggedIndices] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(questions.length * timePerQuestion);
  const [startTime, setStartTime] = useState(Date.now());
  const [correctStreak, setCorrectStreak] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [comboPop, setComboPop] = useState(false);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    document.body.classList.add('immersive-mode');
    return () => {
      document.body.classList.remove('immersive-mode');
    };
  }, []);

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

  const isContinuous = useMemo(() => phases.length <= 1 || questions.length <= 10, [phases, questions.length]);

  const currentPhaseIndex = useMemo(() => {
    return phases.findIndex(p => 
      currentIdx >= p.startIndex && currentIdx < p.startIndex + p.questions.length
    );
  }, [phases, currentIdx]);

  const handleStartExam = () => {
    setShowBriefing(false);
    setStartTime(Date.now());
  };

  const moveToNext = useCallback((currentAnswers: Record<string, string>) => {
    const phase = phases[currentPhaseIndex];
    if (!phase) return;

    const phaseEndIndex = phase.startIndex + phase.questions.length - 1;
    let nextIdx = -1;

    // 1. Try to find the next sequential unanswered question in the current phase
    for (let i = currentIdx + 1; i <= phaseEndIndex; i++) {
      if (!currentAnswers[questions[i].id]) {
        nextIdx = i;
        break;
      }
    }

    // 2. If sequential end reached, return to any previously flagged items in this phase
    if (nextIdx === -1) {
      for (let i = phase.startIndex; i <= phaseEndIndex; i++) {
        if (!currentAnswers[questions[i].id]) {
          nextIdx = i;
          break;
        }
      }
    }

    // 3. Phase Completion Logic
    if (nextIdx === -1) {
      if (currentPhaseIndex === phases.length - 1 || isContinuous) {
        // End of entire simulation or continuous mode
        if (Object.keys(currentAnswers).length === questions.length) {
          setShowSubmitConfirm(true);
        }
      } else {
        // Pedagogical sector resolved -> Show Calibration Screen
        setIsResting(true);
      }
    } else {
      setSelectedOption(null);
      setCurrentIdx(nextIdx);
    }
  }, [currentIdx, phases, currentPhaseIndex, questions, isContinuous]);

  const handleAnswer = (val: string) => {
    if (isResting) return;
    
    const currentQ = questions[currentIdx];
    const isCorrect = val === currentQ.correctAnswer;

    const newAnswers = { ...answers, [currentQ.id]: val };
    setAnswers(newAnswers);
    setSelectedOption(val);
    
    // Clear flag if answered
    if (flaggedIndices.has(currentIdx)) {
      const nextFlags = new Set(flaggedIndices);
      nextFlags.delete(currentIdx);
      setFlaggedIndices(nextFlags);
    }

    if (isCorrect) {
      setCorrectStreak(prev => prev + 1);
      setComboPop(true);
      setTimeout(() => setComboPop(false), 1000);
    } else {
      setCorrectStreak(0);
    }

    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      moveToNext(newAnswers);
    }, 450);
  };

  const handleFlag = () => {
    if (isResting || answers[questions[currentIdx].id]) return;
    setFlaggedIndices(prev => new Set(prev).add(currentIdx));
    moveToNext(answers);
  };

  const toggleConfidence = () => {
    const currentQ = questions[currentIdx];
    setConfidentAnswers(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  };

  const handleContinuePhase = () => {
    const nextPhase = phases[currentPhaseIndex + 1];
    if (nextPhase) {
      setIsResting(false);
      setSelectedOption(null);
      setCurrentIdx(nextPhase.startIndex);
    }
  };

  const handleSubmit = useCallback(() => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    onComplete(answers, timeSpent, confidentAnswers);
  }, [answers, startTime, confidentAnswers, onComplete]);

  useEffect(() => {
    if (showBriefing || isResting) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit, showBriefing, isResting]);

  useEffect(() => {
    setSelectedOption(answers[questions[currentIdx]?.id] || null);
  }, [currentIdx, answers, questions]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  if (!currentQuestion) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-background flex flex-col overflow-hidden animate-in fade-in duration-300 font-body">
      {/* Immersive Header */}
      <header className="pt-safe border-b bg-card shrink-0 shadow-sm relative z-10">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowExitConfirm(true)}
              className="rounded-full h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            {!showBriefing && (
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all",
                timeLeft < 60 ? "bg-rose-500/10 border-rose-500 text-rose-600 animate-pulse" : "bg-muted border-border/50 text-muted-foreground"
              )}>
                <Timer className="w-3.5 h-3.5" />
                <span className="text-xs font-black font-mono tracking-tighter">{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center flex-1 mx-4 max-w-[140px]">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 mb-1">
              {showBriefing ? "Initialization" : `Solved: ${answeredCount}/${questions.length}`}
            </span>
            <Progress value={showBriefing ? 0 : progress} className="h-1 rounded-full bg-muted shadow-inner" />
          </div>

          <div className="flex items-center gap-2">
            {!showBriefing && !isResting && (
              <>
                <AnimatePresence>
                  {correctStreak >= 3 && (
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0, x: 20 }}
                      animate={{ scale: 1, opacity: 1, x: 0 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-lg ring-2 ring-white/20"
                    >
                      <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">{correctStreak} COMBO</span>
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
                      ? "bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                      : "bg-background border-border text-muted-foreground"
                  )}
                >
                  {confidentAnswers[currentQuestion.id] ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                  <span className="text-[8px] font-black uppercase tracking-tighter">
                    {confidentAnswers[currentQuestion.id] ? "Fixed" : "Calib"}
                  </span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 py-4 md:p-12 no-scrollbar bg-background relative">
        <div className="max-w-xl mx-auto w-full h-full flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {showBriefing ? (
              <motion.div
                key="briefing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col w-full space-y-6"
              >
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto border-2 border-primary/20 shadow-xl">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-foreground">Simulation Briefing</h2>
                    <p className="text-muted-foreground font-medium text-[10px] uppercase tracking-widest">Strategy Guard Parameters</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-5 bg-card rounded-[2rem] border-2 border-border/50 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Bookmark className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-black leading-none">Flag & Return Logic</p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-tight">Intra-Phase Review Queue</p>
                      </div>
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                      Challenging items can be <span className="text-foreground font-black">Flagged</span> to be answered at the end of the phase. All sector items must be resolved before calibration.
                    </p>
                  </div>

                  <div className="p-5 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/50">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0"><Info className="w-4 h-4 text-primary" /></div>
                      <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                        <span className="text-foreground font-black">Anti-Abuse Lock:</span> Sequential back-navigation is disabled. Focus on your first-trace accuracy to maximize Rank multipliers.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={handleStartExam}
                    className="w-full h-16 rounded-[1.75rem] font-black text-lg uppercase tracking-widest gap-3 shadow-2xl shadow-primary/30 active:scale-95 transition-all"
                  >
                    Initialize Trace
                    <ArrowRight className="w-6 h-6" />
                  </Button>
                </div>
              </motion.div>
            ) : isResting ? (
              <motion.div 
                key="calibration"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="w-full max-w-[440px] bg-card rounded-[3.5rem] shadow-2xl border border-border/50 overflow-hidden flex flex-col"
              >
                <div className="bg-primary/10 p-12 flex flex-col items-center justify-center relative overflow-hidden">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    className="w-20 h-20 bg-card rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10 border-2 border-primary/20 animate-levitate"
                  >
                    <Coffee className="w-10 h-10 text-primary" />
                  </motion.div>
                  <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent z-0" />
                </div>
                
                <div className="p-10 text-center space-y-8">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Phase Calibration</span>
                    <h3 className="text-3xl font-black tracking-tighter text-foreground leading-none">Sector Resolved</h3>
                    <p className="text-muted-foreground font-medium text-sm leading-relaxed px-4 pt-2">
                      Recalibrate your strategy. Next deployment zone is ready for synchronization.
                    </p>
                  </div>

                  <div className="w-full space-y-3">
                    {phases.map((p, idx) => {
                      const isCompleted = idx <= currentPhaseIndex;
                      const isNext = idx === currentPhaseIndex + 1;
                      return (
                        <div key={idx} className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                          isCompleted ? "bg-emerald-500/5 border-emerald-500/20" : 
                          isNext ? "bg-primary/5 border-primary shadow-lg ring-4 ring-primary/5 scale-[1.02]" : 
                          "bg-muted/20 border-transparent opacity-40"
                        )}>
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs border-2",
                              isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : 
                              isNext ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border text-muted-foreground"
                            )}>{isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}</div>
                            <span className={cn("font-black text-xs uppercase tracking-tight", isNext ? "text-primary" : "text-foreground")}>{p.name}</span>
                          </div>
                          {isNext && <Badge className="bg-primary text-primary-foreground text-[7px] font-black uppercase rounded-lg">Up Next</Badge>}
                        </div>
                      );
                    })}
                  </div>

                  <Button 
                    onClick={handleContinuePhase}
                    className="w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest gap-3 shadow-2xl shadow-primary/30 active:scale-95 transition-all group"
                  >
                    Deploy to Sector {currentPhaseIndex + 2}
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
                className="space-y-6 w-full"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="w-fit px-3 py-0.5 font-black uppercase text-[8px] tracking-[0.2em] border-primary/20 text-primary bg-primary/5 rounded-lg">
                    Sector {currentPhaseIndex + 1}: {currentQuestion.subject}
                  </Badge>
                  <AnimatePresence>
                    {comboPop && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.5 }}
                        animate={{ opacity: 1, y: -20, scale: 1.2 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        className="text-emerald-500 font-black text-xs uppercase italic tracking-tighter"
                      >
                        Perfect Trace!
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <h2 className="text-lg md:text-xl font-black leading-snug text-foreground text-center tracking-tight px-2">
                  {currentQuestion.text}
                </h2>

                <div className="grid grid-cols-1 gap-2.5 pt-2">
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
                          "w-full flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98] group relative overflow-hidden text-left",
                          selectedOption === opt 
                            ? "border-primary bg-primary/5 ring-4 ring-primary/5 shadow-md" 
                            : "border-border/60 bg-card hover:bg-muted/10 shadow-sm"
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-xl border-2 flex items-center justify-center mr-4 font-black text-xs transition-all shrink-0",
                          selectedOption === opt 
                            ? "bg-primary border-primary text-primary-foreground shadow-lg" 
                            : "border-border/50 bg-muted/20 text-muted-foreground"
                        )}>
                          {String.fromCharCode(65+i)}
                        </div>
                        <span className="text-sm font-bold text-foreground leading-tight flex-1 pr-4">{opt}</span>
                        
                        {selectedOption === opt && (
                          <div className="absolute right-4">
                            <Sparkles className="w-4 h-4 text-primary animate-sparkle" />
                          </div>
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

      {/* Persistent Footer */}
      <footer className="shrink-0 border-t bg-card/95 backdrop-blur-xl px-4 pb-safe z-50">
        <div className="h-14 flex items-center justify-between w-full max-xl mx-auto">
          {!showBriefing && !isResting && (
            <>
              <Button 
                variant="ghost" 
                onClick={handleFlag} 
                disabled={!!answers[currentQuestion.id]}
                className="rounded-xl px-4 h-9 font-black text-[9px] uppercase tracking-widest hover:bg-muted active:scale-90 disabled:opacity-20 transition-all gap-2"
              >
                <Bookmark className={cn("w-3.5 h-3.5", flaggedIndices.has(currentIdx) && "fill-current text-orange-500")} />
                Flag Later
              </Button>

              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-foreground tabular-nums">{answeredCount}/{questions.length} Solved</span>
                <p className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">Overall Trace</p>
              </div>
            </>
          )}
          {isResting && (
            <div className="flex-1 flex items-center justify-center text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40">
              Calibration Protocol Active
            </div>
          )}
        </div>
      </footer>

      {/* Final Submission Confirmation */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-[2rem] bg-card border-none shadow-2xl p-6 max-w-xs z-[5100] outline-none">
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

      {/* Exit Confirmation */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-6 max-w-xs z-[5100] outline-none">
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
