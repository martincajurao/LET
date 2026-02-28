'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Star,
  Zap,
  BookOpen,
  ChevronRight,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Question } from "@/app/lib/mock-data";
import { XP_REWARDS } from "@/lib/xp-system";

interface QuestionOfTheDayProps {
  question: Question;
  onComplete?: (isCorrect: boolean, xpEarned: number) => void;
  isLocked?: boolean;
  unlockTime?: number;
}

export function QuestionOfTheDay({ 
  question, 
  onComplete,
  isLocked = false,
  unlockTime 
}: QuestionOfTheDayProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);

  const handleAnswer = (answer: string) => {
    if (showResult || isLocked) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    
    const correct = answer === question.correctAnswer;
    setIsCorrect(correct);
    
    if (correct) {
      const earned = XP_REWARDS.QUESTION_OF_THE_DAY;
      setXpEarned(earned);
      setHasAnswered(true);
      
      if (onComplete) {
        onComplete(true, earned);
      }
    } else {
      setXpEarned(0);
      setHasAnswered(true);
      
      if (onComplete) {
        onComplete(false, 0);
      }
    }
  };

  const getTimeUntilUnlock = () => {
    if (!unlockTime) return '';
    const now = Date.now();
    const diff = unlockTime - now;
    
    if (diff <= 0) return '';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  if (isLocked) {
    return (
      <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
        <CardHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-black">Question of the Day</CardTitle>
                <p className="text-xs text-muted-foreground font-medium">Come back tomorrow!</p>
              </div>
            </div>
            <Badge variant="outline" className="font-bold text-orange-500 border-orange-500/30 bg-orange-500/10">
              <Lock className="w-3 h-3 mr-1" />
              Locked
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">Next Question In</h3>
            <p className="text-3xl font-black text-primary">{getTimeUntilUnlock()}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Complete today's question to earn {XP_REWARDS.QUESTION_OF_THE_DAY} XP!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
              <CardTitle className="text-xl font-black">Question of the Day</CardTitle>
              <p className="text-xs text-muted-foreground font-medium">Test your knowledge!</p>
            </div>
          </div>
          <Badge className={cn("font-bold text-xs", getDifficultyColor(question.difficulty))}>
            {question.difficulty.toUpperCase()}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="font-medium text-xs">
            <BookOpen className="w-3 h-3 mr-1" />
            {question.subject}
          </Badge>
          {question.subCategory && (
            <Badge variant="outline" className="font-medium text-xs">
              {question.subCategory}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-4">
        {/* Question */}
        <div className="p-4 rounded-2xl bg-muted/30">
          <p className="text-lg font-medium leading-relaxed">{question.text}</p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrectAnswer = option === question.correctAnswer;
            
            let optionClass = "border-2 ";
            
            if (showResult) {
              if (isCorrectAnswer) {
                optionClass += "border-green-500 bg-green-500/10";
              } else if (isSelected && !isCorrectAnswer) {
                optionClass += "border-red-500 bg-red-500/10";
              } else {
                optionClass += "border-border/50 opacity-50";
              }
            } else {
              optionClass += isSelected 
                ? "border-primary bg-primary/10" 
                : "border-border/50 hover:border-primary/50 hover:bg-primary/5";
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={showResult}
                className={cn(
                  "w-full p-4 rounded-xl text-left font-medium transition-all",
                  optionClass,
                  !showResult && "cursor-pointer"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                    isSelected || (showResult && isCorrectAnswer)
                      ? "bg-current/10"
                      : "bg-muted"
                  )}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="flex-1">{option}</span>
                  {showResult && isCorrectAnswer && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {showResult && isSelected && !isCorrectAnswer && (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Result */}
        {showResult && (
          <div className={cn(
            "p-4 rounded-2xl",
            isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"
          )}>
            <div className="flex items-center gap-3 mb-2">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <span className="font-bold text-green-500">Correct!</span>
                  <Badge className="ml-auto bg-green-500/20 text-green-500 font-bold">
                    <Zap className="w-3 h-3 mr-1" />
                    +{xpEarned} XP
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-red-500" />
                  <span className="font-bold text-red-500">Incorrect!</span>
                </>
              )}
            </div>
            
            {question.explanation && (
              <div className="mt-3 pt-3 border-t border-current/10">
                <p className="text-sm font-medium text-muted-foreground">
                  <span className="font-bold">Explanation:</span> {question.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Motivational message if already answered */}
        {hasAnswered && !showResult && (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground font-medium">
              You've already completed today's question. Come back tomorrow!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default QuestionOfTheDay;
