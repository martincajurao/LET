'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Zap, Clock, Users, Loader2, Crown, Star, Lock, Play, ExternalLink, Sparkles } from "lucide-react";
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from '@/firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';

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

interface EventCompetitionProps {
  onJoinEvent?: (event: Event) => void;
}

export function EventCompetition({ onJoinEvent }: EventCompetitionProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const ARENA_ENTRY_FEE = 20;

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        const data = await response.json();
        setEvents(data.events || []);
      } catch (e) {
        console.error('Failed to fetch events:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const formatTimeLeft = (endTime: number) => {
    const diff = endTime - Date.now();
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const handleJoinEvent = async (event: Event) => {
    if (!user || !firestore) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please sign in to join the arena.",
      });
      return;
    }

    const isPro = user.isPro;
    if (!isPro && (user.credits || 0) < ARENA_ENTRY_FEE) {
      toast({
        variant: "destructive",
        title: "Insufficient Credits",
        description: `Arena entry requires ${ARENA_ENTRY_FEE} AI Credits. Watch an ad to refill!`,
      });
      return;
    }

    setJoining(event.id);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          eventId: event.id,
          action: 'join'
        }),
      });

      if (response.ok) {
        if (!isPro) {
          const userRef = doc(firestore, 'users', user.uid);
          await updateDoc(userRef, {
            credits: increment(-ARENA_ENTRY_FEE)
          });
          toast({
            title: "Credits Deducted",
            description: `Spent ${ARENA_ENTRY_FEE} AI Credits for Arena entry.`,
          });
        } else {
          toast({
            title: "Pro Entry Granted",
            description: "Platinum users join the arena for free!",
          });
        }

        if (onJoinEvent) {
          onJoinEvent(event);
        }
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Could not join event.",
      });
    } finally {
      setJoining(null);
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'weekly':
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 'daily':
        return <Flame className="w-5 h-5 text-orange-500" />;
      case 'monthly':
        return <Crown className="w-5 h-5 text-purple-500" />;
      default:
        return <Star className="w-5 h-5 text-primary" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'weekly':
        return 'bg-yellow-50 border-yellow-200';
      case 'daily':
        return 'bg-orange-50 border-orange-200';
      case 'monthly':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-primary/5 border-primary/10';
    }
  };

  if (loading) {
    return (
      <Card className="border-none shadow-lg rounded-2xl bg-white overflow-hidden">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="border-none shadow-lg rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 p-4 md:p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <CardTitle className="text-lg font-black tracking-tight">Competitions</CardTitle>
              <CardDescription className="text-xs">Earn rewards in events</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium text-sm">No active competitions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg rounded-2xl bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/50 p-4 md:p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <CardTitle className="text-lg font-black tracking-tight">Competitions</CardTitle>
              <CardDescription className="text-xs">Time-limited events</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-yellow-500/5 px-3 py-1.5 rounded-xl border border-yellow-500/10 w-fit">
             <Sparkles className="w-3.5 h-3.5 text-yellow-600 fill-current" />
             <span className="text-xs font-black text-yellow-700">{user?.credits || 0} AI Credits</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {events.map((event) => {
            const eventType = event.title.toLowerCase().includes('weekly') ? 'weekly' : 
                            event.title.toLowerCase().includes('daily') ? 'daily' : 
                            event.title.toLowerCase().includes('monthly') ? 'monthly' : 'special';
            
            return (
              <div key={event.id} className={cn(
                "p-4 rounded-2xl border-2 transition-all flex flex-col gap-3",
                getEventTypeColor(eventType)
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm border flex items-center justify-center shrink-0">
                      {getEventTypeIcon(eventType)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{event.title}</p>
                      <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider truncate">{event.category}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white text-[9px] shrink-0">
                    <Clock className="w-2.5 h-2.5 mr-1" />
                    {formatTimeLeft(event.endTime)}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {event.questionCount}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-emerald-600" />
                    <span className="font-bold">+{event.rewardAmount} Reward</span>
                  </div>
                </div>

                <Button 
                  onClick={() => handleJoinEvent(event)}
                  disabled={joining === event.id}
                  className="w-full h-10 text-xs font-black gap-1.5"
                  size="sm"
                  variant={user?.isPro ? "default" : "outline"}
                >
                  {joining === event.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : user?.isPro ? (
                    <>
                      <Crown className="w-3.5 h-3.5" />
                      Free Entry
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-yellow-600" />
                      Enter (20c)
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {!user?.isPro && (
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">Platinum = Unlimited Arena Entry!</span>
              <Button variant="ghost" size="sm" className="text-primary font-black text-xs h-8">
                Upgrade <Crown className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
