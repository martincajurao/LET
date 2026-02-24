'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  BrainCircuit,
  Timer
} from "lucide-react";
import { Question } from "@/app/lib/mock-data";
import { cn } from "@/lib/utils";

interface ExamInterfaceProps {
  questions: Question[];
  timePerQuestion?: number;
  onComplete: (answers: Record<string, string>, timeSpent: number) => void;
}

export function ExamInterface({ questions, timePerQuestion = 60, onComplete }: ExamInterfaceProps) {
  // Group questions by subject to handle phases
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
    const currentQ = groupedPhases[currentPhaseIdx].items[currentInPhaseIdx];
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
    // Dispatch event for daily task tracking
    window.dispatchEvent(new CustomEvent('questionAnswered'));
  };

  const handleNext = () => {
    const currentPhase = groupedPhases[currentPhaseIdx];
    if (currentInPhaseIdx < currentPhase.items.length - 1) {
      // Still questions in current phase
      setCurrentInPhaseIdx(prev => prev + 1);
    } else {
      // Last question in current phase reached
      if (currentPhaseIdx < groupedPhases.length - 1) {
        // There are more phases, show the break screen
        setShowBreakScreen(true);
      } else {
        // Absolute last question of last phase, show finish confirmation
        setShowSubmitConfirm(true);
      }
    }
  };

  const handleBack = () => {
    if (currentInPhaseIdx > 0) {
      setCurrentInPhaseIdx(prev => prev - 1);
    } else if (currentPhaseIdx > 0) {
      // Go back to previous phase
      const prevPhaseIdx = currentPhaseIdx - 1;
      setCurrentPhaseIdx(prevPhaseIdx);
      setCurrentInPhaseIdx(groupedPhases[prevPhaseIdx].items.length - 1);
    }
  };

  const currentPhase = groupedPhases[currentPhaseIdx];
  const currentQuestion = currentPhase?.items[currentInPhaseIdx];
  
  // Calculate total progress
  const totalItemsBeforePhase = groupedPhases.slice(0, currentPhaseIdx).reduce((acc, p) => acc + p.items.length, 0);
  const overallCurrentIdx = totalItemsBeforePhase + currentInPhaseIdx;
  const progress = ((overallCurrentIdx + 1) / (questions.length || 1)) * 100;
  const answeredCount = Object.keys(answers).length;

  if (!currentQuestion) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col animate-in fade-in duration-300">
      {/* Simulation Top Bar */}
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
            <span className="text-xs font-black uppercase tracking-[0.2em]">{currentPhase.subject}</span>
          </div>
        </div>

        <div className="flex-1 max-w-xs mx-4 hidden md:block">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Phase {currentPhaseIdx + 1} of {groupedPhases.length}</span>
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
                Item {currentInPhaseIdx + 1} of {currentPhase.items.length} in Phase
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
                {currentQuestion.text}
              </h2>

              <RadioGroup 
                value={answers[currentQuestion.id] || ""} 
                onValueChange={handleAnswer} 
                className="grid grid-cols-1 gap-2"
              >
                {currentQuestion.options.map((opt, i) => (
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
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Simulation Map</h3>
            <p className="text-[10px] font-medium text-muted-foreground">Phased board examination.</p>
          </div>
          
          {groupedPhases.map((phase, pIdx) => (
            <div key={pIdx} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  currentPhaseIdx === pIdx ? "bg-primary animate-pulse" : currentPhaseIdx > pIdx ? "bg-emerald-500" : "bg-muted"
                )} />
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  currentPhaseIdx === pIdx ? "text-foreground" : "text-muted-foreground"
                )}>
                  {phase.subject}
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
                      "aspect-square rounded-lg text-[10px] font-black border transition-all",
                      currentPhaseIdx === pIdx && currentInPhaseIdx === i 
                        ? "border-primary bg-primary text-primary-foreground shadow-md" 
                        : answers[q.id] 
                          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600" 
                          : "border-border text-muted-foreground hover:bg-muted",
                      flags[q.id] && "border-orange-500/50 bg-orange-500/10 text-orange-600"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>
      </main>

      {/* Mobile Sticky Navigation Footer */}
      <footer className="h-20 shrink-0 border-t bg-card/80 backdrop-blur-xl flex items-center justify-between px-6 pb-safe-area shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <Button 
          variant="outline" 
          onClick={handleBack} 
          disabled={currentPhaseIdx === 0 && currentInPhaseIdx === 0}
          className="rounded-xl px-6 h-12 font-black text-xs border-border"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <div className="text-center md:hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Item</p>
          <p className="text-sm font-black text-foreground">{overallCurrentIdx + 1} / {questions.length}</p>
        </div>

        <Button 
          variant="default" 
          onClick={handleNext} 
          className="rounded-xl px-8 h-12 font-black text-xs shadow-lg shadow-primary/20"
        >
          {currentPhaseIdx === groupedPhases.length - 1 && currentInPhaseIdx === currentPhase.items.length - 1 ? 'Finish' : 'Next'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </footer>

      {/* Phase Transition / Break Screen */}
      <Dialog open={showBreakScreen} onOpenChange={setShowBreakScreen}>
        <DialogContent className="rounded-[3rem] bg-card border-none shadow-2xl p-10 max-w-md text-center">
          <DialogHeader>
            <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <DialogTitle className="text-3xl font-black tracking-tight mb-2">Phase Complete!</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium text-lg leading-relaxed">
              You have finished the <span className="text-foreground font-black">{currentPhase.subject}</span> track.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-muted/30 p-6 rounded-3xl border border-border/50 my-8 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Next Phase</span>
              <Badge className="font-black bg-primary/20 text-primary border-none">
                {groupedPhases[currentPhaseIdx + 1]?.subject || 'Finalizing'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-foreground text-left">
              <Coffee className="w-5 h-5 text-orange-500 shrink-0" />
              <p>Research suggests a short break improves analytical focus by 15%.</p>
            </div>
          </div>

          <div className="grid gap-3">
            <Button 
              onClick={() => {
                setShowBreakScreen(false);
                // Advance to first question of next phase
                setCurrentPhaseIdx(prev => prev + 1);
                setCurrentInPhaseIdx(0);
              }}
              className="h-16 rounded-2xl font-black text-lg gap-3 shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              Continue to Next Phase
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowBreakScreen(false)}
              className="h-14 rounded-2xl font-bold text-muted-foreground border-2 hover:bg-muted/50 transition-colors"
            >
              <Timer className="w-4 h-4 mr-2" />
              Rest for a Moment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submission Confirmation */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-8 max-w-sm">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
            <DialogTitle className="text-2xl font-black">Finalize Simulation?</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              You have answered <span className="text-foreground font-black">{answeredCount} out of {questions.length}</span> items. Once submitted, your answers will be calibrated by AI.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 pt-4">
            <Button 
              onClick={handleSubmit} 
              className="h-12 rounded-xl font-bold shadow-lg shadow-primary/30"
            >
              Submit Simulation
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowSubmitConfirm(false)} 
              className="h-12 rounded-xl font-bold text-muted-foreground"
            >
              Review Items
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
