
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search, 
  Trophy, 
  Flame, 
  Zap, 
  Star, 
  ChevronRight, 
  Loader2, 
  MessageSquare,
  ShieldCheck,
  Award,
  Globe,
  Compass,
  ArrowUpRight,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { getRankData, getCareerRankTitle } from '@/lib/xp-system';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface ActivityFeedItem {
  id: string;
  userId: string;
  displayName: string;
  overallScore: number;
  timestamp: number;
  subject?: string;
}

export default function CommunityPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentActivity, setRecentActivity] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [topEducators, setTopEducators] = useState<any[]>([]);

  // Fetch recent activity from exam_results
  useEffect(() => {
    if (!firestore) return;
    
    const activityQuery = query(
      collection(firestore, "exam_results"),
      orderBy("timestamp", "desc"),
      limit(10)
    );

    const unsub = onSnapshot(activityQuery, (snap) => {
      const items = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActivityFeedItem));
      setRecentActivity(items);
      setLoading(false);
    });

    return () => unsub();
  }, [firestore]);

  // Fetch top teachers (simulated ranking)
  useEffect(() => {
    if (!firestore) return;
    
    const topQuery = query(
      collection(firestore, "users"),
      orderBy("xp", "desc"),
      limit(5)
    );

    const unsub = onSnapshot(topQuery, (snap) => {
      const items = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTopEducators(items);
    });

    return () => unsub();
  }, [firestore]);

  const filteredActivity = useMemo(() => {
    if (!searchQuery) return recentActivity;
    return recentActivity.filter(item => 
      item.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [recentActivity, searchQuery]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-32">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
                <Globe className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-foreground">Intelligence Network</h1>
            </div>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] ml-1">Connect with Aspiring Teachers Nationwide</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-40" />
            <Input 
              placeholder="Search by nickname..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 pl-11 rounded-2xl border-2 bg-card shadow-sm focus:border-primary transition-all font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Top Tier Educators */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground px-2 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Elite Vanguard
            </h3>
            
            <div className="space-y-3">
              {topEducators.map((edu, idx) => {
                const rankInfo = getRankData(edu.xp || 0);
                return (
                  <motion.div
                    key={edu.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="android-surface border-none shadow-md3-1 rounded-2xl overflow-hidden group">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="relative">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center font-black text-white shadow-lg",
                            idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-orange-500" : "bg-primary/20 text-primary"
                          )}>
                            {idx < 3 ? <Award className="w-6 h-6" /> : idx + 1}
                          </div>
                          {edu.isPro && <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 shadow-sm border border-card"><Zap className="w-2.5 h-2.5 text-yellow-900 fill-current" /></div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-sm text-foreground truncate">{edu.displayName || 'Teacher'}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{rankInfo.title}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-primary">Rank {rankInfo.rank}</p>
                          <div className="flex items-center justify-end gap-1">
                            <Flame className="w-3 h-3 text-orange-500 fill-current" />
                            <span className="text-[10px] font-black">{edu.streakCount || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <Card className="border-none shadow-xl rounded-[2.5rem] bg-foreground text-background p-8 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700"><Users className="w-24 h-24" /></div>
              <div className="relative z-10 space-y-4">
                <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase tracking-widest">Coming Soon</Badge>
                <h3 className="text-xl font-black leading-tight">Form a Study Squad</h3>
                <p className="text-xs font-medium opacity-70">Soon you'll be able to join forces with friends to conquer Raid Simulations and earn group multipliers.</p>
                <Button variant="outline" className="w-full rounded-xl border-primary/20 text-primary font-black text-[10px] uppercase tracking-widest h-10 hover:bg-primary/10" disabled>
                  Join Waiting List
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column: Live Activity Feed */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary" />
                Live Performance Trace
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Live Sync</span>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 bg-card rounded-[3rem] border-2 border-dashed border-border/50">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Calibrating Network...</p>
              </div>
            ) : filteredActivity.length === 0 ? (
              <div className="text-center py-24 bg-card rounded-[3rem] border shadow-inner">
                <Globe className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-bold">No activity found matching your search.</p>
              </div>
            ) : (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-4"
              >
                {filteredActivity.map((activity, idx) => (
                  <motion.div key={activity.id} variants={itemVariants}>
                    <Card className="android-surface border-none shadow-md3-1 rounded-[2rem] bg-card hover:shadow-xl transition-all duration-300 group overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/20 group-hover:bg-primary transition-colors" />
                      <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center font-black text-primary text-xl shadow-inner group-hover:scale-110 transition-transform">
                            {activity.displayName?.charAt(0) || 'T'}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-lg text-foreground">{activity.displayName || 'Teacher'}</p>
                              <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary bg-primary/5">Verified Trace</Badge>
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                              <Star className="w-3 h-3" /> 
                              Resolved simulation • {formatDistanceToNow(activity.timestamp)} ago
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">Board Rating</p>
                            <div className={cn(
                              "text-2xl font-black tracking-tighter tabular-nums leading-none",
                              activity.overallScore >= 75 ? "text-emerald-600" : "text-orange-600"
                            )}>
                              {activity.overallScore}%
                            </div>
                          </div>
                          <div className="h-10 w-[1px] bg-border mx-2" />
                          <button className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-primary hover:text-primary-foreground active:scale-90 transition-all">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Global Stats Footer */}
        <div className="pt-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-[1px] w-16 bg-border" />
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
              <TrendingUp className="w-4 h-4 text-primary" />
            </motion.div>
            <div className="h-[1px] w-16 bg-border" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-40">15K+ Teachers Calibrating Nationally</p>
        </div>
      </div>
    </div>
  );
}
