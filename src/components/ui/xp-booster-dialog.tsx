'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  X,
  Infinity,
  Timer,
  TrendingUp,
  Coins
} from "lucide-react";
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { XP_BOOSTER, AI_BUDDY } from '@/lib/xp-system';
import { cn } from '@/lib/utils';

interface XpBoosterDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function XpBoosterDialog({ isOpen, onClose }: XpBoosterDialogProps) {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [activating, setActivating] = useState<string | null>(null);
  const [activeBooster, setActiveBooster] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  // Check for active booster on mount
  useEffect(() => {
    if (user?.activeBoosterEndTime) {
      const endTime = user.activeBoosterEndTime;
      if (endTime > Date.now()) {
        setActiveBooster(user.activeBoosterTier);
        setTimeRemaining(Math.floor((endTime - Date.now()) / 1000));
      }
    }
  }, [user]);
  
  // Timer countdown
  useEffect(() => {
    if (!activeBooster || timeRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setActiveBooster(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeBooster, timeRemaining]);
  
  const handleActivateBooster = async (tier: keyof typeof XP_BOOSTER) => {
    if (!user || !firestore) return;
    
    const booster = XP_BOOSTER[tier];
    const credits = typeof user.credits === 'number' ? user.credits : 0;
    
    if (credits < booster.cost) {
      toast({ 
        variant: "destructive", 
        title: "Insufficient Credits", 
        description: `Need ${booster.cost} credits to activate ${booster.name}` 
      });
      return;
    }
    
    setActivating(tier);
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      
      // Deduct credits
      await updateDoc(userRef, {
        credits: increment(-booster.cost),
        activeBoosterTier: tier,
        activeBoosterEndTime: Date.now() + (booster.duration * 60 * 1000)
      });
      
      setActiveBooster(tier);
      setTimeRemaining(booster.duration * 60);
      
      await refreshUser();
      toast({ 
        variant: "reward",
        title: "Booster Activated!", 
        description: `${booster.name} is now active! +${Math.round((booster.xpMultiplier - 1) * 100)}% XP` 
      });
    } catch (e) {
      toast({ 
        variant: "destructive", 
        title: "Activation Failed", 
        description: "Could not activate booster" 
      });
    } finally {
      setActivating(null);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getBoosterColor = (tier: string) => {
    switch(tier) {
      case 'TIER_1': return 'from-amber-600 to-amber-800';
      case 'TIER_2': return 'from-gray-400 to-gray-600';
      case 'TIER_3': return 'from-yellow-400 to-yellow-600';
      default: return 'from-primary to-primary';
    }
  };
  
  const boosters = [
    { key: 'TIER_1' as const, ...XP_BOOSTER.TIER_1, color: 'amber' },
    { key: 'TIER_2' as const, ...XP_BOOSTER.TIER_2, color: 'gray' },
    { key: 'TIER_3' as const, ...XP_BOOSTER.TIER_3, color: 'yellow' },
  ];
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-[2rem] bg-card border-none shadow-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary/50 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black">XP Booster</DialogTitle>
                <p className="text-white/70 text-xs">Multiply your XP gains!</p>
              </div>
            </div>
            {activeBooster && (
              <Badge className="bg-white/20 text-white border-none">
                <Timer className="w-3 h-3 mr-1" />
                {formatTime(timeRemaining)}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Active booster indicator */}
          {activeBooster && (
            <div className={cn(
              "p-4 rounded-2xl bg-gradient-to-r text-white",
              getBoosterColor(activeBooster)
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span className="font-black">Active!</span>
                </div>
                <span className="font-bold">+{Math.round((XP_BOOSTER[activeBooster].xpMultiplier - 1) * 100)}% XP</span>
              </div>
            </div>
          )}
          
          {/* Booster options */}
          <div className="space-y-3">
            {boosters.map((booster) => (
              <button
                key={booster.key}
                onClick={() => handleActivateBooster(booster.key)}
                disabled={activating !== null || (activeBooster && activeBooster !== booster.key)}
                className={cn(
                  "w-full p-4 rounded-2xl border-2 transition-all active:scale-95 flex items-center justify-between",
                  booster.color === 'amber' && "border-amber-200 bg-amber-50 hover:bg-amber-100",
                  booster.color === 'gray' && "border-gray-200 bg-gray-50 hover:bg-gray-100",
                  booster.color === 'yellow' && "border-yellow-200 bg-yellow-50 hover:bg-yellow-100",
                  activeBooster === booster.key && "ring-2 ring-primary"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    booster.color === 'amber' && "bg-amber-500 text-white",
                    booster.color === 'gray' && "bg-gray-500 text-white",
                    booster.color === 'yellow' && "bg-yellow-500 text-white"
                  )}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-sm">{booster.name}</p>
                    <p className="text-xs text-muted-foreground">{booster.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-background px-3 py-1 rounded-lg">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className="font-black text-sm">{booster.cost}</span>
                  </div>
                  {activating === booster.key && (
                    <Zap className="w-5 h-5 animate-spin text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
          
          {/* Credits balance */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your Credits</span>
              <span className="font-black text-yellow-600">{user?.credits || 0}c</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Simple button to trigger booster dialog
export function XpBoosterButton({ onClick }: { onClick: () => void }) {
  return (
    <Button 
      onClick={onClick}
      className="h-12 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-black text-xs uppercase tracking-widest gap-2 shadow-lg"
    >
      <Zap className="w-4 h-4" />
      Boost XP
    </Button>
  );
}
