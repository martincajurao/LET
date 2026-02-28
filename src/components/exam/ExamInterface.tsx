'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
} from "@/components/ui/dialog";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  Layers, 
  Send, 
  AlertTriangle,
  Coffee,
  Play,
  CheckCircle2,
  Timer,
  LayoutGrid,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Flame,
  Sparkles
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
  const groupedPhases = useMemo(() => {
    const phases: { subject: string; items: Question[] }[] = [];
    questions.forEach(q => {
      const lastPhase = phases[phases.length - 1];
      if (lastPhase && lastPhase.subject === q.subject) {
        lastPhase.items.push(q);
      } else {
        phases.push({ subject: q.subject, items: [q] });
      }
    });
    return phases;
  }, [questions]);

  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [currentInPhaseIdx, setCurrentInPhaseIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [confidentAnswers, setConfidentAnswers] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(questions.length * (timePerQuestion || 60));
  const [startTime] = useState(Date.now());
  
  // GAME DEV ENHANCEMENT: Focus Streaks
  const [correctStreak, setCorrectStreak] = useState(0);
  const [showFocusState, setShowFocusState] = useState(false);

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showBreakScreen, setShowBreakScreen] = useState(false);
  
  const [isResting, setIsResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);

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
    let interval: NodeJS.Timeout;
    if (isResting && showBreakScreen) {
      interval = setInterval(() => {
        setRestSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, showBreakScreen]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatRestTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (val: string) => {
    const currentQ = groupedPhases[currentPhaseIdx].items[currentInPhaseIdx];
    const wasCorrectBefore = answers[currentQ.id] === currentQ.correctAnswer;
    const isCorrectNow = val === currentQ.correctAnswer;

    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
    
    // GAME DEV ENHANCEMENT: Streak Logic
    if (isCorrectNow && !wasCorrectBefore) {
      setCorrectStreak(prev => {
        const next = prev + 1;
        if (next >= 5) setShowFocusState(true);
        return next;
      });
    } else if (!isCorrectNow) {
      setCorrectStreak(0);
      setShowFocusState(false);
    }

    window.dispatchEvent(new CustomEvent('questionAnswered'));
  };

  const toggleConfidence = () => {
    const currentQ = groupedPhases[currentPhaseIdx].items[currentInPhaseIdx];
    setConfidentAnswers(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  };

  const handleNext = () => {
    const currentPhase = groupedPhases[currentPhaseIdx];
    if (currentInPhaseIdx < currentPhase.items.length - 1) {
      setCurrentInPhaseIdx(prev => prev + 1);
    } else {
      if (currentPhaseIdx < groupedPhases.length - 1) {
        setIsResting(false);
        setRestSeconds(0);
        setShowBreakScreen(true);
      } else {
        setShowSubmitConfirm(true);
      }
    }
  };

  const handleBack = () => {
    if (currentInPhaseIdx > 0) {
      setCurrentInPhaseIdx(prev => prev - 1);
    } else if (currentPhaseIdx > 0) {
      const prevPhaseIdx = currentPhaseIdx - 1;
      setCurrentPhaseIdx(prevPhaseIdx);
      setCurrentInPhaseIdx(groupedPhases[prevPhaseIdx].items.length - 1);
    }
  };

  const currentPhase = groupedPhases[currentPhaseIdx];
  const currentQuestion = currentPhase?.items[currentInPhaseIdx];
  
  const totalItemsBeforePhase = groupedPhases.slice(0, currentPhaseIdx).reduce((acc, p) => acc + p.items.length, 0);
  const overallCurrentIdx = totalItemsBeforePhase + currentInPhaseIdx;
  const progress = ((overallCurrentIdx + 1) / (questions.length || 1)) * 100;
  const answeredCount = Object.keys(answers).length;

  const getPhaseAnsweredCount = (phaseIdx: number) => {
    return groupedPhases[phaseIdx].items.filter(q => !!answers[q.id]).length;
  };

  if (!currentQuestion) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[200] bg-background flex flex-col overflow-hidden animate-in fade-in duration-300 transition-all duration-1000",
      showFocusState && "ring-[12px] ring-inset ring-primary/10 shadow-[inset_0_0_100px_rgba(var(--primary),0.1)]"
    )}>
      <header className="pt-[env(safe-area-inset-top)] border-b bg-card/90 backdrop-blur-md shrink-0 z-50">
        <div className="h-14 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all shadow-sm",
              timeLeft < 60 ? "bg-rose-500/10 border-rose-500 text-rose-600 animate-pulse" : "bg-primary/10 border-primary/20 text-primary"
            )}>
              <Timer className="w-3.5 h-3.5" />
              <span className="text-xs font-black font-mono tracking-tighter">{formatTime(timeLeft)}</span>
            </div>
            
            {/* GAME DEV: Streak Indicator */}
            {correctStreak >= 3 && (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5 px-3 py-1 bg-orange-500 text-white rounded-full shadow-lg"
              >
                <Flame className="w-3 h-3 fill-current animate-bounce" />
                <span className="text-[10px] font-black uppercase tracking-tighter">{correctStreak} Streak</span>
              </motion.div>
            )}
          </div>

          <div className="flex-1 max-w-[120px] mx-3 md:max-w-xs">
            <div className="flex justify-between mb-1">
              <span className="text-[8px] font-black uppercase text-muted-foreground opacity-60 tracking-widest">Calibration Path</span>
              <span className="text-[8px] font-black text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5 rounded-full" />
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowSubmitConfirm(true)}
            className="font-black text-[10px] uppercase tracking-[0.15em] text-primary h-9 px-3 rounded-xl hover:bg-primary/5 transition-all border border-transparent hover:border-primary/20"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Finish
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-32 relative no-scrollbar">
          <div className="max-w-xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ x: 15, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -15, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <Badge variant="secondary" className="px-3 py-1 font-black uppercase text-[9px] tracking-widest bg-muted/40 border-none rounded-lg shadow-sm">
                    {currentPhase.subject} • {currentInPhaseIdx + 1}/{currentPhase.items.length}
                  </Badge>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={toggleConfidence}
                      className={cn(
                        "h-8 rounded-xl gap-2 transition-all active:scale-95 border-2",
                        confidentAnswers[currentQuestion.id] 
                          ? "bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                          : "bg-background border-border text-muted-foreground"
                      )}
                    >
                      {confidentAnswers[currentQuestion.id] ? <ShieldCheck className="w-3.5 h-3.5 fill-current" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        {confidentAnswers[currentQuestion.id] ? "Confident" : "Skill Bonus"}
                      </span>
                    </Button>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setFlags(p => ({...p, [currentQuestion.id]: !p[currentQuestion.id]}))}
                      className={cn("h-8 px-2.5 gap-1.5 rounded-xl transition-colors border", flags[currentQuestion.id] ? "text-orange-500 bg-orange-500/10 border-orange-200" : "border-transparent text-muted-foreground")}
                    >
                      <Flag className={cn("w-3.5 h-3.5", flags[currentQuestion.id] && "fill-current")} /> 
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h2 className="text-lg md:text-2xl font-black leading-tight text-foreground tracking-tight px-1">
                    {currentQuestion.text}
                  </h2>

                  <RadioGroup 
                    value={answers[currentQuestion.id] || ""} 
                    onValueChange={handleAnswer} 
                    className="grid grid-cols-1 gap-3"
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
                            "flex items-center p-4 rounded-[1.5rem] border-2 cursor-pointer transition-all active:scale-[0.98] group relative overflow-hidden",
                            answers[currentQuestion.id] === opt 
                              ? "border-primary bg-primary/5 ring-4 ring-primary/5 shadow-md" 
                              : "border-border bg-card hover:bg-muted/5"
                          )}
                        >
                          <RadioGroupItem value={opt} className="sr-only" />
                          <div className={cn(
                            "w-9 h-9 rounded-xl border-2 flex items-center justify-center mr-4 font-black text-xs transition-all shrink-0",
                            answers[currentQuestion.id] === opt 
                              ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg" 
                              : "border-border bg-muted/30 text-muted-foreground"
                          )}>
                            {String.fromCharCode(65+i)}
                          </div>
                          <span className="text-sm md:text-base font-bold text-foreground leading-snug flex-1">{opt}</span>
                          
                          {answers[currentQuestion.id] === opt && (
                            <motion.div 
                              layoutId="active-indicator"
                              className="absolute right-4 w-2 h-2 bg-primary rounded-full"
                            />
                          )}
                        </Label>
                      </motion.div>
                    ))}
                  </RadioGroup>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <aside className="hidden lg:flex w-72 border-l bg-muted/5 flex-col overflow-hidden">
          <div className="p-6 border-b bg-card/50">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Simulation Map</h3>
              <LayoutGrid className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.3em]">{questions.length} Total Items</p>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {groupedPhases.map((phase, pIdx) => (
                <div key={pIdx} className="space-y-3">
                  <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-md py-2 z-10 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        currentPhaseIdx === pIdx ? "bg-primary animate-pulse" : currentPhaseIdx > pIdx ? "bg-emerald-500" : "bg-muted"
                      )} />
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest truncate max-w-[120px]",
                        currentPhaseIdx === pIdx ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {phase.subject}
                      </span>
                    </div>
                    <span className="text-[8px] font-black text-muted-foreground opacity-60">
                      {getPhaseAnsweredCount(pIdx)}/{phase.items.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {phase.items.map((q, i) => (
                      <button 
                        key={q.id} 
                        onClick={() => {
                          setCurrentPhaseIdx(pIdx);
                          setCurrentInPhaseIdx(i);
                        }}
                        className={cn(
                          "aspect-square rounded-lg text-[8px] font-black border transition-all flex items-center justify-center relative",
                          currentPhaseIdx === pIdx && currentInPhaseIdx === i 
                            ? "border-primary bg-primary text-primary-foreground shadow-lg scale-110 z-10" 
                            : answers[q.id] 
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" 
                              : "border-border text-muted-foreground hover:bg-muted/30",
                          flags[q.id] && ! (currentPhaseIdx === pIdx && currentInPhaseIdx === i) && "ring-1 ring-orange-500 ring-offset-1",
                          confidentAnswers[q.id] && "ring-1 ring-emerald-500 ring-offset-1"
                        )}
                      >
                        {i + 1}
                        {confidentAnswers[q.id] && ! (currentPhaseIdx === pIdx && currentInPhaseIdx === i) && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-card/50 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Answered</div>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Current</div>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Flagged</div>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-border" /> Open</div>
            </div>
            {showFocusState && (
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }} 
                transition={{ duration: 2, repeat: Infinity }}
                className="p-2.5 bg-primary/10 rounded-xl border-2 border-primary/20 flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary animate-sparkle" />
                <p className="text-[8px] font-black text-primary uppercase tracking-widest">Focus Mode Active</p>
              </motion.div>
            )}
          </div>
        </aside>
      </main>

      <footer className="h-auto shrink-0 border-t bg-card/95 backdrop-blur-xl flex flex-col px-6 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_30px_rgba(0,0,0,0.05)] z-50">
        <div className="h-20 flex items-center justify-between w-full max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            disabled={currentPhaseIdx === 0 && currentInPhaseIdx === 0}
            className="rounded-xl px-4 h-11 font-black text-[10px] uppercase tracking-widest hover:bg-muted transition-all active:scale-95 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>

          <div className="flex flex-col items-center">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground leading-none mb-1 opacity-60">Progress Trace</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-foreground">{overallCurrentIdx + 1}</span>
              <div className="w-1 h-1 bg-border rounded-full" />
              <span className="text-sm font-black text-muted-foreground">{questions.length}</span>
            </div>
          </div>

          <Button 
            variant="default" 
            onClick={handleNext} 
            className="rounded-xl px-6 h-11 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.05] active:scale-95 transition-all bg-primary text-primary-foreground"
          >
            {currentPhaseIdx === groupedPhases.length - 1 && currentInPhaseIdx === currentPhase.items.length - 1 ? 'Finish Simulation' : 'Continue'}
            <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </footer>

      <Dialog open={showBreakScreen} onOpenChange={setShowBreakScreen}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-8 max-w-[320px] text-center z-[1001] outline-none">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6">
            <DialogHeader>
              <div className="w-16 h-16 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight mb-1">Track Finalized</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold text-xs uppercase tracking-[0.2em]">
                Verified: <span className="text-primary">{currentPhase.subject}</span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="bg-muted/30 p-4 rounded-2xl border-2 border-dashed border-border/50 my-2 space-y-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Ascending To</span>
                <Badge className="font-black text-[9px] uppercase bg-primary text-primary-foreground border-none px-3">
                  {groupedPhases[currentPhaseIdx + 1]?.subject || 'End'}
                </Badge>
              </div>
              <div className="flex items-start gap-2.5 text-[10px] font-bold text-foreground leading-relaxed">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Coffee className="w-4 h-4 text-orange-500" />
                </div>
                <p>Strategic pauses during simulations increase conceptual retention by up to 15%.</p>
              </div>
            </div>

            <div className="grid gap-3 pt-2">
              <Button 
                onClick={() => {
                  setShowBreakScreen(false);
                  setIsResting(false);
                  setRestSeconds(0);
                  setCurrentPhaseIdx(prev => prev + 1);
                  setCurrentInPhaseIdx(0);
                }}
                className="h-14 rounded-2xl font-black text-sm uppercase tracking-widest gap-3 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
              >
                <Play className="w-4 h-4 fill-current" />
                Resume Simulation
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsResting(true)}
                className={cn(
                  "h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all",
                  isResting ? "text-orange-600 bg-orange-50 border-orange-200" : "text-muted-foreground border-border hover:bg-muted/30"
                )}
              >
                {isResting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Resting: {formatRestTime(restSeconds)}
                  </span>
                ) : "Request Short Pause"}
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-8 max-w-[300px] z-[1001] outline-none">
          <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
            <DialogHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary fill-current" />
              </div>
              <DialogTitle className="text-xl font-black tracking-tight">Sync Simulation?</DialogTitle>
              <DialogDescription className="text-muted-foreground font-black text-[10px] uppercase tracking-widest mt-1">
                {answeredCount}/{questions.length} Items Calibrated
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 pt-2">
              <Button onClick={handleSubmit} className="h-14 rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-xl shadow-primary/30 transition-all hover:scale-105">
                Commit Results
              </Button>
              <Button variant="ghost" onClick={() => setShowSubmitConfirm(false)} className="h-10 rounded-xl font-black text-[9px] uppercase tracking-widest text-muted-foreground">
                Return to Simulation
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}