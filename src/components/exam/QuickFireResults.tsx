'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Zap, 
  ChevronRight, 
  Home, 
  ArrowLeft,
  Star,
  CheckCircle2,
  TrendingUp,
  BrainCircuit,
  History
} from "lucide-react";
import { Question } from "@/app/lib/mock-data";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface QuickFireResultsProps {
  questions: Question[];
  answers: Record<string, string>;
  timeSpent: number;
  xpEarned: number;
  onRestart: () => void;
}

export function QuickFireResults({ questions, answers, timeSpent, xpEarned, onRestart }: QuickFireResultsProps) {
  const correctCount = questions.filter(q => answers[q.id] === q.correctAnswer).length;
  const accuracy = Math.round((correctCount / questions.length) * 100);

  return (
    <div className="max-w-xl mx-auto py-12 px-4 space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-yellow-500/10 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-yellow-500/5">
          <Trophy className="w-10 h-10 text-yellow-600" />
        </div>
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter">Challenge Complete!</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Professional Brain Teaser Calibrated</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-foreground text-background overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10"><Zap className="w-16 h-16 fill-current" /></div>
          <CardHeader className="p-8 pb-2">
            <CardDescription className="text-primary font-black uppercase tracking-widest text-[10px]">Growth Reward</CardDescription>
            <CardTitle className="text-5xl font-black text-primary">+{xpEarned} <span className="text-xl opacity-60">XP</span></CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span>Score-based professional bonus</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden">
          <CardHeader className="p-8 pb-2">
            <CardDescription className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Accuracy</CardDescription>
            <CardTitle className="text-5xl font-black text-foreground">{accuracy}%</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>{correctCount} / {questions.length} Correct</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm rounded-[2.5rem] bg-card p-8 border border-border">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-lg tracking-tight">Mixed Track Calibration</h3>
            <Badge variant="outline" className="font-black uppercase text-[9px] tracking-widest">3 Categories Mix</Badge>
          </div>
          
          <div className="space-y-3">
            {questions.map((q, i) => {
              const isCorrect = answers[q.id] === q.correctAnswer;
              return (
                <div key={q.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs",
                      isCorrect ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                    )}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground opacity-60 leading-none mb-1">{q.subject}</p>
                      <p className="text-xs font-bold text-foreground line-clamp-1">{q.text}</p>
                    </div>
                  </div>
                  {isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Zap className="w-5 h-5 text-rose-500 opacity-30" />}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        <Button onClick={onRestart} className="h-16 rounded-2xl font-black text-lg shadow-xl shadow-primary/30 gap-3">
          <Zap className="w-5 h-5 fill-current" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-center gap-6 pt-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
            <History className="w-4 h-4" />
            <span>Time: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s</span>
          </div>
          <div className="w-1.5 h-1.5 bg-border rounded-full" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
            <BrainCircuit className="w-4 h-4" />
            <span>Analytical Focus: High</span>
          </div>
        </div>
      </div>
    </div>
  );
}
