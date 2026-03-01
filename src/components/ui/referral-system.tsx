'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Share2, Users, Copy, CheckCircle2, Gift, Star, Loader2, Sparkles, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

export function ReferralSystem() {
  const { user, updateProfile } = useUser();
  const [referralCode, setReferralCode] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const { toast } = useToast();

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

  const milestones = [
    { count: 5, reward: '+50 AI Credits', icon: <Gift className="w-5 h-5" /> },
    { count: 10, reward: 'Silver Tier Yield', icon: <Trophy className="w-5 h-5" /> },
    { count: 25, reward: '+500 Legacy Credits', icon: <Sparkles className="w-5 h-5" /> }
  ];

  if (!user) return null;

  return (
    <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden transition-all duration-500 border border-border/50">
      <CardHeader className="bg-muted/30 p-10 border-b relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Users className="w-32 h-32" /></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
            <Users className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tight">Referral Boost</CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60">Scale the educator base together.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-10 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-5">
            <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-primary ml-1">Professional Invite Link</Label>
            <div className="flex gap-3">
              <div className="flex-1 bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl h-16 flex items-center justify-center font-black text-2xl tracking-widest text-primary shadow-inner">
                {referralCode || "------"}
              </div>
              <Button onClick={handleCopyCode} disabled={isCopying} variant="outline" className="h-16 w-16 rounded-2xl border-2 border-border/50 bg-card active:scale-90 transition-all">
                {isCopying ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Copy className="w-6 h-6" />}
              </Button>
            </div>
            <div className="p-4 bg-yellow-500/5 rounded-2xl border border-yellow-500/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-yellow-600 animate-sparkle" />
              </div>
              <p className="text-[10px] font-bold uppercase text-yellow-700 leading-snug tracking-wider">Referrer: <span className="font-black text-sm">+15c</span> <br />New Educator: <span className="font-black text-sm">+5c</span></p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-accent/5 rounded-[2rem] p-8 border-2 border-accent/10 flex flex-col items-center justify-center text-center space-y-2 group hover:bg-accent/10 transition-colors">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-foreground opacity-60">Network Size</span>
              <span className="text-5xl font-black text-foreground tracking-tighter group-hover:scale-110 transition-transform">{user?.referralCount || 0}</span>
            </div>
            <div className="bg-primary/5 rounded-[2rem] p-8 border-2 border-primary/10 flex flex-col items-center justify-center text-center space-y-2 group hover:bg-primary/10 transition-colors">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-60">Credit Yield</span>
              <span className="text-5xl font-black text-primary tracking-tighter group-hover:scale-110 transition-transform">{user?.referralCreditsEarned || 0}</span>
            </div>
          </div>
        </div>
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3"><Star className="w-6 h-6 text-yellow-500 fill-current animate-sparkle" /><h4 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Growth Roadmap</h4></div>
            <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20">Bonus Tracks</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {milestones.map((m, idx) => {
              const isAchieved = (user?.referralCount || 0) >= m.count;
              return (
                <div key={idx} className={cn(
                  "p-6 rounded-2xl border-2 flex items-center gap-5 transition-all relative overflow-hidden",
                  isAchieved ? "bg-accent/10 border-accent/20 shadow-xl" : "bg-muted/10 border-border/50 opacity-60"
                )}>
                  <div className="w-12 h-12 rounded-xl bg-card shadow-sm border border-border/50 flex items-center justify-center shrink-0">{m.icon}</div>
                  <div><p className="text-[9px] font-black uppercase text-muted-foreground leading-none mb-1.5">{m.count} Educators</p><p className="text-sm font-black text-foreground leading-tight">{m.reward}</p></div>
                  {isAchieved && <div className="absolute top-2 right-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="pt-4 flex justify-center"><Button variant="default" size="lg" className="gap-3 font-black h-16 px-16 rounded-2xl shadow-2xl shadow-primary/30 active:scale-95 transition-all text-lg"><Share2 className="w-6 h-6" /> Share Professional Invite</Button></div>
      </CardContent>
    </Card>
  );
}
