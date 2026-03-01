'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Zap, 
  Star,
  CheckCircle2,
  BrainCircuit,
  History,
  AlertCircle
} from "lucide-react";
import { Question } from "@/app/lib/mock-data";
import { cn } from "@/lib/utils";

interface QuickFireResultsProps {
  questions: Question[];
  answers: Record<string, string>;
  timeSpent: number;
  xpEarned: number;
  onRestart: () => void;
}

export function QuickFireResults({ questions, answers, timeSpent, xpEarned, onRestart }: QuickFireResultsProps) {
  const mistakes = questions.filter(q => answers[q.id] !== q.correctAnswer);
  const correctCount = questions.length - mistakes.length;
  const accuracy = Math.round((correctCount / (questions.length || 1)) * 100);

  return (
    <div className="max-w-xl mx-auto py-12 px-4 space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-yellow-500/10 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-yellow-500/5">
          <Trophy className="w-10 h-10 text-yellow-600" />
        </div>
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-foreground">Challenge Complete!</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Professional Brain Teaser Trace</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-foreground text-background overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10"><Zap className="w-16 h-16 fill-current" /></div>
          <CardHeader className="p-8 pb-2">
            <CardDescription className="text-primary font-black uppercase tracking-widest text-[10px]">Reward Yield</CardDescription>
            <CardTitle className="text-5xl font-black text-primary">+{xpEarned} <span className="text-xl opacity-60">XP</span></CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-current animate-sparkle" />
              <span>Skill-based credit</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden">
          <CardHeader className="p-8 pb-2">
            <CardDescription className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Calibration Accuracy</CardDescription>
            <CardTitle className="text-5xl font-black text-foreground">{accuracy}%</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{correctCount} / {questions.length} Items</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-black text-lg flex items-center gap-2 text-foreground">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            Item Distribution
          </h3>
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Verification List</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {questions.map((q, i) => {
            const isCorrect = answers[q.id] === q.correctAnswer;
            
            return (
              <div key={q.id} className={cn(
                "flex items-center justify-between p-4 rounded-2xl transition-all border shadow-sm",
                isCorrect ? "bg-emerald-500/5 border-emerald-500/10" : "bg-rose-500/5 border-rose-500/10"
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] border-2",
                    isCorrect ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-rose-500/10 border-rose-500/20 text-rose-600"
                  )}>
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase text-muted-foreground opacity-60 leading-none mb-1">{q.subject}</p>
                    <p className="text-xs font-bold text-foreground truncate max-w-[200px]">{q.text}</p>
                  </div>
                </div>
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-500/10 text-rose-600">
                    <span className="text-[8px] font-black uppercase">Missed</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 pt-4">
        <Button onClick={onRestart} className="h-16 rounded-[2rem] font-black text-lg shadow-xl shadow-primary/30 gap-3 active:scale-95 transition-all">
          <Zap className="w-5 h-5 fill-current" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-center gap-6 pt-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">
            <History className="w-4 h-4" />
            <span>Time: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s</span>
          </div>
          <div className="w-1.5 h-1.5 bg-border rounded-full" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">
            <BrainCircuit className="w-4 h-4" />
            <span>Logic Trace: 100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
