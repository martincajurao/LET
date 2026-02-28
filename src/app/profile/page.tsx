"use client"

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useUser, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MAJORSHIPS } from "@/app/lib/mock-data";
import {
  ArrowLeft,
  GraduationCap,
  Mail,
  History,
  Target,
  Trophy,
  Zap,
  Loader2,
  Settings,
  ShieldCheck,
  ClipboardList,
  RefreshCw,
  Check,
  ChevronRight
} from "lucide-react";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { getRankData } from '@/lib/xp-system';

interface ExamRecord {
  id: string;
  timestamp: number;
  overallScore: number;
  timeSpent: number;
  subjectBreakdown?: any[];
}

function ProfilePageContent() {
  const { user, loading: userLoading, updateProfile, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [majorship, setMajorship] = useState(user?.majorship || "");
  const [records, setRecords] = useState<ExamRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activeTab = searchParams.get('tab') || 'history';

  const rankData = useMemo(() => user ? getRankData(user.xp || 0) : null, [user?.xp]);

  useEffect(() => { if (user?.majorship) setMajorship(user.majorship); }, [user]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.uid || !firestore) return;
      try {
        const q = query(collection(firestore, "exam_results"), where("userId", "==", user.uid), orderBy("timestamp", "desc"), limit(20));
        const snap = await getDocs(q);
        setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamRecord)));
      } catch (e) { console.error(e); } finally { setLoadingRecords(false); }
    };
    fetchHistory();
  }, [user, firestore]);

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

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({ majorship });
      await refreshUser();
      toast({ title: "Profile Calibrated", description: "Your preferences have been saved." });
    } catch (e) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save preferences." });
    } finally {
      setSavingProfile(false);
    }
  };

  const stats = useMemo(() => ({
    total: records.length,
    avg: records.length > 0 ? Math.round(records.reduce((a, r) => a + r.overallScore, 0) / records.length) : 0,
    best: records.length > 0 ? Math.max(...records.map(r => r.overallScore)) : 0,
    readiness: Math.min(100, (records.length * 3) + (records.length > 0 ? Math.max(...records.map(r => r.overallScore)) : 0) / 1.5)
  }), [records]);

  const subjectMastery = useMemo(() => {
    const m: Record<string, { t: number, c: number }> = {};
    records.forEach(r => r.subjectBreakdown?.forEach((sb: any) => {
      if (!m[sb.subjectName]) m[sb.subjectName] = { t: 0, c: 0 };
      m[sb.subjectName].t += sb.totalQuestions; m[sb.subjectName].c += sb.correctAnswers;
    }));
    return Object.entries(m).map(([name, data]) => ({ name, score: Math.round((data.c / (data.t || 1)) * 100) }));
  }, [records]);

  if (userLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <div className="min-h-screen flex flex-col items-center justify-center p-4"><Card className="p-10 text-center max-w-sm rounded-[2.5rem] android-surface border-none shadow-2xl"><ShieldCheck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" /><h3 className="font-black text-xl mb-6">Authentication Required</h3><Link href="/"><Button className="w-full rounded-2xl h-14 font-black">Return Home</Button></Link></Card></div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-body">
      <Toaster />
      <div className="max-w-6xl mx-auto space-y-8 pb-24">
        <div className="flex items-center justify-between">
          <Link href="/"><Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground"><ArrowLeft className="w-4 h-4" /> Dashboard</Button></Link>
          <Badge variant="outline" className="bg-card px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest">{format(new Date(), 'EEEE, MMM do')}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8 border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-primary/20 via-primary/5 to-card" />
            <CardContent className="px-8 pb-8 -mt-16 relative">
              <div className="flex flex-col md:flex-row md:items-end gap-6 mb-8">
                <Avatar className="w-32 h-32 border-[6px] border-card shadow-xl rounded-[2.5rem]"><AvatarImage src={user.photoURL || ""} /><AvatarFallback className="text-4xl font-black bg-muted">{user.displayName?.charAt(0)}</AvatarFallback></Avatar>
                <div className="flex-1 space-y-2 mb-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight">{user.displayName}</h1>
                    {user.isPro && <div className="w-8 h-8 bg-yellow-400 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-400/20"><Trophy className="w-4 h-4 text-yellow-900" /></div>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="h-6 px-3 font-black text-[10px] border-primary/20 text-primary bg-primary/5 rounded-lg uppercase tracking-wider">
                      {rankData?.title} (Rank {rankData?.rank})
                    </Badge>
                    <p className="text-sm text-muted-foreground font-medium flex items-center gap-4">
                      <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 opacity-40" /> {user.email}</span>
                      <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 opacity-40" /> {user.majorship}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: <History className="w-4 h-4" />, label: 'Sessions', value: stats.total },
                  { icon: <Target className="w-4 h-4 text-primary" />, label: 'Avg Accuracy', value: `${stats.avg}%` },
                  { icon: <Trophy className="w-4 h-4 text-yellow-500" />, label: 'Best Track', value: `${stats.best}%` },
                  { icon: <Zap className="w-4 h-4 text-emerald-500" />, label: `Rank ${rankData?.rank || 1}`, value: `${rankData?.xpInRank || 0}/${rankData?.nextRankXp} XP` }
                ].map((stat, i) => (
                  <div key={i} className="p-4 bg-muted/20 rounded-2xl border border-border/50 text-center space-y-1">
                    <div className="flex justify-center mb-1">{stat.icon}</div>
                    <p className="text-sm font-black leading-none line-clamp-1">{stat.value}</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4 border-none shadow-xl rounded-[2.5rem] bg-foreground text-background flex flex-col items-center justify-center p-8 space-y-6">
            <div className="text-center"><h3 className="text-xl font-black tracking-tight mb-1">Board Readiness</h3><p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Verified Performance Projection</p></div>
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90"><circle cx="80" cy="80" r="70" className="stroke-white/10 fill-none" strokeWidth="10" /><circle cx="80" cy="80" r="70" className="stroke-primary fill-none transition-all duration-1000" strokeWidth="10" strokeDasharray={`${(stats.readiness / 100) * 440} 440`} strokeLinecap="round" /></svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-4xl font-black">{Math.round(stats.readiness)}%</span><span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-60">Ready</span></div>
            </div>
            <Button className="w-full h-12 rounded-2xl font-black bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">Analyze Weaknesses</Button>
          </Card>
        </div>

        <Tabs defaultValue={activeTab} className="space-y-6">
          <TabsList className="bg-muted/30 p-1 rounded-2xl w-full grid grid-cols-2 h-14">
            <TabsTrigger value="history" className="font-bold rounded-xl gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"><History className="w-4 h-4" /> Vault</TabsTrigger>
            <TabsTrigger value="settings" className="font-bold rounded-xl gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"><Settings className="w-4 h-4" /> Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-6 animate-in slide-in-from-bottom-4">
            {loadingRecords ? (
              <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-[2rem] border-2 border-dashed border-border/50"><Loader2 className="w-8 h-8 animate-spin text-primary mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Accessing Academic Records...</p></div>
            ) : records.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-[2rem] border shadow-inner"><ClipboardList className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" /><h3 className="text-xl font-black mb-2">Simulation Vault Empty</h3><p className="text-sm text-muted-foreground font-medium mb-8">Complete your first session to generate professional insights.</p><Link href="/"><Button className="rounded-2xl font-black h-14 px-10 shadow-lg shadow-primary/20">Launch Full Simulation</Button></Link></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {records.map((record, i) => (
                    <div key={record.id} className="android-surface p-6 rounded-[2rem] flex items-center justify-between border-none shadow-md hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-6">
                        <div className={cn("w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black", record.overallScore >= 75 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-600')}>
                          <span className="text-xl leading-none">{record.overallScore}%</span>
                          <span className="text-[7px] uppercase tracking-widest mt-1 opacity-60">Board</span>
                        </div>
                        <div><p className="font-black text-lg">Simulation Track #{(records.length - i).toString().padStart(3, '0')}</p><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{format(record.timestamp, 'MMMM d, yyyy')} • {Math.floor(record.timeSpent / 60)}m {record.timeSpent % 60}s</p></div>
                      </div>
                      <Badge variant="outline" className={cn("rounded-lg font-bold text-[9px] uppercase tracking-widest", record.overallScore >= 75 ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5' : 'border-orange-500/30 text-orange-600 bg-orange-500/5')}>{record.overallScore >= 75 ? 'Qualified' : 'Retake Required'}</Badge>
                    </div>
                  ))}
                </div>
                <div className="lg:col-span-1">
                  <Card className="border-none shadow-xl rounded-[2rem] bg-card p-8 space-y-6">
                    <div className="text-center space-y-1"><h3 className="text-lg font-black tracking-tight">Track Mastery</h3><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Aggregate Proficiency</p></div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectMastery} layout="vertical" margin={{ left: -20 }}>
                          <XAxis type="number" domain={[0, 100]} hide />
                          <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', fill: 'hsl(var(--muted-foreground))' }} />
                          <Bar dataKey="score" radius={[0, 10, 10, 0]} barSize={16}>{subjectMastery.map((e, idx) => (<Cell key={idx} fill={e.score >= 75 ? '#10b981' : '#a7d9ed'} />))}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 animate-in slide-in-from-bottom-4">
            <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-card">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <GraduationCap className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Academic Focus</h3>
                    <p className="text-xs text-muted-foreground font-medium">Calibrate your primary simulation specialization</p>
                  </div>
                </div>
                <div className="space-y-4 bg-muted/20 p-6 rounded-[2rem] border-2 border-dashed border-border/50">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Selected Specialization</Label>
                  <Select value={majorship} onValueChange={setMajorship}>
                    <SelectTrigger className="h-14 rounded-xl font-bold border-border shadow-sm text-lg px-6 bg-card">
                      <SelectValue placeholder="Select track" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl p-2">
                      {MAJORSHIPS.map(m => (
                        <SelectItem key={m} value={m} className="font-medium py-4 text-base px-6">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={savingProfile || majorship === user?.majorship}
                  className="w-full h-14 rounded-3xl font-black text-lg shadow-xl shadow-primary/30"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-card">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center">
                      <RefreshCw className={cn("w-7 h-7 text-muted-foreground", refreshing && "animate-spin")} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tight">Data Sync</h3>
                      <p className="text-xs text-muted-foreground font-medium">Refresh your character metadata from vault</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleRefreshData} disabled={refreshing} className="rounded-xl font-bold h-12 border-2 gap-2">
                    {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Sync Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ProfilePageWithParams() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <ProfilePageContent />
    </Suspense>
  );
}

export default ProfilePageWithParams;
