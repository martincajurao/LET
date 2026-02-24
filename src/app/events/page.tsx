'use client';

import React from 'react';
import { EventsSection } from '@/components/ui/EventsSection';
import { Leaderboard } from '@/components/ui/leaderboard';
import { Trophy, Globe, ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
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
          <div className="lg:col-span-8 space-y-8">
            <EventsSection />
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
