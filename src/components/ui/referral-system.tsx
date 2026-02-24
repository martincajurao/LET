'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Share2, Users, Coins, Copy, CheckCircle2, Gift, Star, Loader2 } from "lucide-react";
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
    { count: 5, reward: '+20 Credits', icon: <Gift className="w-4 h-4" /> },
    { count: 10, reward: '3-Day Pro', icon: <Star className="w-4 h-4" /> },
    { count: 25, reward: '+100 Credits', icon: <Coins className="w-4 h-4" /> }
  ];

  if (!user) return null;

  return (
    <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden transition-colors duration-300">
      <CardHeader className="bg-muted/30 p-8 border-b">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center">
            <Users className="w-8 h-8 text-accent-foreground" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black tracking-tight">Referral Dashboard</CardTitle>
            <CardDescription className="text-muted-foreground">Invite colleagues and earn AI credits together.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Your Unique Invite Code</Label>
            <div className="flex gap-2">
              <div className="flex-1 bg-muted/20 border-2 border-dashed rounded-2xl h-16 flex items-center justify-center font-black text-2xl tracking-widest text-foreground">
                {referralCode || "------"}
              </div>
              <Button onClick={handleCopyCode} disabled={isCopying} variant="outline" className="h-16 w-16 rounded-2xl border-2 border-border bg-card">
                {isCopying ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Copy className="w-6 h-6" />}
              </Button>
            </div>
            <p className="text-[10px] font-medium text-muted-foreground italic">Referrer gets +10 Credits. New user gets +5 Credits after first simulation.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-accent/10 rounded-3xl p-6 border border-accent/20 flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-accent-foreground">Total Referrals</span>
              <span className="text-3xl font-black text-foreground">{user?.referralCount || 0}</span>
            </div>
            <div className="bg-primary/10 rounded-3xl p-6 border border-primary/20 flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Credits Earned</span>
              <span className="text-3xl font-black text-primary">{user?.referralCreditsEarned || 0}</span>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500" /><h4 className="text-sm font-black uppercase tracking-widest text-foreground">Growth Milestones</h4></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {milestones.map((m, idx) => {
              const isAchieved = (user?.referralCount || 0) >= m.count;
              return (
                <div key={idx} className={cn(
                  "p-6 rounded-2xl border-2 flex items-center gap-4 transition-all",
                  isAchieved ? "bg-accent/10 border-accent/20" : "bg-muted/10 border-border opacity-60"
                )}>
                  <div className="w-10 h-10 rounded-xl bg-card shadow-sm border flex items-center justify-center shrink-0">{m.icon}</div>
                  <div><p className="text-[10px] font-black uppercase text-muted-foreground leading-none mb-1">{m.count} Referrals</p><p className="text-sm font-black text-foreground">{m.reward}</p></div>
                  {isAchieved && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />}
                </div>
              );
            })}
          </div>
        </div>
        <div className="pt-4 flex justify-center"><Button variant="secondary" className="gap-2 font-black h-12 px-10 rounded-xl"><Share2 className="w-4 h-4" /> Share with Friends</Button></div>
      </CardContent>
    </Card>
  );
}