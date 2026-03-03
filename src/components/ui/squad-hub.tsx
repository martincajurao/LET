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
  increment, 
  writeBatch,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Zap, 
  Loader2, 
  ShieldCheck,
  Plus,
  Hash,
  Share2,
  CheckCircle2,
  Sword,
  Target,
  ChevronRight,
  Sparkles,
  Flame,
  X,
  Info,
  UserPlus,
  UserMinus,
  LogOut,
  Trash2,
  Crown
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getRankData } from '@/lib/xp-system';

interface Squad {
  id: string;
  name: string;
  inviteCode: string;
  creatorId: string;
  memberCount: number;
  totalXp: number;
  level: number;
  description: string;
  isActive?: boolean;
}

export function SquadHub() {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [squad, setSquad] = useState<Squad | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [newSquadName, setNewSquadName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const isLeader = useMemo(() => user?.uid === squad?.creatorId, [user?.uid, squad?.creatorId]);

  useEffect(() => {
    if (!user?.squadId || !firestore) {
      setLoading(false);
      setSquad(null);
      return;
    }

    const squadRef = doc(firestore, 'squads', user.squadId);
    const unsubSquad = onSnapshot(squadRef, (snap) => {
      if (snap.exists()) {
        setSquad({ id: snap.id, ...snap.data() } as Squad);
      } else {
        setSquad(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Squad sync error:", err);
      setLoading(false);
    });

    const membersQuery = query(collection(firestore, "users"), where("squadId", "==", user.squadId));
    const unsubMembers = onSnapshot(membersQuery, (snap) => {
      setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubSquad();
      unsubMembers();
    };
  }, [user?.squadId, firestore]);

  const handleCreateSquad = async () => {
    if (!newSquadName.trim() || !user || !firestore) return;
    setIsCreating(true);
    try {
      const squadId = crypto.randomUUID();
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const squadData = {
        name: newSquadName,
        inviteCode,
        creatorId: user.uid,
        memberCount: 1,
        totalXp: user.xp || 0,
        level: 1,
        description: `Professional guild founded by ${user.displayName}`,
        createdAt: Date.now(),
        isActive: true
      };

      const batch = writeBatch(firestore);
      batch.set(doc(firestore, 'squads', squadId), squadData);
      batch.update(doc(firestore, 'users', user.uid), { squadId });
      
      await batch.commit();
      await refreshUser();
      toast({ variant: "reward", title: "Guild Founded!", description: `${newSquadName} is now active in the network.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Foundation Failed", description: "Could not sync guild metadata." });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSquad = async () => {
    if (!joinCode.trim() || !user || !firestore) return;
    setIsJoining(true);
    try {
      const squadsRef = collection(firestore, 'squads');
      const q = query(squadsRef, where('inviteCode', '==', joinCode.toUpperCase()));
      
      const unsub = onSnapshot(q, async (s) => {
        unsub();
        if (s.empty) {
          toast({ variant: "destructive", title: "Trace Not Found", description: "Invalid recruitment code." });
          setIsJoining(false);
          return;
        }
        
        const squadDoc = s.docs[0];
        const squadId = squadDoc.id;
        const squadData = squadDoc.data();

        if (!squadData.isActive) {
          toast({ variant: "destructive", title: "Guild Inactive", description: "This squad has been disbanded." });
          setIsJoining(false);
          return;
        }

        if (squadData.memberCount >= 10) {
          toast({ variant: "destructive", title: "Guild Full", description: "This squad has reached the roster limit." });
          setIsJoining(false);
          return;
        }

        const batch = writeBatch(firestore);
        batch.update(doc(firestore, 'squads', squadId), { 
          memberCount: increment(1), 
          totalXp: increment(user.xp || 0) 
        });
        batch.update(doc(firestore, 'users', user.uid), { squadId });
        
        await batch.commit();
        await refreshUser();
        toast({ variant: "reward", title: "Enlistment Success!", description: `You have joined ${squadData.name}.` });
        setIsJoining(false);
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Recruitment Failed", description: "Could not verify code." });
      setIsJoining(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!squad || !firestore || !isLeader || isActionLoading) return;
    setIsActionLoading(memberId);
    try {
      const batch = writeBatch(firestore);
      batch.update(doc(firestore, 'users', memberId), { squadId: null });
      batch.update(doc(firestore, 'squads', squad.id), { memberCount: increment(-1) });
      
      await batch.commit();
      toast({ title: "Roster Updated", description: `${memberName} has been purged from the guild.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Action Failed", description: "Could not update guild roster." });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleLeaveSquad = async () => {
    if (!user || !squad || !firestore || isActionLoading) return;
    setIsActionLoading('leaving');
    try {
      const batch = writeBatch(firestore);
      batch.update(doc(firestore, 'users', user.uid), { squadId: null });
      batch.update(doc(firestore, 'squads', squad.id), { memberCount: increment(-1) });
      
      await batch.commit();
      await refreshUser();
      toast({ title: "Trace Abandoned", description: `You have left ${squad.name}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Exit Failed", description: "Could not sync leave request." });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleDisbandSquad = async () => {
    if (!squad || !firestore || !isLeader || isActionLoading) return;
    setIsActionLoading('disbanding');
    try {
      const batch = writeBatch(firestore);
      members.forEach(m => {
        batch.update(doc(firestore, 'users', m.id), { squadId: null });
      });
      batch.update(doc(firestore, 'squads', squad.id), { memberCount: 0, isActive: false });
      await batch.commit();
      await refreshUser();
      toast({ title: "Guild Disbanded", description: "The squad has been formally dissolved." });
    } catch (e) {
      toast({ variant: "destructive", title: "Disband Failed", description: "Could not dissolve guild." });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleShareInvite = async () => {
    if (!squad) return;
    const inviteText = `Join my Study Squad on LET's Prep! Recruitment Key: ${squad.inviteCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Study Squad: ${squad.name}`, text: inviteText, url: window.location.origin + '/community' });
      } else {
        await navigator.clipboard.writeText(squad.inviteCode);
        toast({ title: "Key Secured!", description: "Recruitment key copied to clipboard." });
      }
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-card rounded-[3rem] border-2 border-dashed border-border/50">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Syncing Guild Metadata...</p>
      </div>
    );
  }

  if (!squad) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
        <Card className="android-surface border-none shadow-xl rounded-[2.5rem] p-10 flex flex-col justify-between bg-card group overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform duration-700"><Sword className="w-32 h-32" /></div>
          <div className="space-y-6 relative z-10">
            <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center shadow-inner"><Plus className="w-8 h-8 text-primary" /></div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black tracking-tighter leading-none text-foreground">Found a Guild</h3>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">Establish a new study squad and invite fellow aspirants to climb the ranks together.</p>
            </div>
            <div className="space-y-3">
              <Input placeholder="Guild Name" value={newSquadName} onChange={(e) => setNewSquadName(e.target.value)} className="h-14 rounded-2xl border-2 font-bold px-6 focus:border-primary transition-all" />
              <Button onClick={handleCreateSquad} disabled={isCreating || !newSquadName.trim()} className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-xl">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Found Squad
              </Button>
            </div>
          </div>
        </Card>
        <Card className="android-surface border-none shadow-xl rounded-[2.5rem] p-10 flex flex-col justify-between bg-foreground text-background group overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700"><Hash className="w-32 h-32" /></div>
          <div className="space-y-6 relative z-10">
            <div className="w-16 h-16 bg-primary/20 rounded-[1.5rem] flex items-center justify-center shadow-inner"><Target className="w-8 h-8 text-primary" /></div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black tracking-tighter leading-none text-white">Enlist in Guild</h3>
              <p className="text-sm text-white/60 font-medium leading-relaxed">Have a recruitment key? Enter it below to join an active professional trace.</p>
            </div>
            <div className="space-y-3">
              <Input placeholder="Invite Code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} className="h-14 rounded-2xl border-2 border-white/10 bg-white/5 text-white font-black tracking-widest text-center text-lg focus:border-primary transition-all" />
              <Button onClick={handleJoinSquad} disabled={isJoining || !joinCode.trim()} className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-xl bg-primary text-primary-foreground">
                {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />} Enlist Now
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const squadLevelProgress = (squad.totalXp % 10000) / 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-body">
      <Card className="border-none shadow-2xl rounded-[3rem] bg-card overflow-hidden border border-border/50">
        <CardHeader className="bg-primary/5 p-8 md:p-12 border-b flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-primary rounded-[2rem] flex items-center justify-center shadow-2xl relative">
              <Users className="w-10 h-10 text-primary-foreground" />
              <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-4 border-card shadow-lg">{squad.level}</div>
            </div>
            <div className="space-y-1">
              <h2 className="text-4xl font-black tracking-tighter text-foreground leading-none">{squad.name}</h2>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-card border-border font-black text-[9px] uppercase tracking-widest px-3 py-1">Code: {squad.inviteCode}</Badge>
                <button onClick={handleShareInvite} className="text-primary hover:text-primary/80 transition-colors p-1"><Share2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:items-end gap-2 min-w-[200px]">
            <div className="flex justify-between w-full text-[9px] font-black uppercase tracking-widest text-primary"><span>Guild Power</span><span>Level {squad.level}</span></div>
            <div className="w-full bg-primary/10 h-2.5 rounded-full overflow-hidden shadow-inner border border-primary/5"><motion.div initial={{ width: 0 }} animate={{ width: `${squadLevelProgress}%` }} className="h-full bg-primary" /></div>
            <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">{squad.totalXp.toLocaleString()} Total XP Contributed</p>
          </div>
        </CardHeader>
        <CardContent className="p-8 md:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 space-y-8">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2"><Sword className="w-4 h-4 text-primary" /> Roster ({members.length}/10)</h3>
                <Button variant="outline" size="sm" onClick={handleShareInvite} className="rounded-xl font-black text-[9px] uppercase tracking-widest h-8 gap-2"><UserPlus className="w-3 h-3" /> Recruit</Button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {members.map((member) => {
                  const mRank = getRankData(member.xp || 0);
                  const isMemberLeader = member.id === squad.creatorId;
                  return (
                    <motion.div key={member.id} whileHover={{ x: 4 }} className="android-surface p-4 rounded-2xl flex items-center justify-between bg-card border-border/50 group">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12 rounded-xl shadow-inner group-hover:scale-105 transition-transform duration-500">
                          <AvatarImage src={member.photoURL || ""} />
                          <AvatarFallback className="bg-primary/5 text-primary text-xl font-black">🎓</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-black text-sm text-foreground truncate">{member.displayName || 'Teacher'}</p>
                            {isMemberLeader && <Badge className="bg-yellow-500/10 text-yellow-700 border-none text-[7px] font-black uppercase rounded-sm px-1.5 h-4">Leader</Badge>}
                          </div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate">{mRank.title} • Rank {mRank.rank}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {isLeader && !isMemberLeader ? (
                          <Button variant="ghost" size="icon" disabled={!!isActionLoading} onClick={() => handleRemoveMember(member.id, member.displayName)} className="w-10 h-10 rounded-xl text-rose-500 hover:bg-rose-500/10 active:scale-90">{isActionLoading === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-5 h-5" />}</Button>
                        ) : <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-sm"><CheckCircle2 className="w-4 h-4" /></div>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            <div className="lg:col-span-5 space-y-8">
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-foreground text-background p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700"><Target className="w-24 h-24" /></div>
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-2"><div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center shadow-inner"><Zap className="w-5 h-5 text-primary fill-current" /></div><span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Collective Quest</span></div>
                  <div className="space-y-2"><h3 className="text-2xl font-black leading-none text-white">Intelligence Raid</h3><p className="text-xs font-medium text-white/60 leading-relaxed uppercase tracking-tight">Complete 100 Combined Items Today</p></div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between"><span className="text-[10px] font-black uppercase text-white/40">Victory Reward</span><div className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-yellow-400 fill-current animate-sparkle" /><span className="text-sm font-black text-white">+50c Each</span></div></div>
                </div>
              </Card>
              <div className="p-6 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/20 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-inner"><Info className="w-5 h-5 text-primary" /></div>
                  <h4 className="font-black text-sm uppercase tracking-tight">Guild Sovereignty</h4>
                </div>
                <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">Guild Level multipliers provide passive XP buffs to all active members during professional simulations.</p>
                <div className="pt-2 border-t border-primary/10 flex gap-4">
                  {isLeader ? (
                    <button onClick={handleDisbandSquad} disabled={!!isActionLoading} className="text-[9px] font-black uppercase tracking-[0.3em] text-rose-500 hover:text-rose-600 flex items-center gap-2">
                      {isActionLoading === 'disbanding' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Disband Guild
                    </button>
                  ) : (
                    <button onClick={handleLeaveSquad} disabled={!!isActionLoading} className="text-[9px] font-black uppercase tracking-[0.3em] text-rose-500 hover:text-rose-600 flex items-center gap-2">
                      {isActionLoading === 'leaving' ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />} Abandon Trace
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
