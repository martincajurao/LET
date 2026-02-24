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
  
  // Resting State
  const [isResting, setIsResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);

  const handleSubmit = useCallback(() => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    onComplete(answers, timeSpent);
  }, [answers, startTime, onComplete]);

  // Main Exam Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit]);

  // Rest Stopwatch Timer
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
      {/* Android-Native Header */}
      <header className="h-14 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all",
            timeLeft < 60 ? "bg-rose-500/10 border-rose-500 text-rose-600 animate-pulse" : "bg-primary/10 border-primary/20 text-primary"
          )}>
            <Timer className="w-3.5 h-3.5" />
            <span className="text-xs font-black font-mono tracking-tight">{formatTime(timeLeft)}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
            <Layers className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] line-clamp-1">{currentPhase.subject}</span>
          </div>
        </div>

        <div className="flex-1 max-w-[140px] mx-4 md:max-w-xs">
          <div className="flex justify-between mb-1">
            <span className="text-[8px] font-black uppercase text-muted-foreground">Progress</span>
            <span className="text-[8px] font-black text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1 rounded-full transition-all duration-500" />
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowSubmitConfirm(true)}
          className="font-black text-[10px] uppercase tracking-widest text-primary h-9 rounded-xl hover:bg-primary/5 active:scale-95 transition-all"
        >
          <Send className="w-3.5 h-3.5 mr-1.5" />
          Finish
        </Button>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 relative no-scrollbar">
          <div className="max-w-2xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -10, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <Badge variant="secondary" className="px-2.5 py-0.5 font-black uppercase text-[9px] tracking-widest bg-muted/50 border-none rounded-lg">
                    {currentPhase.subject} • {currentInPhaseIdx + 1}/{currentPhase.items.length}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFlags(p => ({...p, [currentQuestion.id]: !p[currentQuestion.id]}))}
                    className={cn("h-8 px-2 gap-1.5 rounded-lg transition-colors", flags[currentQuestion.id] && "text-orange-500 bg-orange-500/10")}
                  >
                    <Flag className={cn("w-3.5 h-3.5", flags[currentQuestion.id] && "fill-current")} /> 
                    <span className="text-[10px] font-bold uppercase tracking-wider">{flags[currentQuestion.id] ? "Flagged" : "Review"}</span>
                  </Button>
                </div>

                <div className="space-y-6">
                  <h2 className="text-lg md:text-xl font-black leading-snug text-foreground tracking-tight">
                    {currentQuestion.text}
                  </h2>

                  <RadioGroup 
                    value={answers[currentQuestion.id] || ""} 
                    onValueChange={handleAnswer} 
                    className="grid grid-cols-1 gap-2.5"
                  >
                    {currentQuestion.options.map((opt, i) => (
                      <motion.div
                        key={i}
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <Label 
                          className={cn(
                            "flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98] group",
                            answers[currentQuestion.id] === opt 
                              ? "border-primary bg-primary/5 ring-2 ring-primary/10 shadow-sm" 
                              : "border-border bg-card hover:bg-muted/10"
                          )}
                        >
                          <RadioGroupItem value={opt} className="sr-only" />
                          <div className={cn(
                            "w-8 h-8 rounded-xl border-2 flex items-center justify-center mr-3.5 font-black text-xs transition-colors shrink-0",
                            answers[currentQuestion.id] === opt 
                              ? "bg-primary border-primary text-primary-foreground" 
                              : "border-border bg-muted/50 text-muted-foreground"
                          )}>
                            {String.fromCharCode(65+i)}
                          </div>
                          <span className="text-sm font-bold text-foreground leading-tight">{opt}</span>
                        </Label>
                      </motion.div>
                    ))}
                  </RadioGroup>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar Simulation Map (Hidden on mobile, specialized for Desktop) */}
        <aside className="hidden lg:flex w-72 border-l bg-muted/5 flex-col overflow-hidden">
          <div className="p-5 border-b bg-card/50">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Simulation Map</h3>
              <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{questions.length} Total Items</p>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-5 space-y-6">
              {groupedPhases.map((phase, pIdx) => (
                <div key={pIdx} className="space-y-3">
                  <div className="flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-sm py-1 z-10 border-b border-border/50">
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
                    <span className="text-[8px] font-black text-muted-foreground">
                      {getPhaseAnsweredCount(pIdx)}/{phase.items.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {phase.items.map((q, i) => (
                      <motion.button 
                        key={q.id} 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setCurrentPhaseIdx(pIdx);
                          setCurrentInPhaseIdx(i);
                        }}
                        className={cn(
                          "aspect-square rounded-lg text-[8px] font-black border transition-all flex items-center justify-center",
                          currentPhaseIdx === pIdx && currentInPhaseIdx === i 
                            ? "border-primary bg-primary text-primary-foreground shadow-md z-10" 
                            : answers[q.id] 
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" 
                              : "border-border text-muted-foreground hover:bg-muted/50",
                          flags[q.id] && ! (currentPhaseIdx === pIdx && currentInPhaseIdx === i) && "border-orange-500/40 bg-orange-500/5 text-orange-600"
                        )}
                      >
                        {i + 1}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-card/50 text-[8px] font-black uppercase tracking-widest text-muted-foreground grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Answered</div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Current</div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Flagged</div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-border" /> Remaining</div>
          </div>
        </aside>
      </main>

      {/* Android-Native Bottom Navigation Bar */}
      <footer className="h-16 shrink-0 border-t bg-card/90 backdrop-blur-xl flex items-center justify-between px-6 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          disabled={currentPhaseIdx === 0 && currentInPhaseIdx === 0}
          className="rounded-xl px-4 h-10 font-black text-[10px] uppercase tracking-wider hover:bg-muted/50 transition-all"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <div className="text-center">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground leading-none mb-1">Item</p>
          <p className="text-xs font-black text-foreground">{overallCurrentIdx + 1} / {questions.length}</p>
        </div>

        <Button 
          variant="default" 
          onClick={handleNext} 
          className="rounded-xl px-6 h-10 font-black text-[10px] uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          {currentPhaseIdx === groupedPhases.length - 1 && currentInPhaseIdx === currentPhase.items.length - 1 ? 'Finish' : 'Next'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </footer>

      {/* Phase Transition / Break Screen (MD3 Style) */}
      <Dialog open={showBreakScreen} onOpenChange={setShowBreakScreen}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-8 max-w-[340px] text-center z-[1001] overflow-hidden">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-6"
          >
            <DialogHeader>
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <DialogTitle className="text-xl font-black tracking-tight mb-1">Phase Complete!</DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium text-xs">
                Professional track <span className="text-foreground font-black">{currentPhase.subject}</span> finalized.
              </DialogDescription>
            </DialogHeader>
            
            <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 my-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Next Up</span>
                <Badge className="font-black text-[9px] uppercase bg-primary/20 text-primary border-none">
                  {groupedPhases[currentPhaseIdx + 1]?.subject || 'Calibration'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-foreground text-left leading-snug">
                <Coffee className="w-4 h-4 text-orange-500 shrink-0" />
                <p>A 2-minute break restores analytical calibration by 15%.</p>
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
                className="h-14 rounded-2xl font-black text-sm uppercase tracking-widest gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                Next Phase
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsResting(true)}
                className={cn(
                  "h-12 rounded-xl font-bold text-[10px] uppercase tracking-wider border-2 transition-all",
                  isResting ? "text-orange-600 bg-orange-50 border-orange-200" : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                {isResting ? (
                  <>
                    <Timer className="w-3.5 h-3.5 mr-2 animate-pulse" />
                    Resting: {formatRestTime(restSeconds)}
                  </>
                ) : (
                  <>
                    <Timer className="w-3.5 h-3.5 mr-2" />
                    Take a Break
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Submission Confirmation (Compact Dialog) */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-8 max-w-[320px] z-[1001]">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="space-y-4"
          >
            <DialogHeader className="text-center">
              <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-orange-500" />
              </div>
              <DialogTitle className="text-xl font-black">Finish Now?</DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium text-xs">
                You've completed <span className="text-foreground font-black">{answeredCount}/{questions.length}</span> items. Submit for professional calibration?
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 pt-2">
              <Button 
                onClick={handleSubmit} 
                className="h-12 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Submit Simulation
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setShowSubmitConfirm(false)} 
                className="h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Review Items
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
