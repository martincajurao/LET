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
  increment
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
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
  X,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Duel {
  id: string;
  challengerId: string;
  challengerName: string;
  challengedId: string;
  challengedName: string;
  challengerScore: number;
  challengedScore: number;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  winnerId: string | null;
  createdAt: number;
  completedAt: number | null;
  subject: string;
  xpReward: number;
}

interface FriendDuelProps {
  userId?: string;
}

export function FriendDuels({ userId }: FriendDuelProps) {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('General Education');
  
  const subjects = ['General Education', 'Professional Education', 'Specialization', 'all'];

  // Fetch duels
  useEffect(() => {
    if (!user || !firestore) return;

    const duelsQuery = query(
      collection(firestore, 'duels'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(duelsQuery, (snap) => {
      const duelData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Duel));
      setDuels(duelData);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid, firestore]);

  const pendingDuels = useMemo(() => duels.filter(d => d.status === 'pending'), [duels]);
  const activeDuels = useMemo(() => duels.filter(d => d.status === 'accepted' || d.status === 'completed'), [duels]);
  const completedDuels = useMemo(() => duels.filter(d => d.status === 'completed'), [duels]);

  const handleCreateDuel = async (friend: any) => {
    if (!user || !firestore) return;
    setIsCreating(true);

    try {
      const duelData = {
        challengerId: user.uid,
        challengerName: user.displayName || 'Player',
        challengedId: friend.id,
        challengedName: friend.displayName || 'Player',
        challengerScore: 0,
        challengedScore: 0,
        status: 'pending',
        winnerId: null,
        createdAt: Date.now(),
        completedAt: null,
        subject: selectedSubject,
        xpReward: 250,
        userId: user.uid
      };

      await addDoc(collection(firestore, 'duels'), duelData);
      
      toast({ 
        variant: "reward", 
        title: "Duel Sent!", 
        description: `Challenge sent to ${friend.displayName}` 
      });
      
      setShowCreateDialog(false);
    } catch (e) {
      toast({ 
        variant: "destructive", 
        title: "Challenge Failed", 
        description: "Could not send duel request." 
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAcceptDuel = async (duel: Duel) => {
    if (!firestore) return;
    
    try {
      await updateDoc(doc(firestore, 'duels', duel.id), {
        status: 'accepted'
      });
      
      toast({ 
        variant: "reward", 
        title: "Duel Accepted!", 
        description: "Prepare for battle!" 
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Accept Failed", description: "Could not accept duel." });
    }
  };

  const handleDeclineDuel = async (duel: Duel) => {
    if (!firestore) return;
    
    try {
      await updateDoc(doc(firestore, 'duels', duel.id), {
        status: 'declined'
      });
      
      toast({ title: "Duel Declined", description: "Challenge has been declined." });
    } catch (e) {
      toast({ variant: "destructive", title: "Decline Failed", description: "Could not decline duel." });
    }
  };

  const getDuelStatusBadge = (duel: Duel) => {
    switch (duel.status) {
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-[8px] font-black uppercase">Pending</Badge>;
      case 'accepted':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[8px] font-black uppercase">Active</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[8px] font-black uppercase">Completed</Badge>;
      case 'declined':
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[8px] font-black uppercase">Declined</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-card rounded-[2rem] border-2 border-dashed border-border/50">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Duels...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Swords className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight">Friend Duels</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">1v1 Exam Battles</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-gradient-to-r from-red-500 to-orange-500"
        >
          Challenge
        </Button>
      </div>

      {/* Pending Duels */}
      {pendingDuels.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-600 flex items-center gap-2">
            <AlertCircle className="w-3 h-3" /> Pending Challenges
          </p>
          {pendingDuels.map(duel => (
            <Card key={duel.id} className="bg-yellow-500/5 border-yellow-500/20 rounded-2xl overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 rounded-xl">
                      <AvatarFallback className="bg-yellow-500/20 text-yellow-600 font-black text-sm">
                        {duel.challengerName?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-black">{duel.challengerName}</p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase">{duel.subject}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleAcceptDuel(duel)}
                      className="h-8 px-3 rounded-lg font-black text-[9px] bg-emerald-500"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Accept
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeclineDuel(duel)}
                      className="h-8 px-3 rounded-lg font-black text-[9px] text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Active Duels */}
      {activeDuels.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
            <Swords className="w-3 h-3" /> Active Battles
          </p>
          {activeDuels.map(duel => (
            <Card key={duel.id} className="bg-blue-500/5 border-blue-500/20 rounded-2xl overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      <Avatar className="w-8 h-8 rounded-xl border-2 border-card">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-black">
                          {duel.challengerName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="w-8 h-8 rounded-xl border-2 border-card">
                        <AvatarFallback className="bg-red-500/20 text-red-500 text-xs font-black">
                          {duel.challengedName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <p className="text-sm font-black">{duel.challengerName} vs {duel.challengedName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-blue-500/20 text-blue-600 text-[8px] font-black uppercase">{duel.subject}</Badge>
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Sparkles className="w-3 h-3" />
                          <span className="text-[9px] font-black">+{duel.xpReward} XP</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="h-8 px-3 rounded-lg font-black text-[9px] bg-primary"
                  >
                    <Target className="w-3 h-3 mr-1" /> Battle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completed Duels */}
      {completedDuels.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Trophy className="w-3 h-3" /> Battle History
          </p>
          {completedDuels.slice(0, 3).map(duel => (
            <Card key={duel.id} className="bg-muted/20 border-transparent rounded-2xl overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      duel.winnerId === user?.uid ? "bg-emerald-500/20" : "bg-rose-500/20"
                    )}>
                      {duel.winnerId === user?.uid ? (
                        <Crown className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <X className="w-5 h-5 text-rose-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-black">{duel.challengerName} vs {duel.challengedName}</p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase">
                        {duel.challengerScore}% - {duel.challengedScore}%
                      </p>
                    </div>
                  </div>
                  {duel.winnerId === user?.uid && (
                    <Badge className="bg-emerald-500/20 text-emerald-600 text-[8px] font-black uppercase">Victory</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {duels.length === 0 && (
        <Card className="p-8 text-center border-2 border-dashed border-border/50 rounded-2xl bg-muted/5">
          <Swords className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <h4 className="font-black text-foreground mb-1">No Active Duels</h4>
          <p className="text-xs text-muted-foreground font-medium">Challenge friends to 1v1 battles!</p>
        </Card>
      )}

      {/* Create Duel Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-w-[400px] overflow-hidden outline-none">
          <DialogHeader className="p-6 pb-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl">
                <Swords className="w-8 h-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-xl font-black text-center">Challenge a Friend</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Select a subject and challenge your peer to a duel
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Subject</p>
              <div className="grid grid-cols-2 gap-2">
                {subjects.map(subject => (
                  <Button
                    key={subject}
                    variant={selectedSubject === subject ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSubject(subject)}
                    className={cn(
                      "h-10 rounded-xl font-black text-[9px] uppercase",
                      selectedSubject === subject ? "bg-primary" : ""
                    )}
                  >
                    {subject}
                  </Button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-black text-yellow-700">Victory Reward</p>
                  <p className="text-[10px] text-yellow-600">+250 XP for the winner</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t bg-muted/20">
            <Button 
              onClick={() => setShowCreateDialog(false)}
              className="w-full h-12 rounded-xl font-black text-sm"
            >
              Select Friend from Peer Links
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FriendDuels;

