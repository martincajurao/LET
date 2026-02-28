'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Coffee, 
  Brain,
  Zap,
  CheckCircle2,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { XP_REWARDS } from "@/lib/xp-system";

interface StudyTimerProps {
  onComplete?: (sessions: number, xpEarned: number) => void;
  isActive?: boolean;
}

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const TIMER_CONFIGS = {
  focus: { 
    duration: 25 * 60,
    label: 'Focus Time',
    icon: <Brain className="w-6 h-6" />,
    color: 'text-primary bg-primary/10',
    nextLabel: 'Short Break'
  },
  shortBreak: { 
    duration: 5 * 60,
    label: 'Short Break',
    icon: <Coffee className="w-6 h-6" />,
    color: 'text-green-500 bg-green-500/10',
    nextLabel: 'Focus Time'
  },
  longBreak: { 
    duration: 15 * 60,
    label: 'Long Break',
    icon: <Zap className="w-6 h-6" />,
    color: 'text-purple-500 bg-purple-500/10',
    nextLabel: 'Focus Time'
  }
};

export function StudyTimer({ onComplete, isActive = true }: StudyTimerProps) {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(TIMER_CONFIGS.focus.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [totalXpEarned, setTotalXpEarned] = useState(0);

  const currentConfig = TIMER_CONFIGS[mode];

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    
    if (mode === 'focus') {
      const newSessions = sessionsCompleted + 1;
      setSessionsCompleted(newSessions);
      
      const xpEarned = XP_REWARDS.POMODORO_COMPLETE || 30;
      setTotalXpEarned(prev => prev + xpEarned);
      
      if (newSessions % 4 === 0) {
        setMode('longBreak');
        setTimeLeft(TIMER_CONFIGS.longBreak.duration);
      } else {
        setMode('shortBreak');
        setTimeLeft(TIMER_CONFIGS.shortBreak.duration);
      }
      
      if (onComplete) {
        onComplete(newSessions, xpEarned);
      }
    } else {
      setMode('focus');
      setTimeLeft(TIMER_CONFIGS.focus.duration);
    }
  }, [mode, sessionsCompleted, onComplete]);

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(currentConfig.duration);
  };

  const skipToNext = () => {
    setIsRunning(false);
    if (mode === 'focus') {
      if ((sessionsCompleted + 1) % 4 === 0) {
        setMode('longBreak');
        setTimeLeft(TIMER_CONFIGS.longBreak.duration);
      } else {
        setMode('shortBreak');
        setTimeLeft(TIMER_CONFIGS.shortBreak.duration);
      }
    } else {
      setMode('focus');
      setTimeLeft(TIMER_CONFIGS.focus.duration);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    return ((currentConfig.duration - timeLeft) / currentConfig.duration) * 100;
  };

  return (
    <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
      <CardHeader className="p-6 pb-2 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", currentConfig.color)}>
            {currentConfig.icon}
          </div>
        </div>
        <CardTitle className="text-xl font-black">{currentConfig.label}</CardTitle>
        <Badge variant="outline" className="mx-auto w-fit mt-1 font-bold">
          {currentConfig.nextLabel} next
        </Badge>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        <div className="relative flex items-center justify-center">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/20"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - getProgress() / 100)}
                className={cn(
                  "transition-all duration-1000",
                  mode === 'focus' ? 'text-primary' : 
                  mode === 'shortBreak' ? 'text-green-500' : 'text-purple-500'
                )}
                strokeLinecap="round"
              />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black tracking-tight">
                {formatTime(timeLeft)}
              </span>
              <span className="text-xs text-muted-foreground font-medium mt-1">
                {isRunning ? 'In Progress' : 'Ready'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            className="h-12 w-12 rounded-full"
            disabled={!isActive}
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
          
          <Button
            onClick={handleStartPause}
            className={cn(
              "h-16 w-16 rounded-full font-black text-lg shadow-xl",
              mode === 'focus' 
                ? "bg-primary hover:bg-primary/90 shadow-primary/30" 
                : mode === 'shortBreak'
                ? "bg-green-500 hover:bg-green-600 shadow-green-500/30"
                : "bg-purple-500 hover:bg-purple-600 shadow-purple-500/30"
            )}
            disabled={!isActive}
          >
            {isRunning ? (
              <Pause className="w-7 h-7" />
            ) : (
              <Play className="w-7 h-7 ml-1" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={skipToNext}
            className="h-12 w-12 rounded-full"
            disabled={!isActive}
          >
            <Timer className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-muted/30 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground font-bold">Sessions</span>
            </div>
            <p className="text-2xl font-black">{sessionsCompleted}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground font-bold">XP Earned</span>
            </div>
            <p className="text-2xl font-black">+{totalXpEarned}</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-xs text-muted-foreground text-center font-medium">
            💡 Tip: Complete 4 focus sessions for a long break!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default StudyTimer;
