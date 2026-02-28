"use client"

import React, { useState, Suspense } from 'react';
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
  Bell
} from "lucide-react";

import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { SelfUpdate } from '@/components/self-update';
import { useTheme } from '@/hooks/use-theme';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion } from 'framer-motion';

function SettingsPageContent() {
  const { user, loading: userLoading, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isDark, toggleDarkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Handler for refreshing user data
  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      toast({ title: "Data Refreshed", description: "Latest data loaded successfully." });
    } catch (e) {
      toast({ variant: "destructive", title: "Refresh Failed", description: "Could not fetch latest data." });
    } finally {
      setRefreshing(false);
    }
  };

  // Handler for notifications toggle
  const handleNotificationsToggle = (checked: boolean) => {
    setNotificationsEnabled(checked);
    toast({ 
      title: checked ? "Notifications Enabled" : "Notifications Disabled", 
      description: checked ? "You will receive push notifications." : "Push notifications have been muted." 
    });
  };

  if (userLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <div className="min-h-screen flex flex-col items-center justify-center p-4"><Card className="p-10 text-center max-w-sm rounded-[2.5rem] android-surface border-none shadow-2xl"><Settings className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" /><h3 className="font-black text-xl mb-6">Authentication Required</h3><Link href="/"><Button className="w-full rounded-2xl h-14 font-black">Return Home</Button></Link></Card></div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-body">
      <Toaster />
      <div className="max-w-4xl mx-auto space-y-8 pb-24">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
          </Link>
          <Badge variant="outline" className="bg-card px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest">
            App Settings
          </Badge>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* App Updates Section */}
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-card">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Smartphone className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">App Updates</h3>
                  <p className="text-xs text-muted-foreground font-medium">Manage native Android client updates</p>
                </div>
              </div>
              <SelfUpdate />
            </CardContent>
          </Card>

          {/* Appearance Section */}
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-card">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                  {isDark ? <Moon className="w-7 h-7 text-primary" /> : <Sun className="w-7 h-7 text-primary" />}
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">Appearance</h3>
                  <p className="text-xs text-muted-foreground font-medium">Customize the app look and feel</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                <div className="flex items-center gap-3">
                  {isDark ? (
                    <Moon className="w-5 h-5 text-primary" />
                  ) : (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  )}
                  <div>
                    <p className="font-bold text-foreground">Dark Mode</p>
                    <p className="text-[10px] font-medium text-muted-foreground">
                      {isDark ? 'Currently using dark theme' : 'Currently using light theme'}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleDarkMode}
                  className="h-10 rounded-xl font-bold gap-2"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {isDark ? 'Light' : 'Dark'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Section */}
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-card">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Bell className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">Notifications</h3>
                  <p className="text-xs text-muted-foreground font-medium">Manage notification preferences</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-bold text-foreground">Push Notifications</p>
                    <p className="text-[10px] font-medium text-muted-foreground">
                      Receive updates about tasks and achievements
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={notificationsEnabled} 
                  onCheckedChange={handleNotificationsToggle}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Management Section */}
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-card">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <RefreshCw className={`w-7 h-7 text-primary ${refreshing && "animate-spin"}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Data Sync</h3>
                    <p className="text-xs text-muted-foreground font-medium">Refresh your latest progress</p>
                  </div>
                </div>
                <Button 
                  onClick={handleRefreshData} 
                  disabled={refreshing}
                  variant="outline" 
                  className="h-12 rounded-2xl font-bold gap-2"
                >
                  {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {refreshing ? "Syncing..." : "Sync Now"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function SettingsPageWithParams() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <SettingsPageContent />
    </Suspense>
  );
}

export default SettingsPageWithParams;
