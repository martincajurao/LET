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
} from "lucide-react";
import { Question } from "@/app/lib/mock-data";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ExamInterfaceProps {
  questions: Question[];
  timePerQuestion?: number;
  onComplete: (answers: Record<string, string>, timeSpent: number) => void;
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
  const [timeLeft, setTimeLeft] = useState(questions.length * (timePerQuestion || 60));
  const [startTime] = useState(Date.now());
  
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showBreakScreen, setShowBreakScreen] = useState(false);
  
  const [isResting, setIsResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);

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
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
    window.dispatchEvent(new CustomEvent('questionAnswered'));
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
      setCurrentInPhaseIdx(prev => prev + 1);
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
    <div className="fixed inset-0 z-[200] bg-background flex flex-col overflow-hidden animate-in fade-in duration-300">
      <header className="pt-[env(safe-area-inset-top)] border-b bg-card/90 backdrop-blur-md shrink-0 z-50">
        <div className="h-14 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all",
              timeLeft < 60 ? "bg-rose-500/10 border-rose-500 text-rose-600 animate-pulse" : "bg-primary/10 border-primary/20 text-primary"
            )}>
              <Timer className="w-3 h-3" />
              <span className="text-[11px] font-black font-mono tracking-tighter">{formatTime(timeLeft)}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
              <Layers className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-widest line-clamp-1">{currentPhase.subject}</span>
            </div>
          </div>

          <div className="flex-1 max-w-[120px] mx-3 md:max-w-xs">
            <div className="flex justify-between mb-0.5">
              <span className="text-[7px] font-black uppercase text-muted-foreground opacity-60">Status</span>
              <span className="text-[7px] font-black text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1 rounded-full" />
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowSubmitConfirm(true)}
            className="font-black text-[9px] uppercase tracking-[0.15em] text-primary h-8 px-2.5 rounded-lg hover:bg-primary/5 transition-all"
          >
            <Send className="w-3 h-3 mr-1" />
            Finish
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 relative no-scrollbar">
          <div className="max-w-xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ x: 8, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -8, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                <div className="flex justify-between items-center">
                  <Badge variant="secondary" className="px-2 py-0.5 font-bold uppercase text-[8px] tracking-widest bg-muted/40 border-none rounded-md">
                    {currentPhase.subject} • {currentInPhaseIdx + 1}/{currentPhase.items.length}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFlags(p => ({...p, [currentQuestion.id]: !p[currentQuestion.id]}))}
                    className={cn("h-7 px-2 gap-1.5 rounded-lg transition-colors", flags[currentQuestion.id] && "text-orange-500 bg-orange-500/10")}
                  >
                    <Flag className={cn("w-3 h-3", flags[currentQuestion.id] && "fill-current")} /> 
                    <span className="text-[9px] font-black uppercase tracking-wider">{flags[currentQuestion.id] ? "Flagged" : "Review"}</span>
                  </Button>
                </div>

                <div className="space-y-5">
                  <h2 className="text-base md:text-lg font-bold leading-snug text-foreground tracking-tight">
                    {currentQuestion.text}
                  </h2>

                  <RadioGroup 
                    value={answers[currentQuestion.id] || ""} 
                    onValueChange={handleAnswer} 
                    className="grid grid-cols-1 gap-2"
                  >
                    {currentQuestion.options.map((opt, i) => (
                      <motion.div
                        key={i}
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <Label 
                          className={cn(
                            "flex items-center p-3.5 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] group",
                            answers[currentQuestion.id] === opt 
                              ? "border-primary bg-primary/5 ring-1 ring-primary/10 shadow-sm" 
                              : "border-border bg-card hover:bg-muted/5"
                          )}
                        >
                          <RadioGroupItem value={opt} className="sr-only" />
                          <div className={cn(
                            "w-7 h-7 rounded-lg border flex items-center justify-center mr-3 font-black text-[10px] transition-colors shrink-0",
                            answers[currentQuestion.id] === opt 
                              ? "bg-primary border-primary text-primary-foreground" 
                              : "border-border bg-muted/30 text-muted-foreground"
                          )}>
                            {String.fromCharCode(65+i)}
                          </div>
                          <span className="text-sm font-semibold text-foreground leading-tight">{opt}</span>
                        </Label>
                      </motion.div>
                    ))}
                  </RadioGroup>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <aside className="hidden lg:flex w-64 border-l bg-muted/5 flex-col overflow-hidden">
          <div className="p-4 border-b bg-card/50">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground">Simulation Map</h3>
              <LayoutGrid className="w-3 h-3 text-muted-foreground" />
            </div>
            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{questions.length} Items</p>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              {groupedPhases.map((phase, pIdx) => (
                <div key={pIdx} className="space-y-2">
                  <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10 border-b border-border/30">
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "w-1 h-1 rounded-full",
                        currentPhaseIdx === pIdx ? "bg-primary animate-pulse" : currentPhaseIdx > pIdx ? "bg-emerald-500" : "bg-muted"
                      )} />
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest truncate max-w-[100px]",
                        currentPhaseIdx === pIdx ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {phase.subject}
                      </span>
                    </div>
                    <span className="text-[7px] font-black text-muted-foreground opacity-60">
                      {getPhaseAnsweredCount(pIdx)}/{phase.items.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {phase.items.map((q, i) => (
                      <button 
                        key={q.id} 
                        onClick={() => {
                          setCurrentPhaseIdx(pIdx);
                          setCurrentInPhaseIdx(i);
                        }}
                        className={cn(
                          "aspect-square rounded-md text-[7px] font-black border transition-all flex items-center justify-center",
                          currentPhaseIdx === pIdx && currentInPhaseIdx === i 
                            ? "border-primary bg-primary text-primary-foreground shadow-sm z-10" 
                            : answers[q.id] 
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" 
                              : "border-border text-muted-foreground hover:bg-muted/30",
                          flags[q.id] && ! (currentPhaseIdx === pIdx && currentInPhaseIdx === i) && "border-orange-500/40 bg-orange-500/5 text-orange-600"
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-3 border-t bg-card/50 text-[7px] font-black uppercase tracking-widest text-muted-foreground grid grid-cols-2 gap-1.5">
            <div className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-emerald-500" /> Answered</div>
            <div className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-primary" /> Current</div>
            <div className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-orange-500" /> Flagged</div>
            <div className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-border" /> Open</div>
          </div>
        </aside>
      </main>

      <footer className="h-auto shrink-0 border-t bg-card/95 backdrop-blur-xl flex flex-col px-5 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_15px_rgba(0,0,0,0.03)] z-50">
        <div className="h-16 flex items-center justify-between w-full">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            disabled={currentPhaseIdx === 0 && currentInPhaseIdx === 0}
            className="rounded-lg px-3 h-9 font-black text-[9px] uppercase tracking-wider hover:bg-muted/50 transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            Back
          </Button>

          <div className="text-center">
            <p className="text-[7px] font-black uppercase tracking-[0.25em] text-muted-foreground leading-none mb-0.5">Item</p>
            <p className="text-[11px] font-black text-foreground">{overallCurrentIdx + 1} / {questions.length}</p>
          </div>

          <Button 
            variant="default" 
            onClick={handleNext} 
            className="rounded-lg px-5 h-9 font-black text-[9px] uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-[1.03] active:scale-95 transition-all"
          >
            {currentPhaseIdx === groupedPhases.length - 1 && currentInPhaseIdx === currentPhase.items.length - 1 ? 'Finish' : 'Next'}
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </footer>

      <Dialog open={showBreakScreen} onOpenChange={setShowBreakScreen}>
        <DialogContent className="rounded-[2rem] bg-card border-none shadow-2xl p-6 max-w-[300px] text-center z-[1001]">
          <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-5">
            <DialogHeader>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <DialogTitle className="text-lg font-black tracking-tight mb-0.5">Phase Complete</DialogTitle>
              <DialogDescription className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">
                Track Finalized: <span className="text-foreground">{currentPhase.subject}</span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="bg-muted/20 p-3 rounded-xl border border-border/40 my-2 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Next Phase</span>
                <Badge className="font-black text-[8px] uppercase bg-primary/10 text-primary border-none">
                  {groupedPhases[currentPhaseIdx + 1]?.subject || 'End'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold text-foreground leading-snug">
                <Coffee className="w-3.5 h-3.5 text-orange-500" />
                <p>Breaks improve calibration by 15%.</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Button 
                onClick={() => {
                  setShowBreakScreen(false);
                  setIsResting(false);
                  setRestSeconds(0);
                  setCurrentPhaseIdx(prev => prev + 1);
                  setCurrentInPhaseIdx(0);
                }}
                className="h-12 rounded-xl font-black text-xs uppercase tracking-widest gap-2 shadow-lg shadow-primary/20 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Proceed
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsResting(true)}
                className={cn(
                  "h-10 rounded-lg font-bold text-[9px] uppercase tracking-widest border-2 transition-all",
                  isResting ? "text-orange-600 bg-orange-50 border-orange-100" : "text-muted-foreground hover:bg-muted/30"
                )}
              >
                {isResting ? `Resting: ${formatRestTime(restSeconds)}` : "Take a Break"}
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-[2rem] bg-card border-none shadow-2xl p-6 max-w-[280px] z-[1001]">
          <motion.div initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4">
            <DialogHeader className="text-center">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
              <DialogTitle className="text-lg font-black tracking-tight">Finish Simulation?</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">
                {answeredCount}/{questions.length} Items Answered
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 pt-1">
              <Button onClick={handleSubmit} className="h-11 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all">
                Submit Now
              </Button>
              <Button variant="ghost" onClick={() => setShowSubmitConfirm(false)} className="h-9 rounded-lg font-bold text-[9px] uppercase tracking-widest text-muted-foreground">
                Keep Practicing
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}