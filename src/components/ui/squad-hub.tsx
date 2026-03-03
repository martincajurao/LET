
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Trophy, 
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
  X
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
}

export function SquadHub() {
  const { user, refreshUser, updateProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [squad, setSquad] = useState<Squad | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [newSquadName, setNewSquadName] = useState("");
  const [joinCode, setJoinCode] = useState("");

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
        createdAt: Date.now()
      };

      await setDoc(doc(firestore, 'squads', squadId), squadData);
      await updateDoc(doc(firestore, 'users', user.uid), { squadId });
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
      const snap = await onSnapshot(q, async (snapshot) => {
        if (snapshot.empty) {
          toast({ variant: "destructive", title: "Trace Not Found", description: "Invalid recruitment code." });
          setIsJoining(false);
          return;
        }
        const squadDoc = snapshot.docs[0];
        const squadId = squadDoc.id;
        await updateDoc(doc(firestore, 'squads', squadId), { memberCount: increment(1), totalXp: increment(user.xp || 0) });
        await updateDoc(doc(firestore, 'users', user.uid), { squadId });
        await refreshUser();
        toast({ variant: "reward", title: "Guild Joined!", description: "You have been recruited to the squad." });
        setIsJoining(false);
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Recruitment Failed", description: "Could not verify invite code." });
      setIsJoining(false);
    }
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
              <h3 className="text-3xl font-black tracking-tighter leading-none">Found a Guild</h3>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">Establish a new study squad and invite fellow aspiring teachers to climb the professional ranks together.</p>
            </div>
            <div className="space-y-3">
              <Input 
                placeholder="Guild Name (e.g. Logic Masters)" 
                value={newSquadName}
                onChange={(e) => setNewSquadName(e.target.value)}
                className="h-14 rounded-2xl border-2 font-bold px-6 focus:border-primary transition-all"
              />
              <Button 
                onClick={handleCreateSquad} 
                disabled={isCreating || !newSquadName.trim()}
                className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-xl shadow-primary/30"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Found Squad
              </Button>
            </div>
          </div>
        </Card>

        <Card className="android-surface border-none shadow-xl rounded-[2.5rem] p-10 flex flex-col justify-between bg-foreground text-background group overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700"><Hash className="w-32 h-32" /></div>
          <div className="space-y-6 relative z-10">
            <div className="w-16 h-16 bg-primary/20 rounded-[1.5rem] flex items-center justify-center shadow-inner"><Target className="w-8 h-8 text-primary" /></div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black tracking-tighter leading-none">Enlist in Guild</h3>
              <p className="text-sm text-white/60 font-medium leading-relaxed">Have a colleague's recruitment key? Enter it below to join their active professional trace.</p>
            </div>
            <div className="space-y-3">
              <Input 
                placeholder="Enter Invite Code" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="h-14 rounded-2xl border-2 border-white/10 bg-white/5 text-white font-black tracking-widest text-center text-lg focus:border-primary transition-all"
              />
              <Button 
                onClick={handleJoinSquad} 
                disabled={isJoining || !joinCode.trim()}
                className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-xl bg-primary text-primary-foreground"
              >
                {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                Sync Recruitment
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const squadLevelProgress = (squad.totalXp % 10000) / 10;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card className="border-none shadow-2xl rounded-[3rem] bg-card overflow-hidden border border-border/50">
        <CardHeader className="bg-primary/5 p-8 md:p-12 border-b flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-primary rounded-[2rem] flex items-center justify-center shadow-2xl shadow-primary/30 relative">
              <Users className="w-10 h-10 text-primary-foreground" />
              <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-4 border-card shadow-lg">
                {squad.level}
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-4xl font-black tracking-tighter text-foreground leading-none">{squad.name}</h2>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-card border-border font-black text-[9px] uppercase tracking-widest px-3 py-1">Guild ID: {squad.inviteCode}</Badge>
                <button onClick={() => { navigator.clipboard.writeText(squad.inviteCode); toast({ title: "Code Copied", description: "Invite your squad-mates!" }); }} className="text-primary hover:text-primary/80 transition-colors p-1"><Share2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:items-end gap-2 min-w-[200px]">
            <div className="flex justify-between w-full text-[9px] font-black uppercase tracking-widest text-primary">
              <span>Guild Power</span>
              <span>Level {squad.level}</span>
            </div>
            <div className="w-full bg-primary/10 h-2.5 rounded-full overflow-hidden shadow-inner border border-primary/5">
              <motion.div initial={{ width: 0 }} animate={{ width: `${squadLevelProgress}%` }} className="h-full bg-primary" />
            </div>
            <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">{squad.totalXp.toLocaleString()} Total XP Contributed</p>
          </div>
        </CardHeader>
        <CardContent className="p-8 md:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 space-y-8">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                  <Sword className="w-4 h-4 text-primary" />
                  Active Roster ({members.length}/10)
                </h3>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[8px] uppercase">Synced</Badge>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {members.map((member) => {
                  const mRank = getRankData(member.xp || 0);
                  return (
                    <motion.div key={member.id} whileHover={{ x: 4 }} className="android-surface p-4 rounded-2xl flex items-center justify-between bg-card border-border/50 group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center font-black text-primary border border-primary/10 shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                          {member.displayName?.charAt(0) || 'T'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-black text-sm text-foreground truncate">{member.displayName || 'Teacher'}</p>
                            {member.uid === squad.creatorId && <Badge className="bg-yellow-500/10 text-yellow-700 border-none text-[7px] font-black uppercase rounded-sm px-1.5 h-4">Leader</Badge>}
                          </div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate">{mRank.title} • Rank {mRank.rank}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1 text-orange-500">
                            <Flame className="w-3 h-3 fill-current" />
                            <span className="text-[10px] font-black">{member.streakCount || 0}</span>
                          </div>
                          <p className="text-[7px] font-black uppercase text-muted-foreground opacity-40">Saga Streak</p>
                        </div>
                        <div className="h-8 w-[1px] bg-border mx-1" />
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-sm">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
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
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center shadow-inner"><Zap className="w-5 h-5 text-primary fill-current" /></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Collective Quest</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black leading-none">Intelligence Raid</h3>
                    <p className="text-xs font-medium text-white/60 leading-relaxed uppercase tracking-tight">Complete 100 Combined Board Items Today</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase text-white/40">
                      <span>Group Calibration</span>
                      <span className="text-white">42%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                      <motion.div initial={{ width: 0 }} animate={{ width: '42%' }} className="h-full bg-primary shadow-[0_0_15px_hsla(var(--primary),0.5)]" />
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-white/40">Victory Reward</span>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-yellow-400 fill-current animate-sparkle" />
                      <span className="text-sm font-black text-white">+50c Each</span>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="p-6 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/20 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-inner"><Info className="w-5 h-5 text-primary" /></div>
                  <h4 className="font-black text-sm uppercase tracking-tight">Guild Sovereignty</h4>
                </div>
                <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                  Squad XP is calculated as the sum of all members' professional traces. Guild Level multipliers provide passive XP buffs to all active members during simulations.
                </p>
                <div className="pt-2 border-t border-primary/10">
                  <button onClick={async () => { if (!user || !firestore) return; await updateDoc(doc(firestore, 'users', user.uid), { squadId: null }); await refreshUser(); toast({ title: "Exited Guild", description: "You have abandoned your current squad." }); }} className="text-[9px] font-black uppercase tracking-[0.3em] text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-2">
                    <X className="w-3 h-3" /> Abandon Trace
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
