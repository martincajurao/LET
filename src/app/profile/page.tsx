"use client"

import React, { useState, useEffect, useMemo } from 'react';
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
  Save, 
  GraduationCap, 
  Mail, 
  History, 
  Sparkles, 
  Target, 
  TrendingUp,
  Clock,
  ClipboardList,
  Loader2,
  LogOut,
  Settings,
  ShieldCheck,
  Trophy,
  Coins,
  Zap,
  CalendarDays
} from "lucide-react";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { format } from 'date-fns';
import { PersonalizedPerformanceSummaryOutput } from "@/ai/flows/personalized-performance-summary-flow";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSearchParams } from 'next/navigation';
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getRankData } from '@/lib/xp-system';

interface ExamRecord {
  id: string;
  timestamp: number;
  overallScore: number;
  timeSpent: number;
  aiSummary?: PersonalizedPerformanceSummaryOutput;
  subjectBreakdown?: any[];
}

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'history';
  const { user, loading: userLoading, updateProfile, logout } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [majorship, setMajorship] = useState(user?.majorship || "");
  const [records, setRecords] = useState<ExamRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  const rankData = useMemo(() => user ? getRankData(user.xp || 0) : null, [user?.xp]);

  useEffect(() => { if (user?.majorship) setMajorship(user.majorship); }, [user]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.uid || !firestore) return;
      try {
        const q = query(collection(firestore, "exam_results"), where("userId", "==", user.uid), orderBy("timestamp", "desc"), limit(50));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamRecord));
        setRecords(data);
      } catch (e) { console.error("History fetch error:", e); } finally { setLoadingRecords(false); }
    };
    fetchHistory();
  }, [user, firestore]);

  const handleSaveMajorship = async () => {
    try {
      await updateProfile({ majorship });
      toast({ title: "Track Updated", description: `Your specialization is now set to ${majorship}.` });
    } catch (e) { toast({ variant: "destructive", title: "Update Failed", description: "Could not save preferences." }); }
  };

  const stats = useMemo(() => ({
    totalSessions: records.length,
    avgScore: records.length > 0 ? Math.round(records.reduce((acc, r) => acc + r.overallScore, 0) / records.length) : 0,
    bestScore: records.length > 0 ? Math.max(...records.map(r => r.overallScore)) : 0,
    credits: user?.credits || 0,
    readiness: Math.min(100, (records.length * 2) + (records.length > 0 ? Math.max(...records.map(r => r.overallScore)) : 0) / 1.5)
  }), [records, user]);

  const subjectMastery = useMemo(() => {
    const mastery: Record<string, { total: number, correct: number }> = {};
    records.forEach(r => {
      r.subjectBreakdown?.forEach((sb: any) => {
        const name = sb.subjectName;
        if (!mastery[name]) mastery[name] = { total: 0, correct: 0 };
        mastery[name].total += sb.totalQuestions;
        mastery[name].correct += sb.correctAnswers;
      });
    });
    return Object.entries(mastery).map(([name, data]) => ({ name, score: Math.round((data.correct / (data.total || 1)) * 100) }));
  }, [records]);

  if (userLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4"><Card className="p-8 text-center max-w-sm rounded-[2rem] shadow-xl bg-card border-none"><ShieldCheck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" /><h3 className="font-black text-xl mb-2 text-foreground">Access Restricted</h3><p className="text-muted-foreground font-medium mb-6">Please sign in to access records.</p><Link href="/"><Button className="w-full rounded-xl font-black h-12">Return Home</Button></Link></Card></div>;

  return (
    <div className="min-h-screen bg-background p-3 md:p-8 transition-colors duration-300">
      <Toaster />
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <div className="flex items-center justify-between gap-2">
          <Link href="/"><Button variant="ghost" size="sm" className="gap-1.5 font-bold text-muted-foreground hover:text-primary"><ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span></Button></Link>
          <div className="flex items-center gap-2 sm:gap-4"><div className="flex items-center gap-1.5 sm:gap-2 bg-card px-2 sm:px-4 py-1.5 rounded-full border shadow-sm"><CalendarDays className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">{format(new Date(), 'EEEE, MMMM do')}</span></div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8 border-none shadow-xl rounded-[3rem] bg-card overflow-hidden">
            <div className="h-40 bg-gradient-to-br from-primary/30 via-primary/5 to-card" />
            <CardContent className="px-10 pb-10 -mt-20 relative">
              <div className="flex flex-col md:flex-row md:items-end gap-6 mb-10">
                <div className="relative"><Avatar className="w-40 h-40 border-[6px] border-card shadow-2xl rounded-[3rem]"><AvatarImage src={user.photoURL || ""} /><AvatarFallback className="text-5xl font-black bg-muted text-muted-foreground">{user.displayName?.charAt(0) || "U"}</AvatarFallback></Avatar>{user.isPro && (<div className="absolute -bottom-2 -right-2 w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center border-4 border-card shadow-xl"><Trophy className="w-6 h-6 text-yellow-900" /></div>)}</div>
                <div className="flex-1 space-y-3 mb-2"><div className="flex items-center gap-4"><h1 className="text-4xl font-black tracking-tighter text-foreground">{user.displayName}</h1><Badge variant="secondary" className="bg-primary/10 text-primary border-none px-4 py-1 font-black uppercase text-[10px] tracking-widest">{user.isPro ? 'Platinum Educator' : 'Aspiring Professional'}</Badge></div><div className="flex items-center gap-6 text-muted-foreground font-medium text-sm"><span className="flex items-center gap-2"><Mail className="w-4 h-4 opacity-40" /> {user.email}</span><span className="flex items-center gap-2"><GraduationCap className="w-4 h-4 opacity-40" /> {user.majorship || 'Generalist'}</span></div></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: <History className="w-4 h-4 text-muted-foreground" />, label: 'Simulations', value: stats.totalSessions },
                  { icon: <Target className="w-4 h-4 text-primary" />, label: 'Avg Rating', value: `${stats.avgScore}%` },
                  { icon: <Trophy className="w-4 h-4 text-yellow-500" />, label: 'Best Rating', value: `${stats.bestScore}%` },
                  { icon: <Coins className="w-4 h-4 text-emerald-500" />, label: 'Rank', value: `Rank ${rankData?.rank}` }
                ].map((stat, i) => (
                  <div key={i} className="p-6 bg-muted/10 rounded-3xl border border-border flex flex-col items-center justify-center text-center space-y-1 hover:bg-card hover:shadow-md transition-all group">
                    <div className="w-10 h-10 rounded-2xl bg-card shadow-sm border border-border flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">{stat.icon}</div>
                    <span className="text-2xl font-black text-foreground">{stat.value}</span>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">{stat.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4 border-none shadow-xl rounded-[3rem] bg-card text-foreground overflow-hidden flex flex-col relative group border border-border">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity"><Zap className="w-40 h-40" /></div>
            <CardHeader className="p-10 pb-0"><div className="space-y-2"><h3 className="text-2xl font-black tracking-tight">Board Readiness</h3><p className="text-muted-foreground text-xs font-medium leading-relaxed">Projected board performance.</p></div></CardHeader>
            <CardContent className="p-10 flex-1 flex flex-col items-center justify-center">
               <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90"><circle cx="96" cy="96" r="80" className="stroke-muted fill-none" strokeWidth="12" /><circle cx="96" cy="96" r="80" className="stroke-primary fill-none transition-all duration-1000" strokeWidth="12" strokeDasharray={`${(stats.readiness / 100) * 502} 502`} strokeLinecap="round" /></svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-5xl font-black text-foreground">{Math.round(stats.readiness)}%</span><span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Ready</span></div>
               </div>
            </CardContent>
            <div className="p-10 pt-0"><Link href="/" className="w-full"><Button className="w-full h-14 rounded-2xl font-black shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground text-lg">Improve My Score</Button></Link></div>
          </Card>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-8">
          <TabsList className="bg-card border border-border p-1 rounded-[1.5rem] w-full grid grid-cols-2 shadow-sm h-16">
            <TabsTrigger value="history" className="font-black h-full rounded-2xl gap-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all text-base"><History className="w-5 h-5" /> Learning Vault</TabsTrigger>
            <TabsTrigger value="account" className="font-black h-full rounded-2xl gap-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all text-base"><Settings className="w-5 h-5" /> Academic Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {loadingRecords ? (
                  <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-card rounded-[3rem] shadow-inner border border-dashed border-border"><Loader2 className="w-12 h-12 animate-spin text-primary" /><p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Accessing Records...</p></div>
                ) : records.length === 0 ? (
                  <Card className="border-none shadow-sm rounded-[3rem] bg-card p-24 text-center border border-border"><ClipboardList className="w-24 h-24 text-muted-foreground/10 mx-auto mb-8" /><h3 className="text-3xl font-black mb-2 text-foreground">Simulation Vault Empty</h3><p className="text-muted-foreground font-medium max-w-sm mx-auto mb-10 leading-relaxed">Complete your first simulation to generate insights.</p><Link href="/"><Button size="lg" className="rounded-2xl font-black h-16 px-12 shadow-2xl shadow-primary/20 text-lg">Launch Simulation</Button></Link></Card>
                ) : (
                  <Accordion type="single" collapsible className="space-y-5">
                    {records.map((record, index) => (
                      <AccordionItem key={record.id} value={record.id} className="border-none bg-card rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all border border-border">
                        <AccordionTrigger className="hover:no-underline p-10 group">
                          <div className="flex items-center justify-between w-full pr-8">
                            <div className="flex items-center gap-10">
                              <div className={cn("w-20 h-20 rounded-[2rem] flex flex-col items-center justify-center font-black transition-all group-hover:scale-110", record.overallScore >= 75 ? 'bg-emerald-500/10 text-emerald-600 border-2 border-emerald-500/20' : 'bg-orange-500/10 text-orange-600 border-2 border-orange-500/20')}>
                                <span className="text-2xl leading-none">{record.overallScore}%</span>
                                <span className="text-[8px] uppercase tracking-widest mt-1.5 opacity-60">Board</span>
                              </div>
                              <div className="text-left space-y-2">
                                <p className="font-black text-xl text-foreground tracking-tight">Professional Track #{(records.length - index).toString().padStart(3, '0')}</p>
                                <div className="flex flex-wrap items-center gap-6 text-[11px] font-bold text-muted-foreground">
                                  <span className="flex items-center gap-2"><Clock className="w-4 h-4 opacity-50" /> {Math.floor(record.timeSpent / 60)}m {record.timeSpent % 60}s</span>
                                  <span className="flex items-center gap-2"><History className="w-4 h-4 opacity-50" /> {format(record.timestamp, 'MMMM d, yyyy')}</span>
                                </div>
                              </div>
                            </div>
                            <Badge variant={record.overallScore >= 75 ? 'secondary' : 'outline'} className={cn("font-black text-[10px] uppercase tracking-[0.25em] px-8 py-2.5 rounded-full border-2", record.overallScore >= 75 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-card text-muted-foreground border-border")}>
                              {record.overallScore >= 75 ? 'Qualified' : 'Requires Review'}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-12 pt-0 border-t border-border bg-muted/5">
                          {record.aiSummary ? (
                            <div className="space-y-10 pt-10">
                              <div className="flex items-center gap-3"><Sparkles className="w-5 h-5 text-primary" /><span className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Pedagogical AI Insight</span></div>
                              <div className="relative"><div className="absolute -left-6 top-0 bottom-0 w-1.5 bg-primary rounded-full" /><p className="text-xl font-medium leading-relaxed italic text-foreground pl-4 py-2">"{record.aiSummary.summary}"</p></div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-5"><h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-600 flex items-center gap-3"><TrendingUp className="w-4 h-4" /> Demonstrated Mastery</h4><div className="flex flex-wrap gap-3">{record.aiSummary.strengths.map((s, i) => (<Badge key={i} variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-2 border-emerald-500/20 font-bold text-xs px-5 py-2 rounded-xl">{s}</Badge>))}</div></div>
                                <div className="space-y-5"><h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-destructive flex items-center gap-3"><Target className="w-4 h-4" /> Targeted Improvement</h4><div className="flex flex-wrap gap-3">{record.aiSummary.weaknesses.map((w, i) => (<Badge key={i} variant="outline" className="border-destructive/20 text-destructive font-bold text-xs px-5 py-2 rounded-xl bg-card">{w}</Badge>))}</div></div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-16 text-center text-muted-foreground italic text-sm font-medium">Insights available for Pro users.</div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden p-8 space-y-8 border border-border">
                  <div className="space-y-1"><h3 className="text-xl font-black tracking-tight text-foreground">Track Mastery</h3><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Aggregate Proficiency</p></div>
                  <div className="h-[300px] w-full">
                    {subjectMastery.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectMastery} layout="vertical" margin={{ left: -20, right: 30 }}>
                          <XAxis type="number" domain={[0, 100]} hide />
                          <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }} />
                          <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} barSize={20}>
                            {subjectMastery.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.score >= 75 ? '#10b981' : '#a7d9ed'} />))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-center text-[10px] font-black uppercase text-muted-foreground/30">Insufficient Data</div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="account" className="animate-in fade-in slide-in-from-bottom-4">
            <Card className="border-none shadow-xl rounded-[3rem] overflow-hidden bg-card border border-border">
              <CardContent className="p-12 space-y-12">
                <div className="space-y-8">
                  <div className="flex items-center gap-5"><div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center"><GraduationCap className="w-8 h-8 text-primary" /></div><div><h3 className="text-3xl font-black tracking-tight text-foreground">Professional Focus</h3><p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Customize your simulation track</p></div></div>
                  <div className="space-y-6 bg-muted/10 p-10 rounded-[2.5rem] border-2 border-dashed border-border"><Label className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground px-2 block mb-4">Selected Specialization</Label><Select value={majorship} onValueChange={setMajorship}><SelectTrigger className="h-20 rounded-2xl font-black border-border shadow-sm text-xl px-10 bg-card hover:border-primary transition-colors focus:ring-primary/20"><SelectValue placeholder="Select majorship" /></SelectTrigger><SelectContent className="rounded-2xl p-3">{MAJORSHIPS.map(m => (<SelectItem key={m} value={m} className="font-bold py-5 rounded-xl text-lg px-6">{m}</SelectItem>))}</SelectContent></Select></div>
                </div>
                <div className="flex flex-col gap-6"><Button onClick={handleSaveMajorship} className="w-full h-20 rounded-3xl font-black text-2xl shadow-2xl shadow-primary/30 gap-4 group active:scale-[0.98] transition-all">Save Profile</Button><Button variant="ghost" onClick={logout} className="w-full h-16 text-destructive font-black gap-3 hover:bg-destructive/5 rounded-2xl text-lg"><LogOut className="w-5 h-5" /> Secure Sign Out</Button></div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
