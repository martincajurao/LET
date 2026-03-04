'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  doc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Trophy, 
  Medal, 
  Star, 
  Users, 
  Loader2, 
  ChevronRight,
  Flame,
  Zap,
  Crown,
  Target,
  Timer,
  Gift,
  Award,
  Lock,
  Clock,
  Calendar,
  Sparkles,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from "@/hooks/use-toast";
import { useSound } from '@/hooks/use-sound';
import { CelebrationEffect, useCelebration } from './celebration-effects';

interface TournamentEntry {
  id: string;
  displayName: string;
  photoURL?: string;
  score: number;
  xpEarned: number;
  rank?: number;
}

interface WeeklyTournamentProps {
  userId?: string;
  userName?: string;
  userXp?: number;
  userScore?: number;
}

interface TournamentConfig {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  rewardXp: number;
  rewardCredits: number;
  topN: number;
  isActive: boolean;
}

// Default weekly tournament config
const DEFAULT_TOURNAMENT: TournamentConfig = {
  id: 'weekly_default',
  name: 'Weekly Championship',
  description: 'Compete with learners nationwide for exclusive rewards!',
  startDate: new Date(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  rewardXp: 500,
  rewardCredits: 25,
  topN: 10,
  isActive: true,
};

export function WeeklyTournament({ 
  userId, 
  userName = 'Anonymous',
  userXp = 0,
  userScore = 0 
}: WeeklyTournamentProps) {
  const firestore = useFirestore();
  const { user, refreshUser } = useUser();
  const { toast } = useToast();
  const { playAchievement, playLevelUp } = useSound();
  const { celebration, triggerConfetti, clearCelebration } = useCelebration();

  const [showDialog, setShowDialog] = useState(false);
  const [leaderboard, setLeaderboard] = useState<TournamentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isParticipating, setIsParticipating] = useState(false);
  const [tournament] = useState<TournamentConfig>(DEFAULT_TOURNAMENT);

  const { timeRemaining, daysRemaining, hoursRemaining, minutesRemaining } = useMemo(() => {
    const now = new Date();
    const end = tournament.endDate;
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { timeRemaining: 'Ended', daysRemaining: 0, hoursRemaining: 0, minutesRemaining: 0 };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { 
      timeRemaining: `${days}d ${hours}h ${minutes}m`, 
      daysRemaining: days,
      hoursRemaining: hours,
      minutesRemaining: minutes
    };
  }, [tournament.endDate]);

  // Fetch leaderboard
  useEffect(() => {
    if (!firestore) return;

    setLoading(true);
    
    // Query tournament scores from exam_results this week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const q = query(
      collection(firestore, "exam_results"),
      where("timestamp", ">", startOfWeek),
      orderBy("overallScore", "desc"),
      orderBy("timeSpent", "asc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const entries = snapshot.docs.map((doc, index) => {
          const data = doc.data();
          return {
            id: doc.id,
            displayName: data.displayName || 'Anonymous',
            photoURL: data.photoURL,
            score: data.overallScore || 0,
            xpEarned: data.xpEarned || 0,
            rank: index + 1,
          };
        });
        setLeaderboard(entries);
        
        // Find user's rank
        if (userId) {
          const userIndex = entries.findIndex(e => e.id === userId);
          setUserRank(userIndex >= 0 ? userIndex + 1 : null);
        }
        
        setLoading(false);
      },
      (error) => {
        console.error('Leaderboard error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, userId]);

  const handleJoinTournament = async () => {
    if (!user || !firestore || userScore === 0) {
      toast({ 
        variant: "destructive", 
        title: "Cannot Join", 
        description: "Complete an exam first to enter the tournament!" 
      });
      return;
    }

    setIsParticipating(true);
    
    try {
      // Update user participation
      await updateDoc(doc(firestore, 'users', user.uid), {
        tournamentParticipating: true,
        tournamentScore: userScore,
        lastTournamentJoin: Date.now(),
      });
      
      playAchievement();
      toast({ 
        variant: "reward", 
        title: "You're In!", 
        description: "You've joined the weekly tournament. Good luck!" 
      });
      
      triggerConfetti();
    } catch (e) {
      toast({ 
        variant: "destructive", 
        title: "Join Failed", 
        description: "Could not join tournament." 
      });
    } finally {
      setIsParticipating(false);
    }
  };

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-500 text-yellow-900 border-yellow-400';
      case 2: return 'bg-slate-300 text-slate-700 border-slate-400';
      case 3: return 'bg-orange-400 text-orange-900 border-orange-300';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getRewardBadge = (rank: number) => {
    if (rank === 1) return { label: 'Champion', color: 'bg-yellow-500 text-white' };
    if (rank === 2) return { label: '2nd', color: 'bg-slate-400 text-white' };
    if (rank === 3) return { label: '3rd', color: 'bg-orange-400 text-white' };
    if (rank <= 10) return { label: `Top ${rank}`, color: 'bg-primary text-white' };
    return null;
  };

  // Calculate time progress
  const totalWeekMs = 7 * 24 * 60 * 60 * 1000;
  const elapsedMs = totalWeekMs - (daysRemaining * 24 * 60 * 60 * 1000 + hoursRemaining * 60 * 60 * 1000 + minutesRemaining * 60 * 1000);
  const timeProgress = Math.min((elapsedMs / totalWeekMs) * 100, 100);

  return (
    <>
      <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                  {tournament.name}
                  <Badge className="bg-red-500 text-white text-[8px] animate-pulse">LIVE</Badge>
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {timeRemaining} left
                  </span>
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDialog(true)}
              className="rounded-xl font-black text-[10px] uppercase tracking-widest"
            >
              View All
            </Button>
          </div>
          
          {/* Time Progress */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-[9px] font-black uppercase text-muted-foreground">
              <span>Tournament Progress</span>
              <span>Week {Math.ceil(timeProgress / 100 * 7)}/7</span>
            </div>
            <Progress value={timeProgress} className="h-2 rounded-full" />
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-4">
          {/* Top 3 Podium */}
          <div className="flex items-end justify-center gap-2">
            {/* 2nd Place */}
            {leaderboard[1] && (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full overflow-hidden border-4 border-slate-300 mb-2">
                  <img src={leaderboard[1].photoURL || ''} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="w-14 h-14 bg-slate-300 rounded-2xl flex items-center justify-center">
                  <Medal className="w-6 h-6 text-slate-500" />
                </div>
                <p className="text-[10px] font-black mt-1 truncate max-w-[60px]">{leaderboard[1].displayName}</p>
                <p className="text-[8px] font-bold text-muted-foreground">{leaderboard[1].score}%</p>
              </div>
            )}
            
            {/* 1st Place */}
            {leaderboard[0] && (
              <div className="flex flex-col items-center -mb-4">
                <motion.div 
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 rounded-full overflow-hidden border-4 border-yellow-400 shadow-lg shadow-yellow-500/30 mb-2"
                >
                  <img src={leaderboard[0].photoURL || ''} alt="" className="w-full h-full object-cover" />
                </motion.div>
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <p className="text-xs font-black mt-1 truncate max-w-[80px]">{leaderboard[0].displayName}</p>
                <p className="text-[9px] font-bold text-yellow-600">{leaderboard[0].score}%</p>
              </div>
            )}
            
            {/* 3rd Place */}
            {leaderboard[2] && (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full overflow-hidden border-4 border-orange-300 mb-2">
                  <img src={leaderboard[2].photoURL || ''} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="w-14 h-14 bg-orange-300 rounded-2xl flex items-center justify-center">
                  <Medal className="w-6 h-6 text-orange-600" />
                </div>
                <p className="text-[10px] font-black mt-1 truncate max-w-[60px]">{leaderboard[2].displayName}</p>
                <p className="text-[8px] font-bold text-muted-foreground">{leaderboard[2].score}%</p>
              </div>
            )}
          </div>

          {/* Your Rank */}
          {userRank && (
            <div className="bg-primary/5 rounded-2xl p-4 border-2 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border-2",
                    getMedalColor(userRank)
                  )}>
                    #{userRank}
                  </div>
                  <div>
                    <p className="text-sm font-black">Your Ranking</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">
                      {userRank <= 10 ? 'In the prizes!' : 'Keep climbing!'}
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => setShowDialog(true)}
                  className="rounded-xl font-black text-xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Rewards Preview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-yellow-600" />
                <span className="text-[9px] font-black uppercase text-yellow-600">Winner XP</span>
              </div>
              <p className="text-lg font-black text-yellow-700">+{tournament.rewardXp}</p>
            </div>
            <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-[9px] font-black uppercase text-purple-600">Winner Credits</span>
              </div>
              <p className="text-lg font-black text-purple-700">+{tournament.rewardCredits}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Leaderboard Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-w-[450px] max-h-[80vh] overflow-hidden outline-none">
          <DialogHeader className="p-6 pb-2 text-center bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl">
                <Trophy className="w-8 h-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-black">Weekly Leaderboard</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {timeRemaining} remaining • Top {tournament.topN} win rewards
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center py-12 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs font-bold text-muted-foreground">Loading rankings...</p>
              </div>
            ) : leaderboard.length > 0 ? (
              leaderboard.map((entry, idx) => {
                const reward = getRewardBadge(entry.rank || idx + 1);
                const isCurrentUser = entry.id === userId;
                
                return (
                  <motion.div 
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border-2 transition-all",
                      isCurrentUser 
                        ? "bg-primary/10 border-primary shadow-lg" 
                        : idx < 3 
                          ? "bg-muted/30 border-primary/10" 
                          : "bg-card border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border-2",
                        getMedalColor(entry.rank || idx + 1)
                      )}>
                        {entry.rank || idx + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-sm font-bold",
                          isCurrentUser ? "text-primary" : "text-foreground"
                        )}>
                          {entry.displayName}
                          {isCurrentUser && <span className="ml-2 text-[8px] text-primary">(You)</span>}
                        </span>
                        {reward && (
                          <Badge className={cn("h-4 text-[8px] font-black w-fit", reward.color)}>
                            {reward.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-base font-black text-primary">{entry.score}%</p>
                        <p className="text-[8px] text-muted-foreground">+{entry.xpEarned} XP</p>
                      </div>
                      {entry.rank === 1 && <Crown className="w-5 h-5 text-yellow-500" />}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm font-bold text-muted-foreground">No participants yet</p>
                <p className="text-xs text-muted-foreground">Be the first to join!</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t">
            <Button 
              onClick={handleJoinTournament}
              disabled={isParticipating || !user}
              className="w-full h-12 rounded-xl font-black text-sm gap-2"
            >
              {isParticipating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : userScore > 0 ? (
                <>
                  <Target className="w-4 h-4" />
                  Join with {userScore}% Score
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Complete Exam to Join
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Celebration Effect */}
      <CelebrationEffect
        show={celebration.show}
        type="fireworks"
        intensity={50}
        onComplete={clearCelebration}
      />
    </>
  );
}

export default WeeklyTournament;

