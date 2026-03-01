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
  Timer,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { XP_REWARDS } from "@/lib/xp-system";
import { motion, AnimatePresence } from "framer-motion";

interface StudyTimerProps {
  onComplete?: (sessions: number, xpEarned: number) => void;
  isActive?: boolean;
}

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const TIMER_CONFIGS = {
  focus: { 
    duration: 25 * 60,
    label: 'Analytical Focus',
    icon: <Brain className="w-6 h-6" />,
    color: 'text-primary bg-primary/10',
    accentColor: 'hsl(var(--primary))',
    nextLabel: 'Short Break'
  },
  shortBreak: { 
    duration: 5 * 60,
    label: 'Pedagogical Pause',
    icon: <Coffee className="w-6 h-6" />,
    color: 'text-emerald-500 bg-emerald-500/10',
    accentColor: 'hsl(142, 71%, 45%)',
    nextLabel: 'Focus Time'
  },
  longBreak: { 
    duration: 15 * 60,
    label: 'Deep Recovery',
    icon: <Zap className="w-6 h-6" />,
    color: 'text-purple-500 bg-purple-500/10',
    accentColor: 'hsl(263, 70%, 50%)',
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
    <Card className="android-surface border-none shadow-md3-2 rounded-[2.5rem] bg-card overflow-hidden">
      <CardHeader className="p-6 md:p-8 pb-2 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className={cn("w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-all", currentConfig.color)}>
            {currentConfig.icon}
          </div>
          <div>
            <CardTitle className="text-xl md:text-2xl font-black tracking-tight">{currentConfig.label}</CardTitle>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Badge variant="secondary" className="h-5 px-3 font-black text-[8px] uppercase tracking-widest bg-muted/40 border-none">
                {currentConfig.nextLabel} next
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 md:p-8 space-y-8">
        <div className="relative flex items-center justify-center">
          <div className="relative w-56 h-56">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="112"
                cy="112"
                r="100"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
                className="text-muted/10"
              />
              <motion.circle
                cx="112"
                cy="112"
                r="100"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
                strokeDasharray={2 * Math.PI * 100}
                animate={{ strokeDashoffset: 2 * Math.PI * 100 * (1 - getProgress() / 100) }}
                transition={{ duration: 1, ease: "linear" }}
                className={cn(
                  "transition-colors duration-1000",
                  mode === 'focus' ? 'text-primary' : 
                  mode === 'shortBreak' ? 'text-emerald-500' : 'text-purple-500'
                )}
                strokeLinecap="round"
              />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-black tracking-tighter tabular-nums text-foreground">
                {formatTime(timeLeft)}
              </span>
              <AnimatePresence mode="wait">
                <motion.div 
                  key={isRunning ? 'active' : 'paused'}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-1.5 mt-1"
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isRunning ? "bg-emerald-500" : "bg-orange-500")} />
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-60">
                    {isRunning ? 'Calibrating' : 'Suspended'}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6">
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            className="h-14 w-14 rounded-2xl border-2 hover:bg-muted active:scale-90 transition-all shadow-sm"
            disabled={!isActive}
          >
            <RotateCcw className="w-6 h-6 text-muted-foreground" />
          </Button>
          
          <Button
            onClick={handleStartPause}
            className={cn(
              "h-20 w-20 rounded-[2rem] font-black text-lg shadow-2xl transition-all active:scale-95 group",
              mode === 'focus' 
                ? "bg-primary text-primary-foreground shadow-primary/30" 
                : mode === 'shortBreak'
                ? "bg-emerald-500 text-white shadow-emerald-500/30"
                : "bg-purple-500 text-white shadow-purple-500/30"
            )}
            disabled={!isActive}
          >
            {isRunning ? (
              <Pause className="w-9 h-9 fill-current" />
            ) : (
              <Play className="w-9 h-9 fill-current ml-1" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={skipToNext}
            className="h-14 w-14 rounded-2xl border-2 hover:bg-muted active:scale-90 transition-all shadow-sm"
            disabled={!isActive}
          >
            <Timer className="w-6 h-6 text-muted-foreground" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 rounded-[1.75rem] bg-muted/20 border border-border/50 text-center shadow-inner group">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Traces</span>
            </div>
            <p className="text-3xl font-black text-foreground group-hover:scale-110 transition-transform">{sessionsCompleted}</p>
          </div>
          <div className="p-5 rounded-[1.75rem] bg-muted/20 border border-border/50 text-center shadow-inner group">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <Zap className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Yield</span>
            </div>
            <p className="text-3xl font-black text-foreground group-hover:scale-110 transition-transform">+{totalXpEarned}</p>
          </div>
        </div>

        <div className="p-4 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/10 flex items-center justify-center gap-3">
          <Sparkles className="w-4 h-4 text-primary opacity-60 animate-sparkle" />
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">
            Complete 4 traces for deep recovery reward
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default StudyTimer;
