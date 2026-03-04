'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Star, Trophy, Flame, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingXPProps {
  amount: number;
  isVisible: boolean;
  type?: 'xp' | 'bonus' | 'streak' | 'achievement' | 'firstwin';
  onComplete?: () => void;
  position?: { x: number; y: number };
}

export function FloatingXP({
  amount,
  isVisible,
  type = 'xp',
  onComplete,
  position
}: FloatingXPProps) {
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true);
      const timer = setTimeout(() => {
        setIsShowing(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  const getConfig = () => {
    switch (type) {
      case 'bonus':
        return {
          icon: <Star className="w-5 h-5" />,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-400/30',
          label: 'BONUS'
        };
      case 'streak':
        return {
          icon: <Flame className="w-5 h-5" />,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/20',
          borderColor: 'border-orange-400/30',
          label: 'STREAK'
        };
      case 'achievement':
        return {
          icon: <Award className="w-5 h-5" />,
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/20',
          borderColor: 'border-purple-400/30',
          label: 'ACHIEVEMENT'
        };
      case 'firstwin':
        return {
          icon: <Trophy className="w-5 h-5" />,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/30',
          borderColor: 'border-yellow-400/50',
          label: 'FIRST WIN!'
        };
      default:
        return {
          icon: <Zap className="w-5 h-5" />,
          color: 'text-primary',
          bgColor: 'bg-primary/20',
          borderColor: 'border-primary/30',
          label: 'XP'
        };
    }
  };

  const config = getConfig();

  return (
    <AnimatePresence>
      {isShowing && (
        <motion.div
          initial={{ 
            opacity: 0, 
            y: 20,
            scale: 0.5,
            x: position?.x || 0,
            y: position?.y || 0
          }}
          animate={{ 
            opacity: 1, 
            y: -80,
            scale: 1,
            x: position?.x || 0,
            y: position?.y || 0
          }}
          exit={{ 
            opacity: 0, 
            y: -100,
            scale: 0.8
          }}
          transition={{ 
            duration: 1.5,
            ease: "easeOut"
          }}
          className={cn(
            "fixed pointer-events-none z-[1000] flex items-center gap-2 px-4 py-2 rounded-full",
            "border-2 backdrop-blur-md shadow-lg",
            config.bgColor,
            config.borderColor
          )}
          style={{
            left: position ? undefined : '50%',
            transform: position ? undefined : 'translateX(-50%)'
          }}
        >
          <div className={cn("flex items-center justify-center", config.color)}>
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ 
                duration: 0.5,
                repeat: 2,
                repeatType: "reverse"
              }}
            >
              {config.icon}
            </motion.div>
          </div>
          <div className="flex flex-col">
            <span className={cn("text-lg font-black tracking-tight", config.color)}>
              +{amount}
            </span>
            <span className={cn("text-[8px] font-black uppercase tracking-widest opacity-70", config.color)}>
              {config.label}
            </span>
          </div>
          
          {/* Sparkle particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                x: Math.cos((i * 60 * Math.PI) / 180) * 30,
                y: Math.sin((i * 60 * Math.PI) / 180) * 30
              }}
              transition={{ 
                duration: 1,
                repeat: Infinity,
                delay: i * 0.1
              }}
              className={cn("absolute w-2 h-2 rounded-full", config.bgColor)}
              style={{
                left: '50%',
                top: '50%'
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// XP Counter that animates when value changes
interface XPCounterProps {
  value: number;
  previousValue?: number;
  className?: string;
  showAnimation?: boolean;
}

export function XPCounter({ 
  value, 
  previousValue = 0, 
  className,
  showAnimation = true 
}: XPCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const diff = value - displayValue;
      const steps = Math.min(Math.abs(diff), 20);
      const increment = diff / steps;
      let current = displayValue;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        current += increment;
        setDisplayValue(Math.round(current));

        if (step >= steps) {
          clearInterval(timer);
          setDisplayValue(value);
          setIsAnimating(false);
        }
      }, 30);

      return () => clearInterval(timer);
    }
  }, [value]);

  return (
    <span className={cn(
      "font-black tabular-nums transition-all",
      isAnimating && showAnimation && "text-primary scale-110",
      className
    )}>
      {displayValue.toLocaleString()}
    </span>
  );
}

// XP Bar with animated progress
interface XPProgressBarProps {
  current: number;
  max: number;
  className?: string;
  showLabel?: boolean;
}

export function XPProgressBar({ 
  current, 
  max, 
  className,
  showLabel = true 
}: XPProgressBarProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const progress = (current / max) * 100;
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [current, max]);

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs font-bold">
          <span className="text-muted-foreground">XP Progress</span>
          <span className="text-primary">{current.toLocaleString()} / {max.toLocaleString()}</span>
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${animatedProgress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
        />
      </div>
    </div>
  );
}

// Multi-XP popup for big rewards
interface MultiXPPopupProps {
  rewards: Array<{ label: string; amount: number; type: 'xp' | 'credits' }>;
  isVisible: boolean;
  onClose?: () => void;
}

export function MultiXPPopup({ rewards, isVisible, onClose }: MultiXPPopupProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: -50 }}
          className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-none"
        >
          <div className="bg-card/90 backdrop-blur-md rounded-[2rem] p-8 shadow-2xl border-2 border-primary/30">
            <h3 className="text-2xl font-black text-center mb-6 flex items-center justify-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Rewards Earned!
            </h3>
            <div className="space-y-3">
              {rewards.map((reward, index) => (
                <motion.div
                  key={reward.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between gap-8 p-3 rounded-xl bg-muted/30"
                >
                  <span className="text-sm font-bold text-muted-foreground uppercase">
                    {reward.label}
                  </span>
                  <span className={cn(
                    "text-xl font-black",
                    reward.type === 'xp' ? "text-primary" : "text-yellow-500"
                  )}>
                    +{reward.amount} {reward.type === 'credits' ? 'c'}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FloatingXP;

