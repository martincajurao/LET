'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Share2, 
  Users, 
  Copy, 
  CheckCircle2, 
  Gift, 
  Star, 
  Loader2, 
  Sparkles, 
  Trophy, 
  ChevronRight, 
  UserPlus, 
  ShieldCheck,
  Zap,
  Ticket
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { REFERRAL_REWARDS } from '@/lib/xp-system';

export function ReferralSystem() {
  const { user, updateProfile, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [referralCode, setReferralCode] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    if (user && !user.referralCode) {
      const newReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      updateProfile({ referralCode: newReferralCode });
      setReferralCode(newReferralCode);
    } else if (user) {
      setReferralCode(user.referralCode!);
    }
  }, [user, updateProfile]);

  const handleCopyCode = () => {
    if (isCopying) return;
    setIsCopying(true);
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast({ title: "Code Copied", description: "Share this code with your colleagues!" });
    }
    setTimeout(() => setIsCopying(false), 2000);
  };

  const handleRedeemCode = async () => {
    if (!inviteCodeInput.trim() || !user || !firestore || isRedeeming) return;
    if (inviteCodeInput.toUpperCase() === user.referralCode) {
      toast({ variant: "destructive", title: "Logic Loop", description: "You cannot recruit yourself." });
      return;
    }

    setIsRedeeming(true);
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('referralCode', '==', inviteCodeInput.toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ variant: "destructive", title: "Invalid Trace", description: "This invitation code does not exist in the vault." });
        setIsRedeeming(false);
        return;
      }

      const referrerDoc = querySnapshot.docs[0];
      const referrerId = referrerDoc.id;

      // Update Referrer
      await updateDoc(doc(firestore, 'users', referrerId), {
        referralCount: increment(1),
        credits: increment(REFERRAL_REWARDS.REFERRER_CREDITS),
        referralCreditsEarned: increment(REFERRAL_REWARDS.REFERRER_CREDITS)
      });

      // Update Current User (Referee)
      await updateDoc(doc(firestore, 'users', user.uid), {
        referredBy: referrerId,
        credits: increment(REFERRAL_REWARDS.REFEREE_CREDITS)
      });

      toast({ 
        variant: "reward", 
        title: "Starting Buff Active!", 
        description: `Invitation verified. +${REFERRAL_REWARDS.REFEREE_CREDITS} Credits added to your vault.` 
      });
      
      setInviteCodeInput("");
      await refreshUser();
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Could not process invitation trace." });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "LET's Prep Guild Invitation",
      text: `Join my professional guild on LET's Prep! Use my recruitment code: ${referralCode} to get +5 Starting Credits for AI analysis.`,
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        handleCopyCode();
      }
    } catch (e) {
      console.log('Share failed', e);
    }
  };

  const milestones = [
    { count: 5, reward: `+${REFERRAL_REWARDS.MILESTONE_5} Bonus`, label: 'Squad Leader', icon: <UserPlus className="w-5 h-5" /> },
    { count: 10, reward: `+${REFERRAL_REWARDS.MILESTONE_10} Bonus`, label: 'Guild Mentor', icon: <Trophy className="w-5 h-5" /> },
    { count: 25, reward: `+${REFERRAL_REWARDS.MILESTONE_25} Bonus`, label: 'Master Recruiter', icon: <Crown className="w-5 h-5" /> }
  ];

  if (!user) return null;

  return (
    <Card className="android-surface border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden transition-all duration-500 border border-border/50">
      <CardHeader className="bg-muted/30 p-8 border-b relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Users className="w-32 h-32" /></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
            <Users className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black tracking-tight">Recruitment Hub</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expand your professional guild</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Section 1: Your Invitation Stats */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary ml-1">Your Recruitment Key</Label>
              <div className="flex gap-2">
                <div className="flex-1 bg-primary/5 border-2 border-dashed border-primary/30 rounded-2xl h-14 flex items-center justify-center font-black text-xl tracking-widest text-primary shadow-inner">
                  {referralCode || "------"}
                </div>
                <Button onClick={handleCopyCode} disabled={isCopying} variant="outline" className="h-14 w-14 rounded-2xl border-2 active:scale-90 transition-all">
                  {isCopying ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Copy className="w-6 h-6" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-2xl p-4 border border-border/50 text-center space-y-1">
                <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Recruits</span>
                <p className="text-2xl font-black text-foreground">{user?.referralCount || 0}</p>
              </div>
              <div className="bg-yellow-500/5 rounded-2xl p-4 border border-yellow-500/10 text-center space-y-1">
                <span className="text-[8px] font-black uppercase text-yellow-700 tracking-widest">Loot Yield</span>
                <div className="flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-600 animate-sparkle" />
                  <p className="text-2xl font-black text-yellow-700">{user?.referralCreditsEarned || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Redeem invitation */}
          <div className="space-y-6">
            {!user.referredBy ? (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary ml-1">Redeem Guild Invite</Label>
                <div className="space-y-3">
                  <div className="relative">
                    <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-40" />
                    <Input 
                      placeholder="ENTER CODE" 
                      value={inviteCodeInput}
                      onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                      className="h-14 pl-11 rounded-2xl border-2 font-black text-base tracking-widest bg-muted/10 focus:bg-card transition-all"
                    />
                  </div>
                  <Button 
                    onClick={handleRedeemCode}
                    disabled={isRedeeming || !inviteCodeInput.trim()}
                    className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg active:scale-95 transition-all"
                  >
                    {isRedeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Claim Apprentice Pack
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 bg-emerald-500/5 rounded-[2rem] border-2 border-dashed border-emerald-500/20 text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Apprentice Pack Active</p>
                <p className="text-xs font-medium text-muted-foreground">You have been successfully recruited to the guild.</p>
              </div>
            )}
          </div>
        </div>

        {/* Milestone Roadmap */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary fill-current" />
              Recruitment Roadmap
            </h4>
            <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 bg-primary/5 text-primary px-3 py-1">Guild Progression</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {milestones.map((m, idx) => {
              const isAchieved = (user?.referralCount || 0) >= m.count;
              return (
                <div key={idx} className={cn(
                  "p-5 rounded-2xl border-2 transition-all relative overflow-hidden group",
                  isAchieved ? "bg-card border-emerald-500/30 shadow-lg" : "bg-muted/10 border-border/50 opacity-60"
                )}>
                  {isAchieved && <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:rotate-12 transition-transform"><Sparkles className="w-10 h-10 text-emerald-500" /></div>}
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-colors",
                      isAchieved ? "bg-emerald-500 text-white" : "bg-background text-muted-foreground"
                    )}>{isAchieved ? <CheckCircle2 className="w-5 h-5" /> : m.icon}</div>
                    <div className="min-w-0">
                      <p className={cn("text-[9px] font-black uppercase tracking-wider leading-none mb-1", isAchieved ? "text-emerald-600" : "text-muted-foreground")}>{m.label}</p>
                      <p className="text-xs font-bold text-foreground truncate">{m.count} Recruits: {m.reward}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4 flex flex-col items-center gap-4">
          <Button 
            onClick={handleShare}
            className="w-full sm:w-auto h-16 px-12 rounded-[1.75rem] font-black text-base uppercase tracking-widest gap-3 shadow-2xl shadow-primary/30 active:scale-95 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Share2 className="w-6 h-6" />
            Launch Recruitment Drive
          </Button>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Earn +15 credits for every colleague who starts their journey</p>
        </div>
      </CardContent>
    </Card>
  );
}
