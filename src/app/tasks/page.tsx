'use client';

import React from 'react';
import { DailyTaskDashboard } from '@/components/ui/daily-task-dashboard';
import { ReferralSystem } from '@/components/ui/referral-system';
import { ShieldCheck, Target, ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TasksPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground hover:text-primary">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Button>
          </Link>
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Daily Mission</h1>
          <p className="text-muted-foreground font-medium">Complete academic tasks to earn AI pedagogical credits.</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <DailyTaskDashboard />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ReferralSystem />
            
            <Card className="border-none shadow-lg rounded-[2.5rem] bg-foreground text-background p-8 flex flex-col justify-between">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-primary" /> Why Tasks?
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <p className="text-sm font-medium leading-relaxed opacity-80">
                  Daily practice builds the muscle memory required for the 150-item board exam.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    <span className="text-xs font-bold uppercase tracking-widest">Earn Credits for AI Tutor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-secondary rounded-full" />
                    <span className="text-xs font-bold uppercase tracking-widest">Maintain Your Streak</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    <span className="text-xs font-bold uppercase tracking-widest">Build Board Readiness</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
