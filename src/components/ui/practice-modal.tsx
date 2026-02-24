'use client';

import React, { useState } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Languages, 
  BookOpen, 
  Star, 
  X, 
  Clock,
  Lock,
  Coins,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getRankData, isTrackUnlocked, UNLOCK_RANKS, getCareerRankTitle } from '@/lib/xp-system';
import { useToast } from '@/hooks/use-toast';
import { increment } from 'firebase/firestore';

interface PracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExam: (category: string) => void;
  loading?: boolean;
  limits?: { limitGenEd: number; limitProfEd: number; limitSpec: number };
}

export function PracticeModal({ 
  isOpen, 
  onClose, 
  onStartExam, 
  loading = false,
  limits = { limitGenEd: 10, limitProfEd: 10, limitSpec: 10 }
}: PracticeModalProps) {
  const { user, updateProfile } = useUser();
  const { toast } = useToast();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  
  const rankData = user ? getRankData(user.xp || 0) : { rank: 1 };
  const totalQuestions = limits.limitGenEd + limits.limitProfEd + limits.limitSpec;

  const practiceModes = [
    {
      id: 'all',
      name: 'Full Simulation',
      description: 'Complete LET board exam with all categories',
      icon: <Zap className="w-6 h-6" />,
      color: 'bg-primary text-primary-foreground',
      borderColor: 'border-primary',
      time: `~${Math.ceil(totalQuestions * 1.5)} minutes`,
      questions: `${totalQuestions} items`,
      reqRank: UNLOCK_RANKS.FULL_SIMULATION,
      unlockCost: 120
    },
    {
      id: 'General Education',
      name: 'General Education',
      description: 'Language, Mathematics, Science & Humanities',
      icon: <Languages className="w-6 h-6" />,
      color: 'bg-blue-500 text-white',
      borderColor: 'border-blue-500',
      time: `~${limits.limitGenEd} minutes`,
      questions: `${limits.limitGenEd} items`,
      reqRank: UNLOCK_RANKS.GENERAL_ED,
      unlockCost: 0
    },
    {
      id: 'Professional Education',
      name: 'Professional Education',
      description: 'Teaching Principles & Child Development',
      icon: <BookOpen className="w-6 h-6" />,
      color: 'bg-purple-500 text-white',
      borderColor: 'border-purple-500',
      time: `~${limits.limitProfEd} minutes`,
      questions: `${limits.limitProfEd} items`,
      reqRank: UNLOCK_RANKS.PROFESSIONAL_ED,
      unlockCost: 30
    },
    {
      id: 'Specialization',
      name: user?.majorship || 'Specialization',
      description: `Your chosen major: ${user?.majorship || 'Not selected'}`,
      icon: <Star className="w-6 h-6" />,
      color: 'bg-emerald-500 text-white',
      borderColor: 'border-emerald-500',
      time: `~${limits.limitSpec} minutes`,
      questions: `${limits.limitSpec} items`,
      reqRank: UNLOCK_RANKS.SPECIALIZATION,
      unlockCost: 60
    }
  ];

  const handleStartPractice = (category: string, reqRank: number) => {
    if (!isTrackUnlocked(rankData.rank, category, user?.unlockedTracks)) return;
    onStartExam(category);
    onClose();
  };

  const handleUnlockEarly = async (e: React.MouseEvent, modeId: string, cost: number) => {
    e.stopPropagation();
    if (!user) return;
    if ((user.credits || 0) < cost) {
      toast({ 
        variant: "destructive", 
        title: "Insufficient Credits", 
        description: `You need ${cost} Credits to unlock this early. Complete daily tasks or watch ads!` 
      });
      return;
    }

    setUnlockingId(modeId);
    try {
      const currentUnlocked = user.unlockedTracks || [];
      await updateProfile({
        credits: increment(-cost),
        unlockedTracks: [...currentUnlocked, modeId]
      });
      toast({
        title: "Mode Unlocked!",
        description: `You now have permanent access to ${modeId}.`,
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Unlock Failed", description: "Cloud sync error." });
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-0 bg-background border-0 shadow-2xl practice-modal-overlay outline-none">
        <DialogHeader className="border-b border-border/50 bg-card p-8 pb-6 rounded-t-[2.5rem]">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black text-left text-foreground">
                Choose Practice Mode
              </DialogTitle>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground font-medium">Select your professional track</p>
                <div className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                  <Coins className="w-3 h-3 text-yellow-600 fill-current" />
                  <span className="text-[10px] font-black text-yellow-700">{user?.credits || 0}</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full h-10 w-10 hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5 text-foreground" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-6 bg-background">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {practiceModes.map((mode) => {
              const isUnlocked = isTrackUnlocked(rankData.rank, mode.id, user?.unlockedTracks);
              const isPermanentlyUnlocked = user?.unlockedTracks?.includes(mode.id);
              
              return (
                <Card
                  key={mode.id}
                  className={cn(
                    "border-2 transition-all duration-300 relative overflow-hidden bg-card rounded-[2rem]",
                    !isUnlocked ? "border-muted opacity-80" : "cursor-pointer hover:shadow-xl hover:-translate-y-1 " + mode.borderColor
                  )}
                  onClick={() => !loading && isUnlocked && handleStartPractice(mode.id, mode.reqRank)}
                >
                  <CardHeader className="pb-4 relative">
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-5 rounded-t-[2rem]",
                      mode.id === 'all' ? 'from-primary/40 to-primary/5' :
                      mode.id === 'General Education' ? 'from-blue-500/40 to-blue-500/5' :
                      mode.id === 'Professional Education' ? 'from-purple-500/40 to-purple-500/5' :
                      'from-emerald-500/40 to-emerald-500/5'
                    )} />
                    
                    <div className="flex items-start justify-between relative z-10">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform",
                        isUnlocked && "group-hover:scale-110",
                        mode.color
                      )}>
                        {mode.icon}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary" className="text-[10px] font-bold px-3 py-1 bg-muted/50 border-none">
                          {mode.questions}
                        </Badge>
                        {isPermanentlyUnlocked && (
                          <div className="flex items-center gap-1 text-[8px] font-black uppercase text-emerald-600">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Purchased</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-xl font-black mt-4 group-hover:text-primary transition-colors text-foreground">{mode.name}</CardTitle>
                    <p className="text-xs text-muted-foreground font-medium line-clamp-2 mt-1 leading-relaxed">{mode.description}</p>
                  </CardHeader>
                  
                  <CardContent className="pt-0 relative z-10">
                    <div className="flex items-center justify-between mt-4">
                      {!isUnlocked ? (
                        <Button
                          onClick={(e) => handleUnlockEarly(e, mode.id, mode.unlockCost)}
                          disabled={unlockingId === mode.id}
                          className="w-full h-11 rounded-xl font-black text-[9px] uppercase tracking-widest gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-lg"
                        >
                          {unlockingId === mode.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Coins className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                              Unlock with AI Credit: {mode.unlockCost}c
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{mode.time}</span>
                          </div>
                          <Button
                            size="sm"
                            disabled={loading}
                            className={cn(
                              "font-black text-[10px] uppercase tracking-widest px-6 h-9 rounded-xl transition-all duration-200 shadow-md",
                              mode.id === 'all' 
                                ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                                : "bg-foreground hover:bg-foreground/90 text-background"
                            )}
                          >
                            {loading ? "Starting..." : "Begin"}
                          </Button>
                        </div>
                      )}
                    </div>
                    {!isUnlocked && (
                      <p className="text-[8px] font-bold text-muted-foreground uppercase text-center mt-3 tracking-wider">
                        Or reach Rank {mode.reqRank} ({getCareerRankTitle(mode.reqRank)})
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 p-6 bg-primary/5 rounded-3xl border-2 border-dashed border-primary/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-black text-sm text-foreground flex items-center gap-2">
                  Academic Path
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                </h4>
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed font-medium">
                  We've lowered our professional thresholds to help you start your specific majorship training sooner. 
                  Reach Rank 5 to unlock the full 150-item simulation, or use credits to bypass the requirement today.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}