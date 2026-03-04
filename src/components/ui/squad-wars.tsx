'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc,
  serverTimestamp,
  orderBy,
  limit
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
} from "@/components/ui/dialog";
import { 
  Users, 
  Swords, 
  Loader2, 
  Trophy,
  Flame,
  Zap,
  Target,
  Clock,
  Crown,
  ShieldCheck,
  Star,
  Sparkles,
  Shield,
  Crosshair,
  Medal
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SquadWar {
  id: string;
  squad1Id: string;
  squad1Name: string;
  squad2Id: string;
  squad2Name: string;
  squad1Xp: number;
  squad2Xp: number;
  status: 'active' | 'completed';
  winnerId: string | null;
  startDate: number;
  endDate: number;
}

interface SquadWarProps {
  userSquadId?: string;
}

export function SquadWars({ userSquadId }: SquadWarProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [wars, setWars] = useState<SquadWar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWars, setShowWars] = useState(false);

  // Fetch active wars
  useEffect(() => {
    if (!firestore) return;

    const warsQuery = query(
      collection(firestore, 'squad_wars'),
      where('status', '==', 'active'),
      orderBy('endDate', 'desc'),
      limit(10)
    );

    const unsub = onSnapshot(warsQuery, (snap) => {
      const warData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SquadWar));
      setWars(warData);
      setLoading(false);
    });

    return () => unsub();
  }, [firestore]);

  const userWars = useMemo(() => {
    if (!userSquadId) return [];
    return wars.filter(w => w.squad1Id === userSquadId || w.squad2Id === userSquadId);
  }, [wars, userSquadId]);

  const currentWar = userWars.find(w => w.status === 'active');
  
  // Calculate total XP for user's squad in current war
  const userSquadXp = useMemo(() => {
    if (!currentWar || !userSquadId) return 0;
    return currentWar.squad1Id === userSquadId ? currentWar.squad1Xp : currentWar.squad2Xp;
  }, [currentWar, userSquadId]);

  const enemySquadXp = useMemo(() => {
    if (!currentWar || !userSquadId) return 0;
    return currentWar.squad1Id === userSquadId ? currentWar.squad2Xp : currentWar.squad1Xp;
  }, [currentWar, userSquadId]);

  const totalWarXp = userSquadXp + enemySquadXp;
  const userProgress = totalWarXp > 0 ? (userSquadXp / totalWarXp) * 100 : 50;

  const timeRemaining = useMemo(() => {
    if (!currentWar) return null;
    const now = Date.now();
    const diff = currentWar.endDate - now;
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }, [currentWar]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-card rounded-[2rem] border-2 border-dashed border-border/50">
        <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Syncing Wars...</p>
      </div>
    );
  }

  if (!userSquadId) {
    return (
      <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-red-500/10 to-purple-500/10 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Swords className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-black tracking-tight">Squad Wars</CardTitle>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Squad vs Squad Battles</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Join a squad to participate in wars!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight">Squad Wars</h3>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">vs Enemy Squads</p>
          </div>
        </div>
        {userWars.length > 0 && (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[8px] font-black uppercase">
            {userWars.length} Active
          </Badge>
        )}
      </div>

      {/* Active War Card */}
      {currentWar ? (
        <Card className="bg-gradient-to-br from-red-500/5 via-card to-purple-500/5 border-red-500/20 rounded-2xl overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500 text-white text-[8px] font-black uppercase animate-pulse">Live Battle</Badge>
                {timeRemaining && (
                  <span className="text-[9px] font-black text-muted-foreground uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {timeRemaining}
                  </span>
                )}
              </div>
            </div>

            {/* War Matchup */}
            <div className="flex items-center justify-between gap-4">
              {/* User Squad */}
              <div className="flex-1 text-center">
                <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-black truncate">
                  {currentWar.squad1Id === userSquadId ? currentWar.squad1Name : currentWar.squad2Name}
                </p>
                <p className="text-lg font-black text-primary">{userSquadXp.toLocaleString()} XP</p>
              </div>

              <div className="flex flex-col items-center gap-1">
                <Swords className="w-5 h-5 text-muted-foreground" />
                <span className="text-[8px] font-black uppercase text-muted-foreground">VS</span>
              </div>

              {/* Enemy Squad */}
              <div className="flex-1 text-center">
                <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <Users className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-sm font-black truncate">
                  {currentWar.squad1Id === userSquadId ? currentWar.squad2Name : currentWar.squad1Name}
                </p>
                <p className="text-lg font-black text-red-500">{enemySquadXp.toLocaleString()} XP</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${userProgress}%` }}
                  className="h-full bg-gradient-to-r from-primary to-purple-500"
                />
              </div>
              <div className="flex justify-between text-[8px] font-black uppercase text-muted-foreground">
                <span>Your Squad</span>
                <span>{userProgress.toFixed(1)}%</span>
                <span>Enemy</span>
              </div>
            </div>

            {/* Rewards */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-3 h-3 text-yellow-600" />
                  <span className="text-[8px] font-black uppercase text-yellow-600">Winner XP</span>
                </div>
                <p className="text-base font-black text-yellow-700">+500</p>
              </div>
              <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  <span className="text-[8px] font-black uppercase text-purple-600">Credits</span>
                </div>
                <p className="text-base font-black text-purple-700">+50</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2 border-border/50 rounded-2xl bg-muted/5">
          <CardContent className="p-6 text-center">
            <Swords className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">No active wars</p>
            <p className="text-[9px] text-muted-foreground mt-1">Check back soon for new battles!</p>
          </CardContent>
        </Card>
      )}

      {/* War History */}
      {userWars.filter(w => w.status === 'completed').length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <Medal className="w-3 h-3" /> War History
          </p>
          {userWars.filter(w => w.status === 'completed').slice(0, 3).map(war => {
            const userWon = war.winnerId === userSquadId;
            return (
              <Card key={war.id} className={cn(
                "rounded-xl border-0",
                userWon ? "bg-emerald-500/5" : "bg-rose-500/5"
              )}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {userWon ? (
                      <Crown className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <X className="w-4 h-4 text-rose-500" />
                    )}
                    <span className="text-xs font-black">
                      vs {war.squad1Id === userSquadId ? war.squad2Name : war.squad1Name}
                    </span>
                  </div>
                  <Badge className={userWon ? "bg-emerald-500/20 text-emerald-600" : "bg-rose-500/20 text-rose-600"}>
                    {userWon ? 'Victory' : 'Defeat'}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View All Button */}
      {userWars.length > 1 && (
        <Button 
          variant="ghost" 
          onClick={() => setShowWars(true)}
          className="w-full h-10 rounded-xl font-black text-[10px] uppercase"
        >
          View All Wars ({userWars.length})
        </Button>
      )}
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export default SquadWars;

