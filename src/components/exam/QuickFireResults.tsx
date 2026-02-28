'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Zap, 
  Star,
  CheckCircle2,
  BrainCircuit,
  History,
  Play,
  Loader2,
  MessageSquare,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Coins
} from "lucide-react";
import { Question } from "@/app/lib/mock-data";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { explainMistakesBatch } from "@/ai/flows/explain-mistakes-batch-flow";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { DAILY_AD_LIMIT } from '@/lib/xp-system';

interface QuickFireResultsProps {
  questions: Question[];
  answers: Record<string, string>;
  timeSpent: number;
  xpEarned: number;
  onRestart: () => void;
}

export function QuickFireResults({ questions, answers, timeSpent, xpEarned, onRestart }: QuickFireResultsProps) {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isExplaining, setIsExplaining] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  
  const mistakes = questions.filter(q => answers[q.id] !== q.correctAnswer);
  const correctCount = questions.length - mistakes.length;
  const accuracy = Math.round((correctCount / (questions.length || 1)) * 100);

  const handleExplainAllWithAd = async () => {
    if (mistakes.length === 0) return;
    if (!user || !firestore) return;
    
    if ((user.dailyAdCount || 0) >= DAILY_AD_LIMIT) {
      toast({ title: "Ad Limit Reached", description: "You've reached your daily professional clip allowance.", variant: "destructive" });
      return;
    }

    setIsExplaining(true);
    setVerifying(false);
    
    // Hard-locked duration: Playback window (3.5s)
    setTimeout(async () => {
      setVerifying(true);
      
      // Professional verification phase (1.5s)
      setTimeout(async () => {
        try {
          const result = await explainMistakesBatch({
            mistakes: mistakes.map(m => ({
              questionId: m.id,
              text: m.text,
              options: m.options,
              correctAnswer: m.correctAnswer,
              userAnswer: answers[m.id] || "No Answer",
              subject: m.subject
            }))
          });

          if (result.explanations) {
            const mapping: Record<string, string> = {};
            result.explanations.forEach(e => mapping[e.questionId] = e.aiExplanation);
            setExplanations(mapping);
            
            const userRef = doc(firestore, 'users', user.uid);
await updateDoc(userRef, {
              dailyAdCount: increment(1),
              mistakesReviewed: increment(mistakes.length)
            });
            // Refresh user data to ensure UI updates properly
            await refreshUser();

            toast({ 
              variant: "reward",
              title: "Insights Unlocked!", 
              description: "AI Pedagogical explanations are now visible below." 
            });
          }
        } catch (e) {
          toast({ variant: "destructive", title: "Sync Error", description: "Could not generate batch explanations." });
        } finally {
          setIsExplaining(false);
          setVerifying(false);
        }
      }, 1500);
    }, 3500);
  };

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

      {mistakes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="space-y-1">
              <h3 className="font-black text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                Mistake Analysis
              </h3>
              {isExplaining && (
                <p className="text-[9px] font-black uppercase text-primary animate-pulse tracking-widest">
                  Finish video to unlock insights
                </p>
              )}
            </div>
            {Object.keys(explanations).length === 0 && (
              <Button 
                onClick={handleExplainAllWithAd} 
                disabled={isExplaining || (user?.dailyAdCount || 0) >= DAILY_AD_LIMIT}
                variant="outline" 
                size="sm" 
                className="h-10 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 transition-all shadow-sm"
              >
                {isExplaining ? (
                  verifying ? <><ShieldAlert className="w-4 h-4 animate-pulse" /> Verifying...</> : <><Loader2 className="w-4 h-4 animate-spin" /> Watching...</>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {(user?.dailyAdCount || 0) >= DAILY_AD_LIMIT ? "Limit Reached" : "Watch Ad to Reveal All"}
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => {
              const isCorrect = answers[q.id] === q.correctAnswer;
              const hasExplanation = !!explanations[q.id];
              
              return (
                <div key={q.id} className="space-y-2">
                  <div className={cn(
                    "flex items-center justify-between p-4 rounded-2xl transition-all border",
                    isCorrect ? "bg-muted/30 border-border/50" : "bg-rose-500/5 border-rose-500/20"
                  )}>
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
                  
                  <AnimatePresence>
                    {!isCorrect && hasExplanation && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="bg-primary/5 p-4 rounded-2xl border border-primary/10 text-xs italic leading-relaxed text-foreground"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-3 h-3 text-primary" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary">AI Insight</span>
                        </div>
                        {explanations[q.id]}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <Button onClick={onRestart} disabled={isExplaining} className="h-16 rounded-2xl font-black text-lg shadow-xl shadow-primary/30 gap-3">
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