'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy,
  Flame,
  Zap,
  Timer,
  Users,
  Target,
  Swords,
  Crown,
  ShieldCheck,
  Clock,
  TrendingUp,
  ChevronRight,
  Activity,
  Star,
  Sparkles
} from "lucide-react";
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface ActiveCompetition {
  id: string;
  type: 'tournament' | 'squad-war' | 'ranked' | 'duel';
  title: string;
  description: string;
  reward: number;
  timeLeft?: string;
  participants?: number;
  status: 'live' | 'ending-soon' | 'upcoming';
  icon: React.ReactNode;
  color: string;
}

interface ActiveCompetitionsProps {
  onJoin?: (type: string) => void;
}

export function ActiveCompetitions({ onJoin }: ActiveCompetitionsProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [competitions, setCompetitions] = useState<ActiveCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [tournamentTimeLeft, setTournamentTimeLeft] = useState<string>('');

  // Simulated active competitions - in real app would come from Firestore
  useEffect(() => {
    // Calculate tournament time left (simulated - weekly reset)
    const now = new Date();
    const daysUntilSunday = 7 - now.getDay();
    const hoursLeft = (daysUntilSunday * 24) - now.getHours();
    
    if (hoursLeft > 0) {
      if (hoursLeft < 24) {
        setTournamentTimeLeft(`${hoursLeft}h remaining`);
      } else {
        setTournamentTimeLeft(`${Math.floor(hoursLeft / 24)}d ${hoursLeft % 24}h remaining`);
      }
    } else {
      setTournamentTimeLeft('Ending soon!');
    }

    // Set up active competitions
    const activeComps: ActiveCompetition[] = [
      {
        id: 'weekly-tournament',
        type: 'tournament',
        title: 'Weekly Championship',
        description: 'Compete for top rankings this week',
        reward: 500,
        timeLeft: tournamentTimeLeft,
        participants: 127,
        status: hoursLeft < 24 ? 'ending-soon' : 'live',
        icon: <Trophy className="w-6 h-6" />,
        color: 'from-yellow-500 to-orange-500'
      },
      {
        id: 'ranked-match',
        type: 'ranked',
        title: 'Ranked Arena',
        description: 'Test skills against similar ranks',
        reward: 300,
        participants: 45,
        status: 'live',
        icon: <Target className="w-6 h-6" />,
        color: 'from-blue-500 to-purple-500'
      },
      {
        id: 'squad-war',
        type: 'squad-war',
        title: 'Squad Wars',
        description: 'Squad vs Squad battle',
        reward: 500,
        participants: 8,
        status: 'live',
        icon: <Users className="w-6 h-6" />,
        color: 'from-red-500 to-pink-500'
      }
    ];

    setCompetitions(activeComps);
    setLoading(false);
  }, [tournamentTimeLeft]);

  const handleJoinCompetition = (competition: ActiveCompetition) => {
    onJoin?.(competition.type);
    
    switch (competition.type) {
      case 'tournament':
        router.push('/events');
        break;
      case 'ranked':
        router.push('/events');
        break;
      case 'squad-war':
        router.push('/events');
        break;
      default:
        router.push('/events');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-[8px] font-black uppercase">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
            LIVE NOW
          </Badge>
        );
      case 'ending-soon':
        return (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-[8px] font-black uppercase">
            <Clock className="w-3 h-3 mr-1" />
            ENDING SOON
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 text-[8px] font-black uppercase">
            UPCOMING
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-20 bg-muted rounded-xl"></div>
            <div className="h-20 bg-muted rounded-xl"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Active Competitions</h3>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Live Events & Challenges</p>
            </div>
          </div>
        </div>

        {/* Competition List */}
        <div className="space-y-3 px-6 pb-6">
          {competitions.map((comp, index) => (
            <motion.div
              key={comp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative overflow-hidden rounded-2xl border-2 transition-all cursor-pointer group",
                comp.status === 'live' ? "border-transparent" : 
                comp.status === 'ending-soon' ? "border-red-500/30 bg-red-500/5" :
                "border-border/50"
              )}
              onClick={() => handleJoinCompetition(comp)}
            >
              {/* Background Gradient */}
              <div className={cn(
                "absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20",
                "bg-gradient-to-r " + comp.color
              )} />

              <div className="relative p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shadow-md",
                      "bg-gradient-to-br " + comp.color,
                      "text-white"
                    )}>
                      {comp.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-sm">{comp.title}</h4>
                        {getStatusBadge(comp.status)}
                      </div>
                      <p className="text-[9px] text-muted-foreground font-medium">{comp.description}</p>
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {comp.timeLeft && (
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground uppercase">
                        <Clock className="w-3 h-3" />
                        {comp.timeLeft}
                      </div>
                    )}
                    {comp.participants && (
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground uppercase">
                        <Users className="w-3 h-3" />
                        {comp.participants} competing
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-yellow-500/10 px-3 py-1.5 rounded-full">
                      <Zap className="w-3 h-3 text-yellow-600 fill-current" />
                      <span className="text-[10px] font-black text-yellow-700">+{comp.reward} XP</span>
                    </div>
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <ChevronRight className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Indicator Line */}
              {comp.status === 'ending-soon' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />
              )}
            </motion.div>
          ))}
        </div>

        {/* View All Link */}
        <div className="px-6 pb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/events')}
            className="w-full h-10 rounded-xl font-black text-xs uppercase gap-2 text-muted-foreground hover:text-primary"
          >
            View All Competitions
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Mini version for dashboard
export function ActiveCompetitionsMini() {
  const router = useRouter();
  
  return (
    <div 
      className="cursor-pointer group"
      onClick={() => router.push('/events')}
    >
      <Card className="border-none shadow-lg rounded-2xl bg-gradient-to-r from-red-500/10 to-orange-500/10 overflow-hidden group-hover:shadow-xl transition-all">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-foreground">Weekly Championship</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-bold text-green-600 uppercase">Live Now</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </CardContent>
      </Card>
    </div>
  );
}

export default ActiveCompetitions;

