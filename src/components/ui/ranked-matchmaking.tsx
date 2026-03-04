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
  limit,
  getDocs
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
  Crosshair,
  Search,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getRankData, CAREER_TIERS } from '@/lib/xp-system';

interface MatchQueueEntry {
  id: string;
  userId: string;
  userName: string;
  userRank: number;
  subject: string;
  status: 'searching' | 'matched' | 'completed';
  matchedWith?: string;
  createdAt: number;
}

interface RankedMatchmakingProps {
  userId?: string;
  userXp?: number;
}

export function RankedMatchmaking({ userId, userXp = 0 }: RankedMatchmakingProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [queueEntry, setQueueEntry] = useState<MatchQueueEntry | null>(null);
  const [searchingOpponents, setSearchingOpponents] = useState<MatchQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('General Education');
  const [searchTime, setSearchTime] = useState(0);
  
  const subjects = ['General Education', 'Professional Education', 'Specialization'];
  const userRankData = useMemo(() => getRankData(userXp), [userXp]);

  // Fetch queue
  useEffect(() => {
    if (!firestore) return;

    const queueQuery = query(
      collection(firestore, 'matchmaking_queue'),
      where('status', '==', 'searching'),
      orderBy('createdAt', 'asc'),
      limit(20)
    );

    const unsub = onSnapshot(queueQuery, (snap) => {
      const entries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchQueueEntry));
      setSearchingOpponents(entries.filter(e => e.userId !== userId));
      setLoading(false);
    });

    return () => unsub();
  }, [firestore, userId]);

  // Search timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  // Find matches from queue
  useEffect(() => {
    if (!isSearching || !queueEntry || !firestore) return;

    // Look for opponents with similar rank (±2 ranks)
    const rankRange = 2;
    const potentialOpponents = searchingOpponents.filter(opp => 
      opp.subject === selectedSubject &&
      Math.abs(opp.userRank - userRankData.rank) <= rankRange &&
      opp.id !== queueEntry?.id
    );

    if (potentialOpponents.length > 0) {
      const matchedOpponent = potentialOpponents[0];
      handleMatchFound(matchedOpponent);
    }
  }, [searchingOpponents, isSearching, selectedSubject]);

  const handleStartSearch = async () => {
    if (!user || !firestore) return;
    
    setIsSearching(true);
    setSearchTime(0);

    try {
      const entryData = {
        userId: user.uid,
        userName: user.displayName || 'Player',
        userRank: userRankData.rank,
        subject: selectedSubject,
        status: 'searching',
        createdAt: Date.now()
      };

      const docRef = await addDoc(collection(firestore, 'matchmaking_queue'), entryData);
      setQueueEntry({ id: docRef.id, ...entryData, status: 'searching' as const });
    } catch (e) {
      toast({ variant: "destructive", title: "Search Failed", description: "Could not start matchmaking." });
      setIsSearching(false);
    }
  };

  const handleMatchFound = async (opponent: MatchQueueEntry) => {
    setShowMatchDialog(true);
    setIsSearching(false);
    
    // In a real app, this would create a match session
    toast({ 
      variant: "reward", 
      title: "Match Found!", 
      description: `You're matched with ${opponent.userName} (Rank ${opponent.userRank})` 
    });
  };

  const handleCancelSearch = async () => {
    if (!queueEntry || !firestore) return;
    
    try {
      await updateDoc(doc(firestore, 'matchmaking_queue', queueEntry.id), {
        status: 'cancelled'
      });
    } catch (e) {
      console.error('Failed to cancel search:', e);
    }
    
    setQueueEntry(null);
    setIsSearching(false);
    setSearchTime(0);
  };

  const formatSearchTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-card rounded-[2rem] border-2 border-dashed border-border/50">
        <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Syncing...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight">Ranked Match</h3>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Fair 1v1 Battles</p>
          </div>
        </div>
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[8px] font-black uppercase">
          Rank {userRankData.rank}
        </Badge>
      </div>

      {/* Subject Selection */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Subject</p>
        <div className="grid grid-cols-3 gap-2">
          {subjects.map(subject => (
            <Button
              key={subject}
              variant={selectedSubject === subject ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSubject(subject)}
              className={cn(
                "h-10 rounded-xl font-black text-[8px] uppercase",
                selectedSubject === subject ? "bg-blue-500" : ""
              )}
            >
              {subject.replace(' Education', '').replace('Specialization', 'Spec')}
            </Button>
          ))}
        </div>
      </div>

      {/* Search Card */}
      <Card className={cn(
        "rounded-2xl overflow-hidden transition-all",
        isSearching ? "bg-blue-500/5 border-blue-500/30" : "bg-muted/20 border-transparent"
      )}>
        <CardContent className="p-5">
          {isSearching ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Search className="w-5 h-5 text-blue-500 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-blue-600">Searching for opponent...</p>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase">
                      Rank ±2 from you
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-blue-500">{formatSearchTime(searchTime)}</p>
                  <p className="text-[8px] text-muted-foreground uppercase">Search Time</p>
                </div>
              </div>

              <Progress value={Math.min(searchTime * 2, 100)} className="h-2 rounded-full bg-blue-500/20" />

              {/* Potential Opponents */}
              {searchingOpponents.filter(o => o.subject === selectedSubject).length > 0 && (
                <div className="pt-2 border-t border-blue-500/10">
                  <p className="text-[9px] font-black uppercase text-blue-600 mb-2">
                    {searchingOpponents.filter(o => o.subject === selectedSubject).length} opponent(s) available
                  </p>
                </div>
              )}

              <Button 
                variant="ghost" 
                onClick={handleCancelSearch}
                className="w-full h-10 rounded-xl font-black text-[10px] uppercase text-rose-500 hover:bg-rose-500/10"
              >
                Cancel Search
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                  <Crosshair className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-black">Find Your Match</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase">
                    Auto-match with similar rank
                  </p>
                </div>
              </div>

              {/* Rank Info */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-500/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-3 h-3 text-blue-500" />
                    <span className="text-[8px] font-black uppercase text-blue-600">Your Rank</span>
                  </div>
                  <p className="text-lg font-black text-blue-700">{userRankData.rank}</p>
                </div>
                <div className="bg-purple-500/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-3 h-3 text-purple-500" />
                    <span className="text-[8px] font-black uppercase text-purple-600">Rank Range</span>
                  </div>
                  <p className="text-lg font-black text-purple-700">{userRankData.rank - 2} - {userRankData.rank + 2}</p>
                </div>
              </div>

              <Button 
                onClick={handleStartSearch}
                className="w-full h-12 rounded-xl font-black text-sm gap-2 bg-gradient-to-r from-blue-500 to-purple-500"
              >
                <Search className="w-4 h-4" />
                Start Matchmaking
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match Found Dialog */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-w-[350px] overflow-hidden outline-none">
          <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl"
            >
              <Crown className="w-10 h-10 text-blue-500" />
            </motion.div>
          </div>
          <div className="p-6 text-center space-y-4">
            <DialogTitle className="text-2xl font-black">Opponent Found!</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              A worthy challenger awaits. Prepare for battle!
            </DialogDescription>
            <div className="bg-blue-500/10 rounded-xl p-4">
              <p className="text-[9px] font-black uppercase text-blue-600 mb-2">Match Rewards</p>
              <div className="flex justify-center gap-6">
                <div>
                  <p className="text-xl font-black text-blue-600">+300</p>
                  <p className="text-[8px] text-muted-foreground uppercase">Win Bonus</p>
                </div>
                <div>
                  <p className="text-xl font-black text-purple-600">+150</p>
                  <p className="text-[8px] text-muted-foreground uppercase">Participation</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => setShowMatchDialog(false)}
              className="w-full h-12 rounded-xl font-black text-sm bg-gradient-to-r from-blue-500 to-purple-500"
            >
              Enter Battle
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RankedMatchmaking;

