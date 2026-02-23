'use client';

import React, { useState } from 'react';
import { useUser, useFirestore } from '@/firebase/index';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from 'next/link';
import { Coins, GraduationCap, ChevronDown, User, History, LogOut, Settings, Zap, Play, Loader2, CheckCircle2 } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function Navbar() {
  const { user, logout, loginWithGoogle } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [showAdModal, setShowAdModal] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  const handleWatchAd = async () => {
    if (!user || !firestore) return;
    setWatchingAd(true);
    // Simulate Ad viewing
    setTimeout(async () => {
      try {
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, {
          credits: increment(3),
          dailyAdCount: increment(1)
        });
        toast({ title: "Ad Complete", description: "You earned +3 AI Credits!" });
        setShowAdModal(false);
      } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Failed to grant reward." });
      } finally {
        setWatchingAd(false);
      }
    }, 3000);
  };

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white border-b sticky top-0 z-[100] shadow-sm">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-xl font-black tracking-tighter text-slate-900 flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          <span className="hidden md:inline">LET's Prep</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {!user ? (
          <Link href="/">
            <Button variant="outline" className="font-bold rounded-xl">Sign In</Button>
          </Link>
        ) : (
          <>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-2xl border cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setShowAdModal(true)}>
              <Coins className="w-4 h-4 text-yellow-500 fill-current" />
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-800 leading-none">{user.credits ?? 0}</span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Credits</span>
              </div>
            </div>

            {!user.isPro && (
              <Button size="sm" variant="outline" className="hidden md:flex border-primary text-primary font-black rounded-xl gap-2 hover:bg-primary/5" onClick={() => setShowProModal(true)}>
                <Zap className="w-3 h-3 fill-current" /> GO PRO
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-slate-50 transition-all outline-none">
                  <Avatar className="w-10 h-10 border-2 border-white shadow-md">
                    {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />}
                    <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">
                      {user.displayName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mt-2 rounded-2xl border-none shadow-2xl" align="end">
                <DropdownMenuLabel className="font-black text-xs uppercase tracking-widest text-slate-400 p-4 pb-2">Account</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl"><User className="w-4 h-4 text-primary" /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile?tab=history" className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl"><History className="w-4 h-4 text-emerald-500" /> History</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="mx-2" />
                <DropdownMenuItem onClick={logout} className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl text-destructive hover:text-destructive"><LogOut className="w-4 h-4" /> Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <Dialog open={showAdModal} onOpenChange={setShowAdModal}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="font-black">Earn AI Credits</DialogTitle>
            <DialogDescription>Watch a short promotional video to earn +3 credits for AI explanations.</DialogDescription>
          </DialogHeader>
          <div className="py-8 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed">
            <Play className="w-12 h-12 text-primary opacity-40 mb-4" />
            <p className="text-xs font-bold text-slate-400">Daily limit: {user?.dailyAdCount || 0} / 5 ads</p>
          </div>
          <DialogFooter>
            <Button className="w-full font-black rounded-xl h-12" onClick={handleWatchAd} disabled={watchingAd || (user?.dailyAdCount || 0) >= 5}>
              {watchingAd ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {watchingAd ? "Streaming Ad..." : "Watch and Earn +3 Credits"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showProModal} onOpenChange={setShowProModal}>
        <DialogContent className="rounded-[2.5rem] max-w-md">
          <DialogHeader className="pt-8">
            <DialogTitle className="text-center text-3xl font-black">Go Professional</DialogTitle>
            <DialogDescription className="text-center">Unlock the full power of AI for your board preparation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-6">
            {[
              "Unlimited AI explanations",
              "Instant performance analytics",
              "No promotional ads",
              "Priority AI access",
              "Special Profile badge"
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-3 bg-primary/5 rounded-xl border border-primary/10">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold text-slate-700">{benefit}</span>
              </div>
            ))}
          </div>
          <DialogFooter className="pb-8">
            <Button className="w-full h-14 rounded-2xl font-black text-lg bg-primary hover:bg-primary/90 text-slate-900 shadow-xl shadow-primary/20">
              Upgrade to Pro — $9.99/mo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </nav>
  );
}
