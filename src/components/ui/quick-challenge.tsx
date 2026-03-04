'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Swords,
  Trophy,
  Target,
  Zap,
  Sparkles,
  Flame,
  Clock,
  ChevronRight,
  Users,
  TrendingUp,
  Crown,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// Challenge types
type ChallengeType = 'duel' | 'ranked' | 'prediction' | 'tournament' | 'squad-war';

interface Challenge {
  type: ChallengeType;
  title: string;
  description: string;
  xpReward: number;
  icon: React.ReactNode;
  color: string;
  actionLabel: string;
  isNew?: boolean;
}

interface QuickChallengeProps {
  onChallengeStart?: (type: ChallengeType) => void;
}

export function QuickChallenge({ onChallengeStart }: QuickChallengeProps) {
  const { user } = useUser();
  const router = useRouter();
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [lastChallengeTime, setLastChallengeTime] = useState<number>(0);

  // Available challenges based on user state
  const availableChallenges: Challenge[] = [
    {
      type: 'duel',
      title: 'Friend Duel',
      description: 'Challenge a peer to a 1v1 battle',
      xpReward: 250,
      icon: <Swords className="w-5 h-5" />,
      color: 'from-red-500 to-orange-500',
      actionLabel: 'Challenge Friend',
      isNew: true
    },
    {
      type: 'ranked',
      title: 'Ranked Match',
      description: 'Test your skills against similar ranks',
      xpReward: 300,
      icon: <Target className="w-5 h-5" />,
      color: 'from-blue-500 to-purple-500',
      actionLabel: 'Find Match'
    },
    {
      type: 'prediction',
      title: 'Prediction League',
      description: 'Predict next week\'s exam topics',
      xpReward: 50,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'from-green-500 to-teal-500',
      actionLabel: 'Make Prediction',
      isNew: true
    },
    {
      type: 'tournament',
      title: 'Weekly Tournament',
      description: 'Compete for top rankings',
      xpReward: 500,
      icon: <Trophy className="w-5 h-5" />,
      color: 'from-yellow-500 to-amber-500',
      actionLabel: 'Join Tournament'
    }
  ];

  // Rotate challenge every 2 hours or on load
  useEffect(() => {
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;
    
    // Check if we should rotate
    if (now - lastChallengeTime > twoHours || lastChallengeTime === 0) {
      const randomIndex = Math.floor(Math.random() * availableChallenges.length);
      setCurrentChallenge(availableChallenges[randomIndex]);
      setLastChallengeTime(now);
    }
  }, [lastChallengeTime]);

  const handleChallenge = () => {
    if (!currentChallenge) return;
    
    // Track challenge start
    onChallengeStart?.(currentChallenge.type);

    // Navigate based on challenge type
    switch (currentChallenge.type) {
      case 'duel':
      case 'ranked':
      case 'tournament':
        router.push('/events');
        break;
      case 'prediction':
        router.push('/events');
        break;
      default:
        router.push('/events');
    }
  };

  // Check for pending notifications
  useEffect(() => {
    // Simulated notification check - in real app would be from Firestore
    const hasNotifications = user?.streakCount && user.streakCount > 0;
    setShowNotification(!!hasNotifications);
  }, [user?.streakCount]);

  if (!currentChallenge) return null;

  return (
    <>
      <Card className={cn(
        "overflow-hidden rounded-2xl border-0 shadow-xl",
        "bg-gradient-to-r " + currentChallenge.color
      )}>
        <CardContent className="p-0">
          <div className="relative p-5 text-white">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {currentChallenge.isNew && (
                    <Badge className="bg-white/20 text-white text-[8px] font-black uppercase">
                      NEW
                    </Badge>
                  )}
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    {currentChallenge.icon}
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                  <Zap className="w-3 h-3 text-yellow-300 fill-current" />
                  <span className="text-xs font-black">+{currentChallenge.xpReward} XP</span>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-1 mb-4">
                <h3 className="text-lg font-black tracking-tight">{currentChallenge.title}</h3>
                <p className="text-xs text-white/80 font-medium">{currentChallenge.description}</p>
              </div>

              {/* Action Button */}
              <Button 
                onClick={handleChallenge}
                className="w-full h-11 bg-white text-black font-black text-sm gap-2 hover:bg-white/90"
              >
                {currentChallenge.actionLabel}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Dot */}
      {showNotification && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center"
        >
          <Bell className="w-2 h-2 text-white" />
        </motion.div>
      )}
    </>
  );
}

// Mini challenge button for navbar/quick access
interface MiniChallengeButtonProps {
  type: ChallengeType;
  onClick: () => void;
}

export function MiniChallengeButton({ type, onClick }: MiniChallengeButtonProps) {
  const config: Record<ChallengeType, { icon: React.ReactNode; color: string; label: string }> = {
    duel: { icon: <Swords className="w-4 h-4" />, color: 'bg-red-500', label: 'Duel' },
    ranked: { icon: <Target className="w-4 h-4" />, color: 'bg-blue-500', label: 'Ranked' },
    prediction: { icon: <TrendingUp className="w-4 h-4" />, color: 'bg-green-500', label: 'Predict' },
    tournament: { icon: <Trophy className="w-4 h-4" />, color: 'bg-yellow-500', label: 'Tournament' },
    'squad-war': { icon: <Users className="w-4 h-4" />, color: 'bg-purple-500', label: 'War' }
  };

  const { icon, color, label } = config[type];

  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95",
        color,
        "text-white"
      )}
    >
      {icon}
      <span className="text-[8px] font-black uppercase">{label}</span>
    </button>
  );
}

export default QuickChallenge;

