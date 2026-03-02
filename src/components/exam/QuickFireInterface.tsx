'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  X, 
  Timer,
  BrainCircuit,
  Sparkles,
  Target,
  Activity
} from "lucide-react";
import { Question } from "@/app/lib/mock-data";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface QuickFireInterfaceProps {
  questions: Question[];
  onComplete: (answers: Record<string, string>, timeSpent: number) => void;
  onExit: () => void;
}

export function QuickFireInterface({ questions, onComplete, onExit }: QuickFireInterfaceProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes for 5 items
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add('immersive-mode');
    return () => {
      document.body.classList.remove('immersive-mode');
    };
  }, []);

  const handleSubmit = useCallback((finalAnswers: Record<string, string>) => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    onComplete(finalAnswers, timeSpent);
  }, [startTime, onComplete]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit(answers);
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit, answers]);

  const handleAnswer = (val: string) => {
    if (selectedOption) return;
    
    setSelectedOption(val);
    const currentQ = questions[currentIdx];
    const newAnswers = { ...answers, [currentQ.id]: val };
    setAnswers(newAnswers);
    
    // Rapid auto-advance for continuous "Simple Quiz" feel
    setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setSelectedOption(null);
        setCurrentIdx(prev => prev + 1);
      } else {
        handleSubmit(newAnswers);
      }
    }, 400);
  };

  const progress = ((currentIdx + 1) / questions.length) * 100;
  const currentQuestion = questions[currentIdx];

  if (!currentQuestion) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-background flex flex-col overflow-hidden animate-in fade-in duration-300">
      <header className="pt-safe border-b bg-card/80 backdrop-blur-md shrink-0 shadow-sm">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="w-4 h-4 text-primary-foreground fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-tight text-[10px] uppercase text-foreground leading-none">QuickFire Quiz</span>
              <span className="text-[7px] font-black uppercase text-muted-foreground tracking-widest mt-0.5">Rapid Logic Trace</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full border-2 transition-all",
              timeLeft < 20 ? "bg-rose-500/10 border-rose-500 text-rose-600 animate-pulse" : "bg-muted/50 border-border/50 text-muted-foreground"
            )}>
              <Timer className="w-3.5 h-3.5" />
              <span className="font-black font-mono text-xs tabular-nums">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <button 
              onClick={onExit}
              className="rounded-full h-9 w-9 flex items-center justify-center bg-muted/20 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="h-1.5 w-full bg-muted overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 md:p-12 overflow-y-auto no-scrollbar bg-background">
        <div className="max-w-xl mx-auto w-full flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
            >
              <div className="flex flex-col items-center gap-3">
                <Badge variant="outline" className="px-4 py-1 rounded-lg font-black uppercase text-[9px] tracking-[0.3em] border-primary/20 text-primary bg-primary/5">
                  Analytical Item {currentIdx + 1}/{questions.length}
                </Badge>
                <h2 className="text-xl md:text-2xl font-black text-center leading-snug tracking-tight text-foreground px-4">
                  {currentQuestion.text}
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((opt, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <button 
                      onClick={() => handleAnswer(opt)}
                      disabled={!!selectedOption}
                      className={cn(
                        "w-full flex items-center p-4 rounded-2xl border-2 transition-all active:scale-[0.98] group relative overflow-hidden text-left",
                        selectedOption === opt 
                          ? "border-primary bg-primary/5 ring-4 ring-primary/5 shadow-xl" 
                          : "border-border/60 bg-card hover:bg-muted/10 shadow-md"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl border-2 flex items-center justify-center mr-4 font-black text-xs transition-all shrink-0",
                        selectedOption === opt 
                          ? "bg-primary border-primary text-primary-foreground shadow-lg" 
                          : "border-border/50 bg-muted/20 text-muted-foreground"
                      )}>
                        {String.fromCharCode(65+i)}
                      </div>
                      <span className="text-sm font-bold text-foreground leading-tight flex-1 pr-6">{opt}</span>
                      
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
          </AnimatePresence>
        </div>
      </main>

      <footer className="pb-safe border-t bg-card/50 backdrop-blur-md shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="p-4 flex items-center justify-center gap-8">
          <div className="flex items-center gap-2 text-muted-foreground/40 font-black text-[8px] uppercase tracking-[0.4em]">
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Continuous Quiz Engine</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-border" />
          <div className="flex items-center gap-2 text-muted-foreground/40 font-black text-[8px] uppercase tracking-[0.4em]">
            <Target className="w-3.5 h-3.5" />
            <span>5 Item Saga</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
