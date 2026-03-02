"use client"

import React, { useState, Suspense, useEffect } from 'react';
import { useUser, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Settings, 
  Smartphone, 
  RefreshCw, 
  Loader2, 
  Check,
  Moon,
  Sun,
  Bell,
  Sparkles,
  Zap,
  ShieldCheck
} from "lucide-react";

import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { SelfUpdate } from '@/components/self-update';
import { useTheme } from '@/hooks/use-theme';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

function SettingsPageContent() {
  const { user, loading: userLoading, refreshUser } = useUser();
  const { toast } = useToast();
  const { isDark, toggleDarkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      toast({ title: "Data Re-synced", description: "Academic metadata updated from cloud." });
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Trace interruption detected." });
    } finally {
      setRefreshing(false);
    }
  };

  const handleNotificationsToggle = (checked: boolean) => {
    setNotificationsEnabled(checked);
    toast({ 
      title: checked ? "Alerts Active" : "Alerts Muted", 
      description: checked ? "Push notifications established." : "System alerts suspended." 
    });
  };

  if (userLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <div className="min-h-screen flex flex-col items-center justify-center p-4"><Card className="p-10 text-center max-w-sm rounded-[2.5rem] android-surface border-none shadow-2xl"><Settings className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" /><h3 className="font-black text-xl mb-6">Credentials Required</h3><Link href="/"><Button className="w-full rounded-2xl h-14 font-black">Secure Exit</Button></Link></Card></div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-body pt-safe">
      <Toaster />
      <div className="max-w-4xl mx-auto space-y-8 pb-32">
        <div className="flex items-center justify-between px-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 font-black text-muted-foreground uppercase tracking-widest text-[10px] hover:text-primary">
              <ArrowLeft className="w-4 h-4" /> Return to Hub
            </Button>
          </Link>
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-1.5 rounded-full border-2 border-primary/20 shadow-sm">
            <Smartphone className="w-3.5 h-3.5 text-primary" />
            <span className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">Android Client Config</span>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* App Maintenance Section */}
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-card border border-border/50">
            <CardHeader className="bg-muted/30 p-8 border-b">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <RefreshCw className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight">System Maintenance</CardTitle>
                  <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Manage updates and binary traces</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <SelfUpdate />
            </CardContent>
          </Card>

          {/* Interface Calibration */}
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-card border border-border/50">
            <CardHeader className="bg-muted/30 p-8 border-b">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center shadow-inner">
                  {isDark ? <Moon className="w-7 h-7 text-emerald-600" /> : <Sun className="w-7 h-7 text-yellow-500" />}
                </div>
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight">Visual Pacing</CardTitle>
                  <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Calibrate interface appearance</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between p-6 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/50">
                <div className="space-y-1">
                  <p className="font-black text-lg text-foreground leading-none">Dark Mode</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Adaptive high-contrast trace</p>
                </div>
                <Switch checked={isDark} onCheckedChange={toggleDarkMode} className="data-[state=checked]:bg-primary scale-125" />
              </div>

              <div className="flex items-center justify-between p-6 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/50">
                <div className="space-y-1">
                  <p className="font-black text-lg text-foreground leading-none">Push Notifications</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Real-time academic alerts</p>
                </div>
                <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationsToggle} className="data-[state=checked]:bg-emerald-500 scale-125" />
              </div>
            </CardContent>
          </Card>

          {/* Cloud Sync */}
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-foreground text-background">
            <CardContent className="p-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-primary/20 rounded-[1.75rem] flex items-center justify-center shadow-inner">
                    <RefreshCw className={cn("w-8 h-8 text-primary", refreshing && "animate-spin")} />
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-2xl font-black tracking-tight">Metadata Sync</h3>
                    <p className="text-xs font-medium opacity-60">Refresh academic progression from cloud vault</p>
                  </div>
                </div>
                <Button 
                  onClick={handleRefreshData} 
                  disabled={refreshing}
                  className="w-full sm:w-auto h-14 px-12 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary text-primary-foreground shadow-2xl shadow-primary/30 active:scale-95 transition-all gap-3"
                >
                  {refreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                  {refreshing ? "SYNCING..." : "COMMIT SYNC"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
