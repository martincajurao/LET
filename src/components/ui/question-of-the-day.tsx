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
  Star,
  Zap,
  BookOpen,
  ChevronRight,
  Lock,
  Info,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Question } from "@/app/lib/mock-data";
import { XP_REWARDS } from "@/lib/xp-system";
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

  const alreadyClaimed = useMemo(() => {
    if (!lastClaimDate) return false;
    const now = new Date();
    const lastClaim = new Date(lastClaimDate);
    return now.toDateString() === lastClaim.toDateString();
  }, [lastClaimDate]);

  const handleAnswer = async (answer: string) => {
    if (showResult || alreadyClaimed || isSubmitting) return;
    
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
      case 'easy': return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'hard': return 'text-red-500 bg-red-500/10 border-red-500/30';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
    }
  };

  return (
    <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-black">Daily Insight</CardTitle>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Board Calibration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-lg border-none", getDifficultyColor(question.difficulty))}>
              {question.difficulty}
            </Badge>
            {alreadyClaimed && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black text-[9px] uppercase">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Complete
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        <div className={cn(
          "p-5 rounded-2xl border-2 border-dashed transition-all",
          alreadyClaimed ? "bg-muted/30 border-border opacity-60" : "bg-primary/5 border-primary/20"
        )}>
          <p className="text-lg font-black leading-snug text-foreground">{question.text}</p>
          <div className="flex items-center gap-2 mt-4">
            <Badge variant="ghost" className="text-[8px] font-black uppercase bg-card border border-border/50 text-muted-foreground px-2">
              <BookOpen className="w-2.5 h-2.5 mr-1" /> {question.subject}
            </Badge>
            {question.subCategory && (
              <Badge variant="ghost" className="text-[8px] font-black uppercase bg-card border border-border/50 text-muted-foreground px-2">
                {question.subCategory}
              </Badge>
            )}
          </div>
        </div>

        {alreadyClaimed ? (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-lg">Next Item Calibrating...</h3>
              <p className="text-xs text-muted-foreground font-medium">You've completed today's professional challenge. Return tomorrow for your next growth trace.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer = option === question.correctAnswer;
              
              return (
                <motion.button
                  key={index}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswer(option)}
                  disabled={showResult || isSubmitting}
                  className={cn(
                    "w-full p-4 rounded-xl text-left font-bold transition-all border-2 flex items-center gap-4 relative overflow-hidden",
                    showResult 
                      ? isCorrectAnswer 
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" 
                        : isSelected ? "border-rose-500 bg-rose-500/10 text-rose-700" : "border-border opacity-40"
                      : isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/20 bg-card"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border-2 transition-colors",
                    isSelected || (showResult && isCorrectAnswer) ? "bg-primary border-primary text-white" : "bg-muted border-border text-muted-foreground"
                  )}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-sm flex-1 leading-tight">{option}</span>
                  
                  {isSubmitting && isSelected && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary ml-2" />
                  )}
                  {showResult && isCorrectAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                  {showResult && isSelected && !isCorrectAnswer && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                </motion.button>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {showResult && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }}
              className={cn(
                "p-5 rounded-2xl space-y-3 border-2",
                isCorrect ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCorrect ? <Sparkles className="w-5 h-5 text-emerald-600 animate-sparkle" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
                  <span className={cn("font-black text-sm uppercase tracking-widest", isCorrect ? "text-emerald-700" : "text-rose-700")}>
                    {isCorrect ? "Strategic Accuracy!" : "Calibration Divergence"}
                  </span>
                </div>
                {isCorrect && (
                  <Badge className="bg-emerald-600 text-white font-black text-[9px] uppercase border-none px-3 py-1">
                    +{XP_REWARDS.QUESTION_OF_THE_DAY} XP
                  </Badge>
                )}
              </div>
              
              {question.explanation && (
                <div className="pt-3 border-t border-black/5">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed italic">
                      {question.explanation}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 bg-muted/20 rounded-xl border border-border/50 flex items-center gap-3">
          <Info className="w-4 h-4 text-primary opacity-40" />
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
            Professional Rules: 1 Item / 24 Hours. Rewards: +25 XP. Correct items reinforce your board readiness trace.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default QuestionOfTheDay;
