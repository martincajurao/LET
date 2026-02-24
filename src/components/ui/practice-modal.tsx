'use client';

import React from 'react';
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
  Lock
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getRankData, isTrackUnlocked, UNLOCK_RANKS } from '@/lib/xp-system';

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
  const { user } = useUser();
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
      reqRank: UNLOCK_RANKS.FULL_SIMULATION
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
      reqRank: UNLOCK_RANKS.GENERAL_ED
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
      reqRank: UNLOCK_RANKS.PROFESSIONAL_ED
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
      reqRank: UNLOCK_RANKS.SPECIALIZATION
    }
  ];

  const handleStartPractice = (category: string, reqRank: number) => {
    if (rankData.rank < reqRank) return;
    onStartExam(category);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 bg-background border-0 shadow-2xl practice-modal-overlay">
        <DialogHeader className="border-b border-border/50 bg-card p-6 pb-4 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black text-left bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Choose Practice Mode
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Select how you want to practice today</p>
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

        <div className="p-6 space-y-6 bg-background">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {practiceModes.map((mode) => {
              const isLocked = rankData.rank < mode.reqRank;
              return (
                <Card
                  key={mode.id}
                  className={cn(
                    "border-2 transition-all duration-300 relative overflow-hidden bg-card rounded-2xl",
                    isLocked ? "border-muted opacity-70 grayscale cursor-not-allowed" : "cursor-pointer hover:shadow-xl hover:-translate-y-2 group " + mode.borderColor
                  )}
                  onClick={() => !loading && handleStartPractice(mode.id, mode.reqRank)}
                >
                  {isLocked && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/20 backdrop-blur-[1px]">
                      <div className="bg-card p-3 rounded-2xl shadow-xl flex flex-col items-center border border-border">
                        <Lock className="w-6 h-6 text-muted-foreground mb-1" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Unlocks at Rank {mode.reqRank}</span>
                      </div>
                    </div>
                  )}
                  
                  <CardHeader className="pb-4 relative">
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-10 rounded-t-2xl",
                      mode.id === 'all' ? 'from-primary/20 to-primary/5' :
                      mode.id === 'General Education' ? 'from-blue-500/20 to-blue-500/5' :
                      mode.id === 'Professional Education' ? 'from-purple-500/20 to-purple-500/5' :
                      'from-emerald-500/20 to-emerald-500/5'
                    )} />
                    
                    <div className="flex items-start justify-between relative z-10">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform",
                        !isLocked && "group-hover:scale-110",
                        mode.color
                      )}>
                        {mode.icon}
                      </div>
                      <Badge variant="secondary" className={cn(
                        "text-[10px] font-bold px-3 py-1 shadow-md",
                        mode.id === 'all' ? 'bg-primary/20 text-primary border-primary/30' :
                        mode.id === 'General Education' ? 'bg-blue-500/20 text-blue-600 border-blue-500/30' :
                        mode.id === 'Professional Education' ? 'from-purple-500/20 text-purple-600 border-purple-500/30' :
                        'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                      )}>
                        {mode.questions}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-black mt-4 group-hover:text-primary transition-colors text-foreground">{mode.name}</CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{mode.description}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-full">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">{mode.time}</span>
                      </div>
                      <Button
                        size="sm"
                        disabled={loading || isLocked}
                        className={cn(
                          "font-bold text-xs px-6 py-3 h-10 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105",
                          mode.id === 'all' 
                            ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25" 
                            : "bg-foreground hover:bg-foreground/90 text-background shadow-foreground/25"
                        )}
                      >
                        {loading ? "Starting..." : isLocked ? "Locked" : "Start"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 p-6 bg-primary/5 rounded-2xl border border-primary/20 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-black text-sm text-foreground flex items-center gap-2">
                  Academic Progression
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                </h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Advanced simulations are unlocked as you grow in your professional career. Earn XP by completing Brain Teasers and focused tracks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
