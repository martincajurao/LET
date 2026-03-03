
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  ArrowLeft, 
  Search, 
  Save,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Brain,
  Users,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Download,
  Smartphone,
  Check,
  Activity,
  Zap,
  Clock,
  Ban,
  Trophy,
  AlertTriangle,
  X,
  FileText,
  BarChart3,
  TrendingUp,
  Database,
  History,
  ShieldAlert,
  ArrowUpCircle,
  Info,
  Timer,
  Minus,
  Lightbulb,
  Eye,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFirestore } from "@/firebase";
import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  getDoc,
  setDoc,
  query,
  orderBy,
  limit as queryLimit,
  serverTimestamp,
  increment,
  getCountFromServer,
  writeBatch
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Question, MAJORSHIPS, SUBJECTS } from "@/app/lib/mock-data";
import { format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getRankData } from '@/lib/xp-system';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { motion } from "framer-motion";
import { RankTierInput } from '@/components/ui/rank-tier-config';
import { QUESTION_LIMITS_BY_RANK } from '@/lib/xp-system';

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [stats, setStats] = useState({
    userCount: 0,
    questionCount: 0,
    resultCount: 0,
    activeQuests: 4
  });

  const [timePerQuestion, setTimePerQuestion] = useState(60);
  const [limits, setLimits] = useState({ limitGenEd: 10, limitProfEd: 10, limitSpec: 10 });
  const [configNote, setConfigNote] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Rank-based question limits
  const [rankLimits, setRankLimits] = useState<Record<number, { genEd: number; profEd: number; spec: number }>>({});
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [manageUser, setManageUser] = useState<any | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editUserForm, setEditUserForm] = useState({
    displayName: "",
    majorship: "",
    credits: 0,
    xp: 0,
    isPro: false,
    isBlocked: false
  });

  const fetchData = async () => {
    if (!firestore) return;
    setLoading(true);
    
    try {
      const qSnap = await getDocs(collection(firestore, "questions"));
      const qList = qSnap.docs.map(d => ({ ...d.data(), id: d.id } as Question));
      setQuestions(qList);

      const userCount = await getCountFromServer(collection(firestore, "users"));
      const resultCount = await getCountFromServer(collection(firestore, "exam_results"));
      setStats({
        userCount: userCount.data().count,
        questionCount: qSnap.size,
        resultCount: resultCount.data().count,
        activeQuests: 4 
      });

      const configRef = doc(firestore, "system_configs", "global");
      const configDoc = await getDoc(configRef);
      if (configDoc.exists()) {
        const data = configDoc.data();
        setTimePerQuestion(data.timePerQuestion || 60);
        setLimits({ 
          limitGenEd: data.limitGenEd || 10, 
          limitProfEd: data.limitProfEd || 10, 
          limitSpec: data.limitSpec || 10 
        });
        setConfigNote(data.note || "");
      }
    } catch (error: any) {
      console.error("Admin data sync failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!firestore) return;
    const usersQuery = query(collection(firestore, "users"), orderBy("lastActiveDate", "desc"), queryLimit(100));
    
    getDocs(usersQuery)
      .then(usersSnap => {
        setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      })
      .catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'users',
          operation: 'list'
        }));
      });
  };

  useEffect(() => { if (firestore) { fetchData(); fetchUsers(); } }, [firestore]);

  const filteredUsers = useMemo(() => users.filter(u => 
    (u.email?.toLowerCase() || "").includes(userSearchQuery.toLowerCase()) || 
    (u.displayName?.toLowerCase() || "").includes(userSearchQuery.toLowerCase())
  ), [users, userSearchQuery]);

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingQuestion) return;
    
    const id = editingQuestion.id || crypto.randomUUID();
    const docRef = doc(firestore, "questions", id);
    const data = { ...editingQuestion, id };

    setDoc(docRef, data, { merge: true })
      .then(() => {
        toast({ title: "Item Saved", description: "Pedagogical content added." });
        setIsDialogOpen(false); 
        setEditingQuestion(null); 
        fetchData();
      })
      .catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'write'
        }));
      });
  };

  const handleOpenUserManagement = (user: any) => {
    setManageUser(user);
    setEditUserForm({
      displayName: user.displayName || "",
      majorship: user.majorship || "",
      credits: Number(user.credits) || 0,
      xp: Number(user.xp) || 0,
      isPro: !!user.isPro,
      isBlocked: !!user.isBlocked
    });
  };

  const handleUpdateUser = async () => {
    if (!firestore || !manageUser) return;
    setIsUpdatingUser(true);
    
    const userRef = doc(firestore, 'users', manageUser.id);
    const data = {
      displayName: editUserForm.displayName,
      majorship: editUserForm.majorship,
      credits: Number(editUserForm.credits),
      xp: Number(editUserForm.xp),
      isPro: editUserForm.isPro,
      isBlocked: editUserForm.isBlocked,
      updatedAt: serverTimestamp()
    };

    updateDoc(userRef, data)
      .then(() => {
        toast({ title: "Teacher Calibrated", description: "Data synced." });
        fetchUsers();
        setManageUser(null);
      })
      .finally(() => {
        setIsUpdatingUser(false);
      });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><EducationalLoader message="Syncing Dashboard..." /></div>;

  return (
    <div className="min-h-screen bg-background font-body transition-colors duration-300 pb-24">
      <Toaster />
      <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-[100] pt-safe flex items-center justify-between px-4 sm:px-8 h-16 sm:h-20">
        <div className="flex items-center gap-4">
          <Link href="/"><Button variant="ghost" size="sm" className="gap-2 font-black text-muted-foreground uppercase text-[10px] tracking-widest"><ArrowLeft className="w-4 h-4" /> Exit</Button></Link>
          <div className="h-8 w-[1px] bg-border mx-2 hidden sm:block" />
          <span className="text-lg font-black tracking-tight flex items-center gap-2 text-foreground"><Settings className="w-5 h-5 text-primary" /> Admin Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:flex font-black text-[9px] uppercase tracking-widest border-primary/20 text-primary bg-primary/5">Superuser Session</Badge>
          <Button variant="ghost" size="icon" onClick={fetchData} className="rounded-xl h-10 w-10"><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-muted/30 p-1.5 rounded-[2rem] flex w-fit h-14 border border-border/50 overflow-x-auto no-scrollbar">
            <TabsTrigger value="overview" className="font-black text-[10px] uppercase tracking-widest rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-w-[120px] gap-2"><BarChart3 className="w-3.5 h-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="questions" className="font-black text-[10px] uppercase tracking-widest rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-w-[120px] gap-2"><Brain className="w-3.5 h-3.5" /> Item Vault</TabsTrigger>
            <TabsTrigger value="users" className="font-black text-[10px] uppercase tracking-widest rounded-2xl flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-w-[120px]"><Users className="w-3.5 h-3.5" /> Teacher Base</TabsTrigger>
            <TabsTrigger value="config" className="font-black text-[10px] uppercase tracking-widest rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-w-[120px] gap-2"><Database className="w-3.5 h-3.5" /> System Params</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Teachers', value: stats.userCount, icon: <Users className="w-5 h-5 text-blue-500" />, color: 'bg-blue-500/10' },
                { label: 'Vault Items', value: stats.questionCount, icon: <Brain className="w-5 h-5 text-purple-500" />, color: 'bg-purple-500/10' },
                { label: 'Exams Run', value: stats.resultCount, icon: <History className="w-5 h-5 text-emerald-500" />, color: 'bg-emerald-500/10' },
                { label: 'Active Quests', value: stats.activeQuests, icon: <Activity className="w-5 h-5 text-amber-500" />, color: 'bg-amber-500/10' }
              ].map((stat, i) => (
                <Card key={i} className="android-surface border-none shadow-lg rounded-[2rem] p-6 text-center transition-all hover:shadow-xl group">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner group-hover:scale-110 transition-transform", stat.color)}>
                    {stat.icon}
                  </div>
                  <p className="text-3xl font-black text-foreground tracking-tighter">{stat.value}</p>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">{stat.label}</p>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center px-2">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-60" />
                <Input placeholder="Search question vault..." className="pl-11 rounded-[1.25rem] border-border h-12 shadow-sm font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Button onClick={() => { setEditingQuestion({}); setIsDialogOpen(true); }} className="w-full sm:w-auto rounded-[1.25rem] font-black h-12 px-8 shadow-xl shadow-primary/20 active:scale-95 transition-all"><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
            </div>
            
            <div className="android-surface rounded-[2.5rem] overflow-hidden shadow-2xl bg-card border border-border/50">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-border/50">
                      <TableHead className="font-black uppercase text-[10px] tracking-widest pl-8 w-24">Track</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Content Trace</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-8 w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.filter(q => q.text.toLowerCase().includes(searchQuery.toLowerCase())).map(q => (
                      <TableRow key={q.id} className="border-border/30 hover:bg-muted/10 transition-colors group">
                        <TableCell className="pl-8">
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-black uppercase border-none px-3",
                            q.subject === 'General Education' ? "bg-blue-500/10 text-blue-600" :
                            q.subject === 'Professional Education' ? "bg-purple-500/10 text-purple-600" :
                            "bg-emerald-500/10 text-emerald-600"
                          )}>{q.subject === 'Specialization' ? 'Spec' : q.subject === 'Professional Education' ? 'Prof' : 'Gen'}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-bold">
                          <p className="line-clamp-1 text-foreground/80">{q.text}</p>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-60">{q.difficulty} • {q.subCategory || 'General Track'}</p>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary active:scale-90" onClick={() => { setEditingQuestion(q); setIsDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive active:scale-90" onClick={() => deleteDoc(doc(firestore!, "questions", q.id)).then(fetchData)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center px-2">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-60" />
                <Input placeholder="Search teacher name or email..." className="pl-11 rounded-[1.25rem] h-12 shadow-sm font-medium" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} />
              </div>
              <Button variant="outline" onClick={fetchUsers} className="w-full sm:w-auto rounded-[1.25rem] font-black h-12 border-2 active:scale-95 transition-all"><RefreshCw className="w-4 h-4 mr-2" /> Sync Base</Button>
            </div>

            <div className="android-surface rounded-[2.5rem] overflow-hidden shadow-2xl bg-card border border-border/50">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-border/50">
                      <TableHead className="font-black uppercase text-[10px] tracking-widest pl-8">Teacher Profile</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Specialization</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Growth Rank</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">AI Credits</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-8 w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(u => {
                      const rank = getRankData(u.xp || 0);
                      return (
                        <TableRow key={u.id} className="border-border/30 hover:bg-muted/10 transition-colors group">
                          <TableCell className="pl-8">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-11 h-11 rounded-2xl shadow-inner">
                                <AvatarImage src={u.photoURL || ""} />
                                <AvatarFallback className="bg-primary/10 text-primary text-sm font-black">🎓</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-black truncate max-w-[140px]">{u.displayName || 'Anonymous Teacher'}</p>
                                  {u.isPro && <ShieldCheck className="w-3.5 h-3.5 text-yellow-500" />}
                                  {u.isBlocked && <Ban className="w-3.5 h-3.5 text-destructive shrink-0" />}
                                </div>
                                <p className="text-[10px] font-bold text-muted-foreground truncate max-w-[180px] opacity-60 uppercase tracking-tight">{u.email || 'Internal Auth Trace'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] font-black bg-background border-border/50 uppercase tracking-widest px-3 py-1">{u.majorship || 'UNSET'}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Rank {rank.rank}</span>
                              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">{rank.title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-black gap-1.5 h-7 bg-yellow-500/10 text-yellow-700 border-none px-3">
                              <Sparkles className="w-3.5 h-3.5 animate-sparkle fill-current" /> {Number(u.credits) || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <button className="h-10 w-10 rounded-xl opacity-40 group-hover:opacity-100 flex items-center justify-center hover:bg-muted" onClick={() => handleOpenUserManagement(u)}>
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-8 animate-in fade-in duration-500">
            <Card className="android-surface border-none shadow-2xl rounded-[3rem] bg-card overflow-hidden">
              <CardHeader className="p-10 border-b bg-muted/20">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                    <Settings className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black tracking-tighter">System Parameters</CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Global Simulation Calibration</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] ml-1 flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5" /> Simulation Pacing (s/item)
                  </label>
                  <Input type="number" value={timePerQuestion} onChange={(e) => setTimePerQuestion(parseInt(e.target.value) || 60)} className="rounded-[1.25rem] h-14 font-black text-xl border-2 focus:border-primary shadow-inner" />
                </div>
                <Button 
                  onClick={async () => { 
                    if (!firestore) return;
                    setSavingSettings(true); 
                    const configRef = doc(firestore, "system_configs", "global");
                    await setDoc(configRef, { 
                      timePerQuestion, 
                      updatedAt: serverTimestamp() 
                    }, { merge: true });
                    toast({ title: "Parameters Updated", description: "System recalibrated." });
                    setSavingSettings(false);
                  }} 
                  disabled={savingSettings} 
                  className="h-16 rounded-[1.5rem] font-black text-base px-14 shadow-2xl shadow-primary/30 w-full sm:w-auto active:scale-95 transition-all gap-3"
                >
                  {savingSettings ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />} Commit Parameters
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[3rem] p-0 border-none shadow-[0_40px_120px_rgba(0,0,0,0.5)] overflow-hidden outline-none z-[1100] flex flex-col max-h-[95vh]">
          <div className="bg-primary/10 p-8 border-b shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/20"><Brain className="w-6 h-6" /></div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tighter text-foreground">{editingQuestion?.id ? 'Edit Vault Item' : 'New Item Creation'}</DialogTitle>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary opacity-60">Pedagogical Calibration</p>
              </div>
            </div>
            <DialogClose className="rounded-full h-10 w-10 bg-background/50 hover:bg-muted transition-colors flex items-center justify-center active:scale-90">
              <X className="w-5 h-5 text-muted-foreground" />
            </DialogClose>
          </div>
          <form onSubmit={handleSaveQuestion} className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8 bg-background">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Academic Track</label>
              <Select value={editingQuestion?.subject || ""} onValueChange={(val) => setEditingQuestion({...editingQuestion, subject: val})}>
                <SelectTrigger className="rounded-2xl h-14 font-black border-2 shadow-inner">
                  <SelectValue placeholder="Select Track" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl p-2">
                  {SUBJECTS.map(s => <SelectItem key={s} value={s} className="font-bold py-3 rounded-xl">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveQuestion} className="rounded-2xl font-black text-sm uppercase tracking-widest h-14 px-12 shadow-2xl shadow-primary/30 w-full active:scale-95 transition-all">Commit to Vault</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!manageUser} onOpenChange={() => setManageUser(null)}>
        <DialogContent className="max-w-2xl rounded-[3rem] p-0 border-none shadow-[0_40px_120px_rgba(0,0,0,0.5)] overflow-hidden outline-none z-[1100] flex flex-col max-h-[95vh] bg-background">
          <div className="bg-foreground text-background p-8 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden shrink-0">
            <Avatar className="w-20 h-20 rounded-[1.75rem] shadow-2xl relative z-10 shrink-0">
              <AvatarImage src={manageUser?.photoURL || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground font-black text-3xl">🎓</AvatarFallback>
            </Avatar>
            <div className="space-y-1 text-center sm:text-left relative z-10 flex-1">
              <DialogTitle className="text-3xl font-black tracking-tighter">{editUserForm.displayName || 'Teacher Profile'}</DialogTitle>
              <p className="text-muted-foreground font-black uppercase tracking-[0.3em] text-[10px] opacity-60">{manageUser?.email || 'Secure Trace'}</p>
            </div>
            <DialogClose className="absolute right-6 top-6 rounded-full h-10 w-10 bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center z-20 active:scale-90">
              <X className="w-5 h-5 text-white" />
            </DialogClose>
          </div>
          <div className="p-8 space-y-6">
            <Button onClick={handleUpdateUser} disabled={isUpdatingUser} className="w-full h-16 rounded-[1.5rem] font-black text-sm uppercase tracking-widest gap-3 shadow-2xl shadow-primary/30 active:scale-95 transition-all">
              {isUpdatingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Commit Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EducationalLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="w-24 h-24 border-4 border-dashed border-primary/20 rounded-full absolute -inset-4" />
        <div className="w-16 h-16 bg-primary/10 rounded-[1.25rem] flex items-center justify-center relative z-10 shadow-xl">
          <Settings className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
      {message && <p className="font-black text-sm uppercase tracking-[0.3em] text-muted-foreground opacity-60">{message}</p>}
    </div>
  );
}
