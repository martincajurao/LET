'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase/index';
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy, Medal, Star, Users, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
  id: string;
  displayName: string;
  overallScore: number;
}

export function Leaderboard() {
  const firestore = useFirestore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!firestore) return;
      try {
        const q = query(collection(firestore, "exam_results"), orderBy("overallScore", "desc"), limit(10));
        const snap = await getDocs(q);
        const allResults = snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaderboardEntry));
        setLeaderboard(allResults);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [firestore]);

  const displayedLeaderboard = isExpanded ? leaderboard : leaderboard.slice(0, 3);

  return (
    <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden transition-colors duration-300">
      <CardHeader className="bg-muted/30 p-4 md:p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg md:text-xl font-black tracking-tight flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" /> Top Learners
            </CardTitle>
            <CardDescription className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground">Elite Rankings</CardDescription>
          </div>
          <Users className="w-6 h-6 text-muted-foreground/30" />
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Loading Arena...</p>
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="space-y-2 md:space-y-3">
            {displayedLeaderboard.map((entry, idx) => {
              const isTop3 = idx < 3;
              const medalStyles = [
                'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
                'text-slate-400 bg-slate-400/10 border-slate-400/20',
                'text-orange-500 bg-orange-500/10 border-orange-500/20'
              ];
              return (
                <div key={entry.id} className={cn(
                  "flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all hover:bg-muted/10",
                  isTop3 ? "shadow-sm border-primary/10" : "border-border"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-black text-sm border-2",
                      isTop3 ? medalStyles[idx] : "bg-muted/50 text-muted-foreground border-transparent"
                    )}>
                      {isTop3 ? <Medal className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-foreground truncate max-w-[100px] md:max-w-[150px]">{entry.displayName || 'Anonymous'}</span>
                      <span className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Educator</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base md:text-lg font-black text-primary leading-none">{entry.overallScore}%</span>
                    {idx === 0 && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                  </div>
                </div>
              );
            })}
            {leaderboard.length > 3 && (
              <Button variant="ghost" onClick={() => setIsExpanded(!isExpanded)} className="w-full mt-2 text-xs font-bold text-muted-foreground hover:text-primary">
                {isExpanded ? <>Show Less <ChevronUp className="w-4 h-4 ml-1" /></> : <>View All ({leaderboard.length}) <ChevronDown className="w-4 h-4 ml-1" /></>}
              </Button>
            )}
          </div>
        ) : (
          <div className="py-12 text-center space-y-4 bg-muted/10 rounded-2xl border-2 border-dashed">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No rankings yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}