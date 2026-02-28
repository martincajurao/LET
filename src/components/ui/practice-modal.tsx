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
  Unlock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Trophy
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getRankData, isTrackUnlocked, UNLOCK_RANKS, getCareerRankTitle } from '@/lib/xp-system';
import { useToast } from '@/hooks/use-toast';
import { increment, arrayUnion } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastUnlockedName, setLastUnlockedName] = useState("");
  
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
      description: user?.majorship ? `Your chosen major: ${user.majorship}` : 'Please set your majorship in Profile first.',
      icon: <Star className="w-6 h-6" />,
      color: 'bg-emerald-500 text-white',
      borderColor: 'border-emerald-500',
      time: `~${limits.limitSpec} minutes`,
      questions: `${limits.limitSpec} items`,
      reqRank: UNLOCK_RANKS.SPECIALIZATION,
      unlockCost: 60,
      requiresMajorship: true
    }
  ];

  const handleStartPractice = (mode: any) => {
    if (loading) return;

    if (mode.requiresMajorship && !user?.majorship) {
      toast({
        variant: "destructive",
        title: "Majorship Required",
        description: "Please configure your academic track in your Profile before starting this track.",
      });
      return;
    }
    
    const isUnlocked = isTrackUnlocked(rankData.rank, mode.id, user?.unlockedTracks);
    if (!isUnlocked) {
      toast({
        variant: "destructive",
        title: "Track Locked",
        description: `This simulation requires Rank ${mode.reqRank} or Credit Unlock.`,
      });
      return;
    }
    
    onStartExam(mode.id);
    onClose();
  };

  const handleUnlockEarly = async (e: React.MouseEvent, mode: any) => {
    e.stopPropagation();
    if (!user || unlockingId) return;
    
    const cost = mode.unlockCost;
    if ((user.credits || 0) < cost) {
      toast({ 
        variant: "destructive", 
        title: "Insufficient Credits", 
        description: `You need ${cost} AI Credits to unlock this early.` 
      });
      return;
    }

    setUnlockingId(mode.id);
    try {
      await updateProfile({
        credits: increment(-cost),
        unlockedTracks: arrayUnion(mode.id) as any
      });
      
      setLastUnlockedName(mode.name);
      setShowSuccessDialog(true);
    } catch (e) {
      console.error("Unlock sync error:", e);
      toast({ variant: "destructive", title: "Unlock Failed", description: "Cloud sync error." });
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-0 bg-background border-0 shadow-2xl outline-none">
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
                    <Sparkles className="w-3.5 h-3.5 text-yellow-600 fill-current animate-sparkle" />
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
                const needsMajorship = mode.requiresMajorship && !user?.majorship;
                
                return (
                  <Card
                    key={mode.id}
                    className={cn(
                      "border-2 transition-all duration-300 relative overflow-hidden bg-card rounded-[2rem]",
                      !isUnlocked ? "border-muted opacity-85 grayscale-[0.5]" : "cursor-pointer hover:shadow-xl hover:-translate-y-1 " + mode.borderColor,
                      needsMajorship && "border-rose-200"
                    )}
                    onClick={() => isUnlocked && handleStartPractice(mode)}
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
                              <span>Lifetime Access</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-xl font-black mt-4 group-hover:text-primary transition-colors text-foreground">{mode.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-medium line-clamp-2 mt-1 leading-relaxed">{mode.description}</p>
                    </CardHeader>
                    
                    <CardContent className="pt-0 relative z-10">
                      <div className="flex items-center justify-between mt-4">
                        {needsMajorship ? (
                          <div className="w-full flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            <span className="text-[9px] font-black uppercase text-rose-600 tracking-tighter">Set Majorship in Profile</span>
                          </div>
                        ) : !isUnlocked ? (
                          <button
                            onClick={(e) => handleUnlockEarly(e, mode)}
                            disabled={unlockingId === mode.id}
                            className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-between px-4 border-2 border-primary bg-primary/5 text-primary transition-all hover:bg-primary/10 active:scale-95 disabled:opacity-50 disabled:grayscale group"
                          >
                            {unlockingId === mode.id ? (
                              <div className="w-full flex justify-center">
                                <Loader2 className="w-5 h-5 animate-spin" />
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <Unlock className="w-4 h-4" />
                                  <span className="font-black text-primary">Unlock Mode</span>
                                </div>
                                <div className="animate-breathing-primary px-3 py-1.5 rounded-xl border-2 border-primary/20 flex items-center gap-2">
                                  <span className="font-black text-sm text-primary">{mode.unlockCost}</span>
                                  <Sparkles className="w-4 h-4 text-primary fill-current animate-sparkle" />
                                  <span className="text-[8px] font-black text-primary opacity-80">AI CREDIT</span>
                                </div>
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{mode.time}</span>
                            </div>
                            <Button
                              size="sm"
                              disabled={loading}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartPractice(mode);
                              }}
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
                      {!isUnlocked && !needsMajorship && (
                        <p className="text-[8px] font-bold text-muted-foreground uppercase text-center mt-4 tracking-wider">
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
                    Reach Rank 5 to unlock the full 150-item simulation, or use credits to bypass the requirement instantly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unlock Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 max-w-[340px] overflow-hidden outline-none z-[1100]">
          <div className="bg-emerald-500/10 p-12 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10"
            >
              <Trophy className="w-10 h-10" />
            </motion.div>
            
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.4, 0.2] 
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-transparent z-0" 
            />
            
            <div className="absolute inset-0 z-5 pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 0], y: -80, x: (i - 2) * 30 }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                  className="absolute bottom-0 left-1/2"
                >
                  <Sparkles className="w-3 h-3 text-emerald-500 fill-current animate-sparkle" />
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="p-8 pt-4 text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <DialogHeader>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-1">Access Granted</span>
                  <DialogTitle className="text-2xl font-black tracking-tight text-foreground">Mode Unlocked!</DialogTitle>
                  <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-1">
                    {lastUnlockedName} is now active
                  </DialogDescription>
                </div>
              </DialogHeader>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-muted/30 rounded-2xl p-4 border border-border/50 flex flex-col items-center gap-1"
            >
              <span className="text-[9px] font-black uppercase text-muted-foreground">Permanent Status</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-lg font-black text-foreground">Lifetime Access</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <Button 
                onClick={() => setShowSuccessDialog(false)}
                className="w-full h-14 rounded-2xl font-black text-base gap-2 shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white group"
              >
                Let's Practice
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
