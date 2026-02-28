"use client"

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useUser, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MAJORSHIPS, Question } from "@/app/lib/mock-data";
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
  ChevronRight,
  Sparkles,
  Search,
  X,
  Calendar,
  Clock,
  Activity
} from "lucide-react";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc } from "firebase/firestore";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { getRankData } from '@/lib/xp-system';
import { ResultsOverview } from '@/components/exam/ResultsOverview';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'framer-motion';

interface ExamRecord {
  id: string;
  timestamp: number;
  overallScore: number;
  timeSpent: number;
  subjectBreakdown?: any[];
  results?: any[];
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
  
  // Detailed Result View State
  const [selectedRecord, setSelectedRecord] = useState<ExamRecord | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);

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
    records.forEach(r => r.results?.forEach((res: any) => {
      const name = res.subject === 'Specialization' && res.subCategory ? `${res.subject}: ${res.subCategory}` : res.subject;
      if (!m[name]) m[name] = { t: 0, c: 0 };
      m[name].t += 1; 
      if (res.isCorrect) m[name].c += 1;
    }));
    return Object.entries(m).map(([name, data]) => ({ name, score: Math.round((data.c / (data.t || 1)) * 100) }));
  }, [records]);

  const handleViewDetails = (record: ExamRecord) => {
    setSelectedRecord(record);
    setIsDetailViewOpen(true);
  };

  if (userLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <div className="min-h-screen flex flex-col items-center justify-center p-4"><Card className="p-10 text-center max-w-sm rounded-[2.5rem] android-surface border-none shadow-2xl"><ShieldCheck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" /><h3 className="font-black text-xl mb-6">Authentication Required</h3><Link href="/"><Button className="w-full rounded-2xl h-14 font-black">Return Home</Button></Link></Card></div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-body">
      <Toaster />
      <div className="max-w-6xl mx-auto space-y-8 pb-24">
        <div className="flex items-center justify-between">
          <Link href="/"><Button variant="ghost" size="sm" className="gap-2 font-black text-muted-foreground uppercase tracking-widest text-[10px]"><ArrowLeft className="w-4 h-4" /> Exit</Button></Link>
          <Badge variant="outline" className="bg-card px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] border-primary/20">{format(new Date(), 'EEEE, MMM do')}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8 border-none shadow-xl rounded-[3rem] bg-card overflow-hidden transition-all duration-500">
            <div className="h-32 bg-gradient-to-br from-primary/30 via-primary/5 to-card" />
            <CardContent className="px-8 pb-8 -mt-16 relative">
              <div className="flex flex-col md:flex-row md:items-end gap-6 mb-8">
                <Avatar className="w-32 h-32 border-[6px] border-card shadow-2xl rounded-[2.5rem]"><AvatarImage src={user.photoURL || ""} /><AvatarFallback className="text-4xl font-black bg-muted">{user.displayName?.charAt(0)}</AvatarFallback></Avatar>
                <div className="flex-1 space-y-2 mb-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight">{user.displayName}</h1>
                    {user.isPro && <div className="w-10 h-10 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-xl shadow-yellow-400/20 animate-levitate"><Trophy className="w-5 h-5 text-yellow-900 fill-current" /></div>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="h-7 px-4 font-black text-[10px] bg-primary text-primary-foreground rounded-xl uppercase tracking-widest shadow-md">
                      {rankData?.title} • RANK {rankData?.rank}
                    </Badge>
                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground font-black text-[10px] uppercase tracking-wider opacity-60">
                      <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {user.email}</span>
                      <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> {user.majorship}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: <History className="w-4 h-4 text-blue-500" />, label: 'Sessions', value: stats.total },
                  { icon: <Target className="w-4 h-4 text-emerald-500" />, label: 'Accuracy', value: `${stats.avg}%` },
                  { icon: <Trophy className="w-4 h-4 text-yellow-500" />, label: 'Best Peak', value: `${stats.best}%` },
                  { icon: <Zap className="w-4 h-4 text-primary" />, label: 'Ascension', value: `${rankData?.xpInRank || 0} XP` }
                ].map((stat, i) => (
                  <motion.div key={i} whileHover={{ y: -4 }} className="p-5 bg-muted/20 rounded-[1.75rem] border border-border/50 text-center space-y-2 transition-all shadow-sm hover:shadow-md">
                    <div className="flex justify-center">{stat.icon}</div>
                    <p className="text-lg font-black leading-none tracking-tight">{stat.value}</p>
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4 border-none shadow-xl rounded-[3rem] bg-foreground text-background flex flex-col items-center justify-center p-10 space-y-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-700" />
            <div className="text-center relative z-10">
              <h3 className="text-2xl font-black tracking-tight mb-1">Board Readiness</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary opacity-80">Analytical Projection</p>
            </div>
            <div className="relative w-44 h-44 flex items-center justify-center scale-110">
              <svg className="w-full h-full -rotate-90">
                <circle cx="88" cy="88" r="78" className="stroke-white/10 fill-none" strokeWidth="12" />
                <motion.circle 
                  cx="88" 
                  cy="88" 
                  r="78" 
                  className="stroke-primary fill-none" 
                  strokeWidth="12" 
                  initial={{ strokeDasharray: "0 490" }}
                  animate={{ strokeDasharray: `${(stats.readiness / 100) * 490} 490` }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  strokeLinecap="round" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black tracking-tighter text-white">{Math.round(stats.readiness)}%</span>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Ready</span>
              </div>
            </div>
            <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xl shadow-primary/30 active:scale-95 transition-all">Identify Gaps</Button>
          </Card>
        </div>

        <Tabs defaultValue={activeTab} className="space-y-8">
          <TabsList className="bg-muted/30 p-1.5 rounded-[2rem] w-full grid grid-cols-2 h-16 shadow-inner border border-border/50">
            <TabsTrigger value="history" className="font-black text-[10px] uppercase tracking-[0.25em] rounded-[1.5rem] gap-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl transition-all duration-300">
              <History className="w-4 h-4" /> Simulation Vault
            </TabsTrigger>
            <TabsTrigger value="settings" className="font-black text-[10px] uppercase tracking-[0.25em] rounded-[1.5rem] gap-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl transition-all duration-300">
              <Settings className="w-4 h-4" /> Calibration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
            {loadingRecords ? (
              <div className="flex flex-col items-center justify-center py-24 bg-card rounded-[3.5rem] border-4 border-dashed border-border/50 shadow-inner">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Syncing Academic Vault...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-24 bg-card rounded-[3.5rem] border shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <ClipboardList className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6 animate-levitate" />
                <h3 className="text-3xl font-black mb-2">Vault is Sealed</h3>
                <p className="text-muted-foreground font-medium text-lg mb-10 max-w-sm mx-auto leading-relaxed">Commit your first analytical simulation to generate professional insights.</p>
                <Link href="/"><Button className="rounded-2xl font-black h-16 px-12 shadow-2xl shadow-primary/30 text-lg gap-3"><Zap className="w-6 h-6 fill-current" /> Launch Initial Simulation</Button></Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-4">
                  {records.map((record, i) => (
                    <motion.div 
                      key={record.id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileTap={{ scale: 0.98 }}
                      className="android-surface p-6 rounded-[2.25rem] flex flex-col sm:flex-row sm:items-center justify-between border-none shadow-lg hover:shadow-2xl transition-all duration-300 bg-card group relative overflow-hidden"
                    >
                      <div className="flex items-center gap-6 relative z-10">
                        <div className={cn(
                          "w-20 h-20 rounded-[1.75rem] flex flex-col items-center justify-center font-black shadow-inner border-2 transition-transform group-hover:scale-105", 
                          record.overallScore >= 75 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-orange-500/10 border-orange-500/20 text-orange-600'
                        )}>
                          <span className="text-2xl tracking-tighter leading-none">{record.overallScore}%</span>
                          <span className="text-[8px] uppercase tracking-[0.2em] mt-1 opacity-60">Board</span>
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-xl tracking-tight">Trace #{(records.length - i).toString().padStart(3, '0')}</p>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">
                              <Calendar className="w-3 h-3" /> {format(record.timestamp, 'MMM dd, yyyy')}
                            </div>
                            <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">
                              <Clock className="w-3 h-3" /> {Math.floor(record.timeSpent / 60)}m {record.timeSpent % 60}s
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-6 sm:mt-0 relative z-10">
                        <Badge variant="outline" className={cn(
                          "rounded-lg font-black text-[9px] uppercase tracking-[0.2em] px-3 py-1 hidden sm:flex", 
                          record.overallScore >= 75 ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5' : 'border-orange-500/30 text-orange-600 bg-orange-500/5'
                        )}>
                          {record.overallScore >= 75 ? 'Qualified' : 'Retake'}
                        </Badge>
                        <Button 
                          onClick={() => handleViewDetails(record)}
                          variant="secondary" 
                          className="flex-1 sm:flex-none h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] gap-3 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-md group-hover:shadow-primary/20"
                        >
                          Analyze Trace <Sparkles className="w-4 h-4 fill-current group-hover:animate-pulse" />
                        </Button>
                      </div>
                      
                      <div className="absolute top-0 right-0 p-8 opacity-5 text-primary pointer-events-none group-hover:rotate-12 transition-transform">
                        <Activity className="w-32 h-32" />
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                <div className="lg:col-span-4">
                  <div className="sticky top-24 space-y-6">
                    <Card className="border-none shadow-2xl rounded-[3rem] bg-card p-10 space-y-8 relative overflow-hidden border-border/50">
                      <div className="absolute inset-0 bg-primary/5 opacity-50" />
                      <div className="text-center space-y-2 relative z-10">
                        <h3 className="text-xl font-black tracking-tight">Track Mastery</h3>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-60 text-primary">Aggregate Proficiency</p>
                      </div>
                      
                      <div className="h-[300px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={subjectMastery} layout="vertical" margin={{ left: -30, right: 30 }}>
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis 
                              dataKey="name" 
                              type="category" 
                              width={100} 
                              style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', fill: 'hsl(var(--muted-foreground))', letterSpacing: '0.1em' }} 
                            />
                            <Bar dataKey="score" radius={[0, 12, 12, 0]} barSize={20}>
                              {subjectMastery.map((e, idx) => (
                                <Cell key={idx} fill={e.score >= 75 ? '#10b981' : '#a7d9ed'} className="transition-all duration-1000" />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="p-5 bg-background/50 rounded-2xl border-2 border-dashed border-border/50 text-center relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Calibration Status</p>
                        <p className="text-sm font-black text-foreground mt-1">Verified Professional Trace</p>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
            <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-card border-border/50">
              <CardContent className="p-10 space-y-8">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-primary/10 rounded-[1.75rem] flex items-center justify-center shadow-inner">
                    <GraduationCap className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-foreground">Academic Focus</h3>
                    <p className="text-sm text-muted-foreground font-medium">Calibrate your primary simulation specialization</p>
                  </div>
                </div>
                
                <div className="space-y-4 bg-muted/20 p-8 rounded-[2.5rem] border-2 border-dashed border-border/50">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary ml-1">Simulated Track</Label>
                  <Select value={majorship} onValueChange={setMajorship}>
                    <SelectTrigger className="h-16 rounded-2xl font-black border-2 border-border shadow-xl text-xl px-8 bg-card active:scale-[0.98] transition-all">
                      <SelectValue placeholder="Select track..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-[2rem] p-3 border-2 shadow-2xl">
                      {MAJORSHIPS.map(m => (
                        <SelectItem key={m} value={m} className="font-black py-5 text-lg px-8 rounded-xl focus:bg-primary/10 focus:text-primary transition-colors">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={savingProfile || majorship === user?.majorship}
                  className="w-full h-16 rounded-[1.75rem] font-black text-lg uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 active:scale-95 transition-all gap-3"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Commiting...
                    </>
                  ) : (
                    <>
                      <Check className="w-6 h-6" />
                      Commit Preferences
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl rounded-[3rem] overflow-hidden bg-card border-border/50">
              <CardContent className="p-10 space-y-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-muted rounded-[1.75rem] flex items-center justify-center shadow-inner">
                      <RefreshCw className={cn("w-8 h-8 text-muted-foreground", refreshing && "animate-spin")} />
                    </div>
                    <div className="text-center sm:text-left">
                      <h3 className="text-2xl font-black tracking-tight text-foreground">Cloud Data Sync</h3>
                      <p className="text-sm text-muted-foreground font-medium">Refresh your character metadata from vault</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleRefreshData} 
                    disabled={refreshing} 
                    className="w-full sm:w-auto h-14 px-10 rounded-2xl font-black text-xs uppercase tracking-[0.25em] border-2 gap-3 hover:bg-muted active:scale-95 transition-all"
                  >
                    {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Sync Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detailed Result Modal - Full Screen Android Optimized */}
      <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[95vh] rounded-[3.5rem] p-0 border-none shadow-[0_40px_120px_rgba(0,0,0,0.5)] overflow-hidden outline-none z-[1100] flex flex-col bg-background">
          <DialogHeader className="p-8 border-b bg-card shrink-0 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
                <Activity className="w-7 h-7 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black tracking-tighter">Session Deep Dive</DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground flex items-center gap-2">
                  Trace ID: <span className="text-primary">#{selectedRecord?.timestamp ? format(selectedRecord.timestamp, 'yyMMdd-HHmm') : '0000'}</span>
                </DialogDescription>
              </div>
            </div>
            <DialogClose className="rounded-full h-12 w-12 bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center active:scale-90">
              <X className="w-6 h-6 text-muted-foreground" />
            </DialogClose>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto no-scrollbar pb-12">
            {selectedRecord && (
              <ResultsOverview 
                questions={(selectedRecord.results || []).map(r => ({
                  ...r,
                  id: r.questionId || r.id,
                  text: r.text || "Question content unavailable in legacy record.",
                  options: r.options || ["A", "B", "C", "D"],
                  correctAnswer: r.correctAnswer || "",
                  subject: r.subject || "General",
                  difficulty: r.difficulty || "medium",
                  // CRITICAL: Ensure stored AI explanations are passed through to avoid redundant prompts
                  aiExplanation: r.aiExplanation
                } as Question))}
                answers={(selectedRecord.results || []).reduce((acc, curr) => {
                  acc[curr.questionId || curr.id] = curr.userAnswer || (curr.isCorrect ? curr.correctAnswer : "");
                  return acc;
                }, {} as Record<string, string>)}
                timeSpent={selectedRecord.timeSpent || 0}
                onRestart={() => setIsDetailViewOpen(false)}
                resultId={selectedRecord.id}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
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
