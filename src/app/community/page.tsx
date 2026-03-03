
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, onSnapshot, where, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Search, 
  Trophy, 
  Flame, 
  Zap, 
  Star, 
  ChevronRight, 
  Loader2, 
  ShieldCheck,
  Award,
  Globe,
  Compass,
  TrendingUp,
  Plus,
  Hash,
  Share2,
  CheckCircle2,
  Sword,
  Target
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { getRankData } from '@/lib/xp-system';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { SquadHub } from '@/components/ui/squad-hub';

interface ActivityFeedItem {
  id: string;
  userId: string;
  displayName: string;
  overallScore: number;
  timestamp: number;
  subject?: string;
}

export default function CommunityPage() {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentActivity, setRecentActivity] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [topTeachers, setTopTeachers] = useState<any[]>([]);

  // Fetch recent activity
  useEffect(() => {
    if (!firestore) return;
    const activityQuery = query(collection(firestore, "exam_results"), orderBy("timestamp", "desc"), limit(10));
    const unsub = onSnapshot(activityQuery, (snap) => {
      setRecentActivity(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityFeedItem)));
      setLoading(false);
    });
    return () => unsub();
  }, [firestore]);

  // Fetch top teachers
  useEffect(() => {
    if (!firestore) return;
    const topQuery = query(collection(firestore, "users"), orderBy("xp", "desc"), limit(5));
    const unsub = onSnapshot(topQuery, (snap) => {
      setTopTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [firestore]);

  const filteredActivity = useMemo(() => {
    if (!searchQuery) return recentActivity;
    return recentActivity.filter(item => item.displayName?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [recentActivity, searchQuery]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-32">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
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
              placeholder="Search teachers or recruitment keys..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 pl-11 rounded-2xl border-2 bg-card shadow-sm focus:border-primary transition-all font-bold"
            />
          </div>
        </header>

        <Tabs defaultValue="feed" className="space-y-8">
          <TabsList className="bg-muted/30 p-1.5 rounded-[2rem] h-16 w-full max-w-md mx-auto grid grid-cols-2 border border-border/50">
            <TabsTrigger value="feed" className="rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg gap-2">
              <Activity className="w-4 h-4" /> Global Feed
            </TabsTrigger>
            <TabsTrigger value="squad" className="rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg gap-2">
              <Users className="w-4 h-4" /> Study Squad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Top Teachers */}
              <div className="lg:col-span-4 space-y-6">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground px-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Elite Vanguard
                </h3>
                <div className="space-y-3">
                  {topTeachers.map((edu, idx) => {
                    const rankInfo = getRankData(edu.xp || 0);
                    return (
                      <Card key={edu.id} className="android-surface border-none shadow-md3-1 rounded-2xl overflow-hidden group">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center font-black text-white shadow-lg",
                            idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-orange-500" : "bg-primary/20 text-primary"
                          )}>
                            {idx < 3 ? <Award className="w-6 h-6" /> : idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-sm text-foreground truncate">{edu.displayName || 'Teacher'}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{rankInfo.title}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-primary">Rank {rankInfo.rank}</p>
                            <div className="flex items-center justify-end gap-1 text-orange-500">
                              <Flame className="w-3 h-3 fill-current" />
                              <span className="text-[10px] font-black">{edu.streakCount || 0}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Feed */}
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
                  <div className="grid grid-cols-1 gap-4">
                    {filteredActivity.map((activity) => (
                      <Card key={activity.id} className="android-surface border-none shadow-md3-1 rounded-[2rem] bg-card hover:shadow-xl transition-all duration-300 group overflow-hidden">
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
                                <Star className="w-3 h-3" /> Resolved simulation • {formatDistanceToNow(activity.timestamp)} ago
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">Board Rating</p>
                              <div className={cn("text-2xl font-black tracking-tighter tabular-nums leading-none", activity.overallScore >= 75 ? "text-emerald-600" : "text-orange-600")}>
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
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="squad" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SquadHub />
          </TabsContent>
        </Tabs>

        {/* Global Stats Footer */}
        <footer className="pt-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-[1px] w-16 bg-border" />
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
              <TrendingUp className="w-4 h-4 text-primary" />
            </motion.div>
            <div className="h-[1px] w-16 bg-border" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-40">Connecting 15K+ Aspiring Teachers</p>
        </footer>
      </div>
    </div>
  );
}
