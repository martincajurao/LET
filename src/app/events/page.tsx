'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { EventsSection } from '@/components/ui/EventsSection';
import { Leaderboard } from '@/components/ui/leaderboard';
import { WeeklyTournament } from '@/components/ui/weekly-tournament';
import { 
  Trophy, 
  Globe, 
  ArrowLeft, 
  Users, 
  Medal, 
  Timer, 
  Building2, 
  ChevronRight, 
  Loader2,
  Sparkles,
  MapPin,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from "@/components/ui/card";

interface ActivityFeedItem {
  id: string;
  userId: string;
  displayName: string;
  overallScore: number;
  timestamp: number;
  subject?: string;
  locationRegion?: string;
  locationCity?: string;
  timeSpent?: number;
}

export default function EventsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [worldRecords, setWorldRecords] = useState<ActivityFeedItem[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // Fetch World Records (Top 1 in categories) from live Firestore traces
  useEffect(() => {
    if (!firestore) return;
    setLoadingRecords(true);
    
    const categories = ['all', 'General Education', 'Professional Education', 'Specialization'];
    const recordDocs: ActivityFeedItem[] = [];
    let completedQueries = 0;

    categories.forEach(cat => {
      const recordQuery = query(
        collection(firestore, "exam_results"),
        where("subject", "==", cat),
        orderBy("overallScore", "desc"),
        orderBy("timestamp", "asc"),
        limit(1)
      );

      const unsub = onSnapshot(recordQuery, (snap) => {
        if (!snap.empty) {
          const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as ActivityFeedItem;
          const existingIdx = recordDocs.findIndex(r => r.subject === data.subject);
          if (existingIdx !== -1) recordDocs[existingIdx] = data;
          else recordDocs.push(data);
        }
        
        completedQueries++;
        if (completedQueries >= categories.length) {
          setWorldRecords([...recordDocs].sort((a, b) => b.overallScore - a.overallScore));
          setLoadingRecords(false);
        }
      }, (err) => {
        console.warn(`Record sync for ${cat} failed:`, err);
        completedQueries++;
        if (completedQueries >= categories.length) setLoadingRecords(false);
      });
    });
  }, [firestore]);

  const formatTime = (seconds?: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-32 font-body">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 font-black text-muted-foreground uppercase tracking-widest text-[10px] hover:text-primary">
              <ArrowLeft className="w-4 h-4" /> Hub
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest bg-emerald-500/5 text-emerald-600 border-emerald-500/20 px-3 h-7">Arena Status: Operational</Badge>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
              <Globe className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-foreground">Global Arena</h1>
          </div>
          <p className="text-muted-foreground font-medium md:text-xl ml-1 opacity-80">Compete with educators nationwide and claim legendary records.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-16">
            <EventsSection />

            {/* Hall of Fame / World Records Section */}
            <div className="space-y-8 pt-12 border-t border-border/50">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center border-2 border-yellow-500/20 shadow-lg">
                      <Trophy className="w-6 h-6 text-yellow-600" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tighter">Intelligence Records</h2>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-60 ml-1">The Absolute Global Vanguard</p>
                </div>
                <div className="flex items-center gap-2 bg-muted/20 px-4 py-2 rounded-xl border border-border/50">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Live Sync Enabled</span>
                </div>
              </div>

              {loadingRecords ? (
                <div className="flex flex-col items-center justify-center py-32 bg-card rounded-[3rem] border-2 border-dashed border-border/50 shadow-inner">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Synchronizing Global Records...</p>
                </div>
              ) : worldRecords.length === 0 ? (
                <div className="text-center py-24 bg-muted/5 rounded-[3rem] border-2 border-dashed border-border/50">
                  <Trophy className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">No records established in the vault.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {worldRecords.map((record) => (
                    <Card key={record.id} className="android-surface border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-yellow-500/10 via-card to-card border-2 border-yellow-500/20 overflow-hidden group">
                      <CardContent className="p-8 relative">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                          <Medal className="w-24 h-24 text-yellow-600" />
                        </div>
                        
                        <div className="flex items-start justify-between mb-8 relative z-10">
                          <div className="space-y-1">
                            <Badge className="bg-yellow-500 text-yellow-900 font-black text-[8px] uppercase tracking-widest rounded-lg px-3 mb-2 border-none shadow-md">World Record Trace</Badge>
                            <h3 className="text-2xl font-black tracking-tighter leading-tight">{record.subject === 'all' ? 'Full Board Simulation' : record.subject}</h3>
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-muted-foreground tracking-widest opacity-60">
                              <MapPin className="w-3 h-3" />
                              {record.locationRegion || 'Global Sector'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-4xl font-black text-yellow-600 tracking-tighter tabular-nums">{record.overallScore}%</div>
                            <span className="text-[8px] font-black uppercase text-muted-foreground opacity-40 tracking-widest">Precision Rating</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-5 p-5 bg-card rounded-[2.25rem] border-2 border-yellow-500/10 shadow-sm relative z-10 transition-all hover:bg-muted/5">
                          <div className="w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center font-black text-yellow-700 text-xl shadow-inner group-hover:scale-110 transition-transform">
                            {record.displayName?.charAt(0) || '🎓'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-lg text-foreground truncate">{record.displayName}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <Badge variant="outline" className="h-5 px-2 bg-emerald-500/5 border-emerald-500/20 text-[8px] font-black uppercase text-emerald-600">
                                <Building2 className="w-2.5 h-2.5 mr-1" /> {record.locationCity || 'International'}
                              </Badge>
                              <div className="flex items-center gap-1 text-[8px] font-black text-muted-foreground opacity-60 uppercase">
                                <Timer className="w-2.5 h-2.5" />
                                {formatTime(record.timeSpent)}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-yellow-500/10 hover:text-yellow-600 active:scale-90">
                            <ChevronRight className="w-5 h-5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="sticky top-24 space-y-8">
              {/* Weekly Championship with LIVE Badge */}
              <div>
                <div className="flex items-center gap-2 mb-3 px-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Live Event</span>
                </div>
                <WeeklyTournament 
                  currentUserId={user?.uid}
                  currentUserScore={0}
                  onJoinTournament={() => {
                    // Handled within component
                  }}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2 px-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shadow-inner">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-black uppercase tracking-[0.2em] text-xs text-foreground">Top Rankers</h3>
                </div>
                <Leaderboard />
              </div>

              <Card className="android-surface border-none shadow-xl rounded-[2.5rem] bg-foreground text-background p-8 relative overflow-hidden group active:scale-[0.98] transition-all">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-700" />
                <div className="relative z-10 space-y-6">
                  <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center shadow-inner">
                    <Sparkles className="w-6 h-6 text-primary fill-current animate-sparkle" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black tracking-tight leading-none text-white">Legendary Path</h3>
                    <p className="text-xs font-medium text-white/60 leading-relaxed uppercase tracking-tight">World records award exclusive 1,000 XP bonuses upon established trace.</p>
                  </div>
                  <div className="h-[1px] w-full bg-white/10" />
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Prestige Economy Active</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

