'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  X, 
  Timer,
  BrainCircuit
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

  const handleAnswer = (val: string) => {
    const currentQ = questions[currentIdx];
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
    
    // Auto-advance after small delay for flow
    setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(prev => prev + 1);
      } else {
        handleSubmit();
      }
    }, 400);
  };

  const progress = ((currentIdx + 1) / questions.length) * 100;
  const currentQuestion = questions[currentIdx];

  if (!currentQuestion) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col overflow-hidden">
      {/* Thinner, Android-style Header */}
      <header className="h-14 border-b bg-card/50 backdrop-blur-md flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-md">
            <Zap className="w-4 h-4 text-primary-foreground fill-current" />
          </div>
          <span className="font-black tracking-tight text-[10px] uppercase text-muted-foreground">Quick Fire</span>
        </div>

        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full border bg-background",
            timeLeft < 20 ? "border-rose-500 text-rose-500 animate-pulse" : "border-border"
          )}>
            <Timer className="w-3.5 h-3.5" />
            <span className="font-black font-mono text-xs">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onExit} className="h-8 w-8 rounded-full">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Tighter Progress Bar */}
      <div className="h-1 w-full bg-muted">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Main Content: Compact and Focused */}
      <main className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
        <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex justify-center">
                <Badge variant="secondary" className="px-2 py-0.5 rounded-lg font-black uppercase text-[9px] tracking-widest bg-primary/10 text-primary border-none">
                  Item {currentIdx + 1}/5 • {currentQuestion.subject}
                </Badge>
              </div>

              <h2 className="text-lg md:text-xl font-black text-center leading-snug tracking-tight text-foreground px-2">
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
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Label 
                      className={cn(
                        "flex items-center p-3.5 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98]",
                        answers[currentQuestion.id] === opt 
                          ? "border-primary bg-primary/5 ring-2 ring-primary/10" 
                          : "border-border bg-card hover:bg-muted/10"
                      )}
                    >
                      <RadioGroupItem value={opt} className="sr-only" />
                      <div className={cn(
                        "w-8 h-8 rounded-xl border-2 flex items-center justify-center mr-3 font-black text-xs transition-colors shrink-0",
                        answers[currentQuestion.id] === opt 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "border-border bg-muted text-muted-foreground"
                      )}>
                        {String.fromCharCode(65+i)}
                      </div>
                      <span className="text-sm font-bold text-foreground leading-tight">{opt}</span>
                    </Label>
                  </motion.div>
                ))}
              </RadioGroup>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="p-4 flex justify-center border-t bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-muted-foreground font-black text-[8px] uppercase tracking-widest opacity-50">
          <BrainCircuit className="w-3 h-3" />
          <span>Analytical Teaser</span>
        </div>
      </footer>
    </div>
  );
}
