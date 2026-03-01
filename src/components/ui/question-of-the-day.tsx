'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Zap,
  BookOpen,
  Loader2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Info,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Question } from "@/app/lib/mock-data";
import { XP_REWARDS, MIN_QOTD_TIME } from "@/lib/xp-system";
import { motion, AnimatePresence } from "framer-motion";

interface QuestionOfTheDayProps {
  question: Question;
  lastClaimDate?: number;
  onComplete?: (isCorrect: boolean, xpEarned: number) => Promise<void>;
}

export function QuestionOfTheDay({ 
  question, 
  lastClaimDate,
  onComplete
}: QuestionOfTheDayProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [isReadingLocked, setIsReadingLocked] = useState(true);

  const alreadyClaimedOnMount = useMemo(() => {
    if (!lastClaimDate) return false;
    const now = new Date();
    const lastClaim = new Date(lastClaimDate);
    return now.toDateString() === lastClaim.toDateString();
  }, [lastClaimDate]);

  useEffect(() => {
    if (alreadyClaimedOnMount) {
      setIsReadingLocked(false);
      setShowResult(true);
      setIsCorrect(true);
      return;
    }
    
    const timer = setInterval(() => {
      setReadingTime(prev => {
        if (prev >= MIN_QOTD_TIME) {
          setIsReadingLocked(false);
          clearInterval(timer);
          return MIN_QOTD_TIME;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [alreadyClaimedOnMount]);

  const handleAnswer = async (answer: string) => {
    if (showResult || alreadyClaimedOnMount || isSubmitting || isReadingLocked) return;
    
    setSelectedAnswer(answer);
    setIsSubmitting(true);
    
    const correct = answer === question.correctAnswer;
    setIsCorrect(correct);
    
    try {
      if (onComplete) {
        await onComplete(correct, correct ? XP_REWARDS.QUESTION_OF_THE_DAY : 0);
      }
      setShowResult(true);
    } catch (e) {
      console.error('QOTD completion sync error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'hard': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default: return 'text-muted-foreground bg-muted/10';
    }
  };

  return (
    <Card className="android-surface border-none shadow-md3-2 rounded-[2.5rem] bg-card overflow-hidden">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight">Daily Insight</CardTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className={cn("h-5 px-2 font-black text-[8px] uppercase tracking-widest border-none", getDifficultyColor(question.difficulty))}>
                  {question.difficulty}
                </Badge>
                <p className="text-[9px] font-black text-muted-foreground opacity-60 uppercase tracking-widest">Verification Logic</p>
              </div>
            </div>
          </div>
          {alreadyClaimedOnMount && (
            <Badge variant="outline" className="h-6 px-3 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black text-[9px] uppercase tracking-widest rounded-full">
              <CheckCircle2 className="w-3 h-3 mr-1.5" /> Logged
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        <div className={cn(
          "p-5 rounded-[1.75rem] border-2 border-dashed transition-all relative overflow-hidden",
          alreadyClaimedOnMount ? "bg-muted/10 border-border opacity-80" : "bg-primary/5 border-primary/20 shadow-inner"
        )}>
          {isReadingLocked && !alreadyClaimedOnMount && (
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${(readingTime / MIN_QOTD_TIME) * 100}%` }} 
              className="absolute top-0 left-0 h-1.5 bg-primary/30"
            />
          )}
          <p className="text-lg font-black leading-snug text-foreground tracking-tight">{question.text}</p>
          <div className="flex items-center gap-2 mt-4">
            <Badge variant="ghost" className="text-[8px] font-black uppercase bg-card border border-border/50 text-muted-foreground px-2 h-5 rounded-lg">
              <BookOpen className="w-2.5 h-2.5 mr-1" /> {question.subject}
            </Badge>
            {question.subCategory && (
              <Badge variant="ghost" className="text-[8px] font-black uppercase bg-card border border-border/50 text-muted-foreground px-2 h-5 rounded-lg">
                {question.subCategory}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrectAnswer = option === question.correctAnswer;
            const showAsCorrect = showResult && isCorrectAnswer;
            const showAsWrong = showResult && isSelected && !isCorrectAnswer;
            
            return (
              <motion.button
                key={index}
                whileTap={(!isReadingLocked && !showResult) ? { scale: 0.98 } : {}}
                onClick={() => handleAnswer(option)}
                disabled={showResult || isSubmitting || isReadingLocked}
                className={cn(
                  "w-full p-4 rounded-2xl text-left font-bold transition-all border-2 flex items-center gap-4 relative overflow-hidden active:scale-[0.99]",
                  showAsCorrect 
                    ? "border-emerald-500 bg-emerald-500/5 text-emerald-700 shadow-sm" 
                    : showAsWrong 
                    ? "border-rose-500 bg-rose-500/5 text-rose-700" 
                    : showResult && !isSelected 
                    ? "border-border/40 opacity-40 grayscale bg-muted/5"
                    : isSelected 
                    ? "border-primary bg-primary/5 shadow-md" 
                    : "border-border/60 bg-card hover:bg-muted/5",
                  isReadingLocked && !alreadyClaimedOnMount && "opacity-50 cursor-wait"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0 border-2 transition-all shadow-sm",
                  showAsCorrect ? "bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20" :
                  showAsWrong ? "bg-rose-500 border-rose-500 text-white shadow-rose-500/20" :
                  isSelected ? "bg-primary border-primary text-white shadow-primary/20" :
                  "bg-muted/30 border-border/50 text-muted-foreground"
                )}>
                  {isReadingLocked && !showResult && !alreadyClaimedOnMount ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </div>
                <span className="text-sm flex-1 leading-tight font-black">{option}</span>
                
                {isSubmitting && isSelected && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary ml-2" />
                )}
                {showAsCorrect && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 animate-victory" />
                  </motion.div>
                )}
                {showAsWrong && <XCircle className="w-6 h-6 text-rose-500 shrink-0" />}
              </motion.button>
            );
          })}
          
          <AnimatePresence>
            {isReadingLocked && !alreadyClaimedOnMount && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-center gap-2 py-3 bg-primary/5 rounded-2xl border border-primary/10 border-dashed"
              >
                <ShieldCheck className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Analytical Scan Active...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showResult && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }}
              className={cn(
                "p-6 rounded-[2rem] space-y-4 border-2 shadow-inner transition-all",
                isCorrect || alreadyClaimedOnMount ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-[1.25rem] flex items-center justify-center shadow-lg",
                    isCorrect || alreadyClaimedOnMount ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                  )}>
                    {isCorrect || alreadyClaimedOnMount ? <Sparkles className="w-6 h-6 fill-current animate-sparkle" /> : <AlertCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className={cn("font-black text-sm uppercase tracking-[0.1em]", isCorrect || alreadyClaimedOnMount ? "text-emerald-700" : "text-rose-700")}>
                      {alreadyClaimedOnMount ? "Trace Secure" : isCorrect ? "Strategic Accuracy!" : "Calibration Divergence"}
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Insight Captured</p>
                  </div>
                </div>
                {(isCorrect || alreadyClaimedOnMount) && !alreadyClaimedOnMount && (
                  <div className="flex items-center gap-1.5 bg-emerald-600 px-3 py-1.5 rounded-xl shadow-lg border border-emerald-500">
                    <Zap className="w-3.5 h-3.5 text-white fill-current" />
                    <span className="text-white font-black text-xs">+{XP_REWARDS.QUESTION_OF_THE_DAY}</span>
                  </div>
                )}
              </div>
              
              {question.explanation && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: 0.3 }}
                  className="pt-4 border-t border-black/5 bg-card/60 p-5 rounded-2xl shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5 opacity-60" />
                    <p className="text-[11px] font-bold text-foreground leading-relaxed italic opacity-80">
                      {question.explanation}
                    </p>
                  </div>
                </motion.div>
              )}

              {alreadyClaimedOnMount && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <div className="h-[1px] flex-1 bg-border/50" />
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground opacity-40" />
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-40">Next Item in 24h</span>
                  </div>
                  <div className="h-[1px] flex-1 bg-border/50" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 flex items-start gap-3">
          <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5 opacity-40" />
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
            <span className="text-primary font-black">Professional Protocol:</span> Complete one professional insight every 24 hours to stabilize your board readiness metrics.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default QuestionOfTheDay;
