'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Clock, 
  ChevronRight, 
  X, 
  Timer,
  LayoutGrid,
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

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col overflow-hidden">
      <header className="h-16 border-b bg-primary/5 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap className="w-5 h-5 text-primary-foreground fill-current" />
          </div>
          <span className="font-black tracking-tight text-sm uppercase">Quick Fire Challenge</span>
        </div>

        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full border bg-card shadow-sm",
            timeLeft < 20 ? "border-rose-500 text-rose-500 animate-pulse" : "border-border"
          )}>
            <Timer className="w-4 h-4" />
            <span className="font-black font-mono text-sm">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onExit} className="rounded-full hover:bg-rose-500/10 hover:text-rose-500">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="h-1 w-full bg-muted">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="max-w-2xl w-full space-y-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex justify-center">
                <Badge variant="secondary" className="px-4 py-1.5 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] bg-primary/10 text-primary border-none">
                  Item {currentIdx + 1} of {questions.length} • {currentQuestion.subject}
                </Badge>
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-center leading-tight tracking-tight px-4">
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
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Label 
                      className={cn(
                        "flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all",
                        answers[currentQuestion.id] === opt 
                          ? "border-primary bg-primary/5 ring-4 ring-primary/10" 
                          : "border-border bg-card hover:bg-muted/10"
                      )}
                    >
                      <RadioGroupItem value={opt} className="sr-only" />
                      <div className={cn(
                        "w-10 h-10 rounded-xl border-2 flex items-center justify-center mr-4 font-black transition-colors shrink-0",
                        answers[currentQuestion.id] === opt 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "border-border bg-muted text-muted-foreground"
                      )}>
                        {String.fromCharCode(65+i)}
                      </div>
                      <span className="text-lg font-bold text-foreground">{opt}</span>
                    </Label>
                  </motion.div>
                ))}
              </RadioGroup>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="p-8 flex justify-center bg-gradient-to-t from-background to-transparent">
        <div className="flex items-center gap-2 text-muted-foreground font-black text-[10px] uppercase tracking-widest opacity-40">
          <BrainCircuit className="w-4 h-4" />
          <span>Professional Analytical Teaser</span>
        </div>
      </footer>
    </div>
  );
}
