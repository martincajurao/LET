
'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { EventsSection } from '@/components/ui/EventsSection';
import { Leaderboard } from '@/components/ui/leaderboard';
import { 
  Trophy, 
  Globe, 
  ArrowLeft, 
  Users, 
  Crown, 
  Medal, 
  Timer, 
  Building2, 
  ChevronRight, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  const [worldRecords, setWorldRecords] = useState<ActivityFeedItem[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // Fetch World Records (Top 1 in categories)
  useEffect(() => {
    if (!firestore) return;
    setLoadingRecords(true);
    
    const categories = ['all', 'General Education', 'Professional Education', 'Specialization'];
    const records: ActivityFeedItem[] = [];
    let completedCount = 0;

    categories.forEach(cat => {
      const recordQuery = query(
        collection(firestore, "exam_results"),
        where("subject", "==", cat === 'all' ? 'all' : cat),
        orderBy("overallScore", "desc"),
        orderBy("timestamp", "asc"),
        limit(1)
      );

      const unsub = onSnapshot(recordQuery, (snap) => {
        if (!snap.empty) {
          const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as ActivityFeedItem;
          if (!records.find(r => r.id === data.id)) {
            records.push(data);
          }
        }
        completedCount++;
        if (completedCount === categories.length) {
          setWorldRecords([...records].sort((a, b) => b.overallScore - a.overallScore));
          setLoadingRecords(false);
        }
      }, (err) => {
        completedCount++;
        if (completedCount === categories.length) setLoadingRecords(false);
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
    <div className="min-h-screen bg-background p-4 md:p-8 pb-24">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground hover:text-primary">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest bg-card">Arena Status: Live</Badge>
            <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-black tracking-tight text-foreground">Global Arena</h1>
          </div>
          <p className="text-muted-foreground font-medium md:text-lg">Compete with educators nationwide and climb the professional rankings.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-12">
            <EventsSection />

            {/* Hall of Fame / World Records Section */}
            <div className="space-y-8 pt-8 border-t border-border/50">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-20 h-20 bg-yellow-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl border-4 border-yellow-500/20">
                  <Crown className="w-10 h-10 text-yellow-600 animate-victory" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tighter">Global Intelligence Records</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-60">Guinness-Standard Pedagogical Vault</p>
                </div>
              </div>

              {loadingRecords ? (
                <div className="flex flex-col items-center justify-center py-24 bg-card rounded-[3rem] border-2 border-dashed border-border/50">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Decrypting World Records...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {worldRecords.length === 0 ? (
                    <div className="col-span-full py-24 text-center">
                      <Trophy className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                      <p className="text-muted-foreground font-bold">No world records established yet.</p>
                    </div>
                  ) : (
                    worldRecords.map((record) => (
                      <Card key={record.id} className="android-surface border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-yellow-500/10 via-card to-card border-2 border-yellow-500/20 overflow-hidden group">
                        <CardContent className="p-8 relative">
                          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                            <Medal className="w-24 h-24 text-yellow-600" />
                          </div>
                          
                          <div className="flex items-start justify-between mb-8 relative z-10">
                            <div className="space-y-1">
                              <Badge className="bg-yellow-500 text-yellow-900 font-black text-[8px] uppercase tracking-widest rounded-lg px-3 mb-2 border-none">World Record</Badge>
                              <h3 className="text-2xl font-black tracking-tighter leading-none">{record.subject === 'all' ? 'The Perfect Simulation' : record.subject}</h3>
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Absolute Global Peak</p>
                            </div>
                            <div className="text-right">
                              <div className="text-4xl font-black text-yellow-600 tracking-tighter">{record.overallScore}%</div>
                              <span className="text-[8px] font-black uppercase text-muted-foreground opacity-40">Precision</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-5 p-5 bg-card rounded-[2rem] border-2 border-yellow-500/10 shadow-sm relative z-10">
                            <div className="w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center font-black text-yellow-700 text-xl shadow-inner">
                              {record.displayName?.charAt(0) || 'T'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-lg text-foreground truncate">{record.displayName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="h-5 px-2 bg-emerald-500/5 border-emerald-500/20 text-[8px] font-black uppercase text-emerald-600">
                                  <Building2 className="w-2.5 h-2.5 mr-1" /> {record.locationCity || 'International'}
                                </Badge>
                                <div className="flex items-center gap-1 text-[8px] font-black text-muted-foreground opacity-60 uppercase">
                                  <Timer className="w-2.5 h-2.5" />
                                  {formatTime(record.timeSpent)}
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-yellow-500/10 hover:text-yellow-600">
                              <ChevronRight className="w-5 h-5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-20">
              <div className="flex items-center gap-2 mb-4 px-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-black uppercase tracking-widest text-xs text-foreground">Top Rankers</h3>
              </div>
              <Leaderboard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
