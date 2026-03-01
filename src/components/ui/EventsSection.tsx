'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, Users, Timer, Sparkles, ChevronRight, Loader2 } from "lucide-react";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface Event {
  id: string;
  title: string;
  category: string;
  questionCount: number;
  startTime: number;
  endTime: number;
  rewardType: string;
  rewardAmount: number;
  isActive: boolean;
}

export function EventsSection() {
  const firestore = useFirestore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const eventsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "events"), 
      where("isActive", "==", true), 
      limit(3)
    );
  }, [firestore]);

  useEffect(() => {
    if (!eventsQuery) return;

    const unsub = onSnapshot(
      eventsQuery, 
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Event));
        setEvents(list);
        setLoading(false);
      },
      async (error) => {
        const permissionError = new FirestorePermissionError({
          path: 'events',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [eventsQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">Active Competitions</h2>
        </div>
        <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest bg-card border-border">Global Arena</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center gap-4 bg-card rounded-[2.5rem] border-2 border-dashed border-border">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase text-muted-foreground">Opening Arena...</p>
          </div>
        ) : events.length === 0 ? (
          <Card className="col-span-full border-none shadow-sm rounded-[2.5rem] bg-card p-12 text-center transition-colors duration-300">
            <Timer className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-black text-foreground">No Active Events</h3>
            <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">Check back later for Weekly Challenges.</p>
          </Card>
        ) : (
          events.map(event => (
            <Card key={event.id} className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden flex flex-col group hover:shadow-2xl transition-all hover:-translate-y-1 border border-border/50">
              <CardHeader className="p-8 pb-4">
                <div className="flex justify-between items-start mb-4">
                  <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-3">{event.category}</Badge>
                  <div className="flex items-center gap-1.5 text-orange-500 font-black text-[9px] uppercase">
                    <Clock className="w-3 h-3" /> Ends Soon
                  </div>
                </div>
                <CardTitle className="text-xl font-black leading-tight group-hover:text-primary transition-colors text-foreground">{event.title}</CardTitle>
                <CardDescription className="text-xs font-medium text-muted-foreground">{event.questionCount} Items • Professional Ranking</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0 flex-grow">
                <div className="p-4 bg-muted/20 rounded-2xl flex items-center justify-between border border-border/50">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-yellow-500 animate-sparkle" />
                    <span className="text-xs font-black uppercase text-muted-foreground">Reward</span>
                  </div>
                  <span className="text-sm font-black text-emerald-600">+{event.rewardAmount} {event.rewardType}</span>
                </div>
              </CardContent>
              <CardFooter className="p-8 pt-0">
                <Button className="w-full h-12 rounded-xl font-black gap-2 shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform bg-primary text-primary-foreground">
                  Enter Challenge <ChevronRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}