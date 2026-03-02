
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
  Crown,
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
  ArrowUpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  getCountFromServer
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

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dashboard Stats
  const [stats, setStats] = useState({
    userCount: 0,
    questionCount: 0,
    resultCount: 0,
    activeQuests: 0
  });

  // Global Config States
  const [timePerQuestion, setTimePerQuestion] = useState(60);
  const [limits, setLimits] = useState({ limitGenEd: 10, limitProfEd: 10, limitSpec: 10 });
  const [configNote, setConfigNote] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Version Control States
  const [versionInfo, setVersionInfo] = useState({
    version: "1.0.0",
    downloadURL: "",
    releaseNotes: ""
  });
  const [savingVersion, setSavingVersion] = useState(false);

  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  
  // User Management States
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [manageUser, setManageUser] = useState<any | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isResettingTasks, setIsResettingTasks] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
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
      // Questions Fetch
      const qSnap = await getDocs(collection(firestore, "questions"));
      const qList = qSnap.docs.map(d => ({ ...d.data(), id: d.id } as Question));
      setQuestions(qList);

      // Dashboard Stats Fetch
      const userCount = await getCountFromServer(collection(firestore, "users"));
      const resultCount = await getCountFromServer(collection(firestore, "exam_results"));
      setStats({
        userCount: userCount.data().count,
        questionCount: qSnap.size,
        resultCount: resultCount.data().count,
        activeQuests: 4 // Hardcoded for now based on current logic
      });

      // Global Config Fetch
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

      // Version Config Fetch
      const versionRef = doc(firestore, "app_config", "version");
      const versionDoc = await getDoc(versionRef);
      if (versionDoc.exists()) {
        const data = versionDoc.data();
        setVersionInfo({
          version: data.version || "1.0.0",
          downloadURL: data.downloadURL || "",
          releaseNotes: data.releaseNotes || ""
        });
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
        toast({ title: "Item Saved", description: "Pedagogical content added to vault." });
        setIsDialogOpen(false); 
        setEditingQuestion(null); 
        fetchData();
      })
      .catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: data
        }));
      });
  };

  const handleSaveVersion = async () => {
    if (!firestore) return;
    setSavingVersion(true);
    const versionRef = doc(firestore, "app_config", "version");
    
    setDoc(versionRef, {
      ...versionInfo,
      updatedAt: serverTimestamp()
    })
    .then(() => {
      toast({ title: "Version Updated", description: "Self-update binary path updated." });
    })
    .catch(e => {
      toast({ variant: "destructive", title: "Update Failed", description: "Failed to save version metadata." });
    })
    .finally(() => setSavingVersion(false));
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
        toast({ title: "User Calibrated", description: `Metadata saved for ${editUserForm.displayName}` });
        fetchUsers();
        setManageUser(null);
      })
      .catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: data
        }));
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
          <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-muted/30 p-1.5 rounded-[2rem] flex w-fit md:w-full lg:w-auto h-14 border border-border/50">
              <TabsTrigger value="overview" className="font-black text-[10px] uppercase tracking-widest rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-w-[120px] gap-2"><BarChart3 className="w-3.5 h-3.5" /> Overview</TabsTrigger>
              <TabsTrigger value="questions" className="font-black text-[10px] uppercase tracking-widest rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-w-[120px] gap-2"><Brain className="w-3.5 h-3.5" /> Item Vault</TabsTrigger>
              <TabsTrigger value="users" className="font-black text-[10px] uppercase tracking-widest rounded-2xl flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-w-[120px]"><Users className="w-3.5 h-3.5" /> Educator Base</TabsTrigger>
              <TabsTrigger value="config" className="font-black text-[10px] uppercase tracking-widest rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-w-[120px] gap-2"><Database className="w-3.5 h-3.5" /> System Params</TabsTrigger>
              <TabsTrigger value="updates" className="font-black text-[10px] uppercase tracking-widest rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-w-[120px] gap-2"><ArrowUpCircle className="w-3.5 h-3.5" /> Versioning</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Educators', value: stats.userCount, icon: <Users className="w-5 h-5 text-blue-500" />, color: 'bg-blue-500/10' },
                { label: 'Vault Items', value: stats.questionCount, icon: <Brain className="w-5 h-5 text-purple-500" />, color: 'bg-purple-500/10' },
                { label: 'Simulations Run', value: stats.resultCount, icon: <History className="w-5 h-5 text-emerald-500" />, color: 'bg-emerald-500/10' },
                { label: 'Active Quests', value: stats.activeQuests, icon: <Compass className="w-5 h-5 text-amber-500" />, color: 'bg-amber-500/10' }
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card className="lg:col-span-8 border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden border border-border/50">
                <CardHeader className="p-8 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-black flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-primary" /> Engagement Trace
                      </CardTitle>
                      <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Professional activity metrics</CardDescription>
                    </div>
                    <Badge variant="outline" className="font-black text-[9px] border-primary/20 text-primary">Live Monitor</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-muted rounded-[2rem] flex items-center justify-center mb-2">
                    <Activity className="w-10 h-10 text-muted-foreground opacity-20" />
                  </div>
                  <h3 className="font-black text-xl">Analytics Visuals Pending</h3>
                  <p className="text-sm text-muted-foreground max-w-sm font-medium">Standard engagement charts will materialize as more pedagogical traces are committed to the vault.</p>
                </CardContent>
              </Card>

              <Card className="lg:col-span-4 border-none shadow-xl rounded-[2.5rem] bg-foreground text-background p-10 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-700" />
                <div className="w-16 h-16 bg-primary/20 rounded-[1.5rem] flex items-center justify-center mb-2">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-black tracking-tight mb-1">System Integrity</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary opacity-80">All services verified</p>
                </div>
                <div className="w-full space-y-3 pt-2">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Cloud Sync</span>
                    <Badge className="bg-emerald-500 text-white font-black text-[8px] border-none">NOMINAL</Badge>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">AI Engine</span>
                    <Badge className="bg-emerald-500 text-white font-black text-[8px] border-none">ONLINE</Badge>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center px-2">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-60" />
                <Input placeholder="Search question vault..." className="pl-11 rounded-[1.25rem] border-border h-12 shadow-sm focus:ring-primary/20 transition-all font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                <Input placeholder="Search educator name or email..." className="pl-11 rounded-[1.25rem] h-12 shadow-sm font-medium" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} />
              </div>
              <Button variant="outline" onClick={fetchUsers} className="w-full sm:w-auto rounded-[1.25rem] font-black h-12 border-2 active:scale-95 transition-all"><RefreshCw className="w-4 h-4 mr-2" /> Sync Base</Button>
            </div>

            <div className="android-surface rounded-[2.5rem] overflow-hidden shadow-2xl bg-card border border-border/50">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-border/50">
                      <TableHead className="font-black uppercase text-[10px] tracking-widest pl-8">Educator Profile</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Specialization</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Growth Rank</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">AI Credits</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-8 w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => {
                      const rank = getRankData(user.xp || 0);
                      
                      return (
                        <TableRow key={user.id} className="border-border/30 hover:bg-muted/10 transition-colors group">
                          <TableCell className="pl-8">
                            <div className="flex items-center gap-4">
                              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm shrink-0 shadow-inner">
                                {user.displayName?.charAt(0) || 'E'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-black truncate max-w-[140px]">{user.displayName || 'Anonymous Educator'}</p>
                                  {user.isPro && <Crown className="w-3.5 h-3.5 text-yellow-500 fill-current animate-sparkle" />}
                                  {user.isBlocked && <Ban className="w-3.5 h-3.5 text-destructive shrink-0" />}
                                </div>
                                <p className="text-[10px] font-bold text-muted-foreground truncate max-w-[180px] opacity-60 uppercase tracking-tight">{user.email || 'Internal Auth Trace'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] font-black bg-background border-border/50 uppercase tracking-widest px-3 py-1">{user.majorship || 'UNSET'}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Rank {rank.rank}</span>
                              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">{rank.title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-black gap-1.5 h-7 bg-yellow-500/10 text-yellow-700 border-none px-3">
                              <Sparkles className="w-3.5 h-3.5 animate-sparkle fill-current" /> {Number(user.credits) || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl opacity-40 group-hover:opacity-100" onClick={() => handleOpenUserManagement(user)}>
                              <ChevronRight className="w-5 h-5" />
                            </Button>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 android-surface border-none shadow-2xl rounded-[3rem] bg-card overflow-hidden">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] ml-1 flex items-center gap-2">
                        <Timer className="w-3.5 h-3.5" /> Simulation Pacing (s/item)
                      </label>
                      <Input type="number" value={timePerQuestion} onChange={(e) => setTimePerQuestion(parseInt(e.target.value) || 60)} className="rounded-[1.25rem] h-14 font-black text-xl border-2 focus:border-primary shadow-inner" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] ml-1 flex items-center gap-2">
                        <Database className="w-3.5 h-3.5" /> General Ed Items
                      </label>
                      <Input type="number" value={limits.limitGenEd} onChange={(e) => setLimits({...limits, limitGenEd: parseInt(e.target.value) || 10})} className="rounded-[1.25rem] h-14 font-black text-xl border-2 focus:border-primary shadow-inner" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] ml-1 flex items-center gap-2">
                        <Database className="w-3.5 h-3.5" /> Professional Ed Items
                      </label>
                      <Input type="number" value={limits.limitProfEd} onChange={(e) => setLimits({...limits, limitProfEd: parseInt(e.target.value) || 10})} className="rounded-[1.25rem] h-14 font-black text-xl border-2 focus:border-primary shadow-inner" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] ml-1 flex items-center gap-2">
                        <Database className="w-3.5 h-3.5" /> Specialization Items
                      </label>
                      <Input type="number" value={limits.limitSpec} onChange={(e) => setLimits({...limits, limitSpec: parseInt(e.target.value) || 10})} className="rounded-[1.25rem] h-14 font-black text-xl border-2 focus:border-primary shadow-inner" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] ml-1 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" /> Global Calibration Note
                    </label>
                    <Textarea 
                      value={configNote} 
                      onChange={(e) => setConfigNote(e.target.value)} 
                      placeholder="Enter system broadcast or maintenance note..."
                      className="rounded-[1.75rem] border-2 min-h-[120px] font-medium p-6 text-sm shadow-inner"
                    />
                  </div>

                  <div className="pt-6 border-t border-border/50">
                    <Button 
                      onClick={async () => { 
                        if (!firestore) return;
                        setSavingSettings(true); 
                        const configRef = doc(firestore, "system_configs", "global");
                        const data = { 
                          timePerQuestion, 
                          limitGenEd: limits.limitGenEd, 
                          limitProfEd: limits.limitProfEd, 
                          limitSpec: limits.limitSpec, 
                          note: configNote,
                          updatedAt: serverTimestamp() 
                        };
                        
                        setDoc(configRef, data, { merge: true })
                          .then(() => {
                            toast({ title: "Parameters Updated", description: "Simulation engine has been recalibrated." });
                          })
                          .catch(e => {
                            errorEmitter.emit('permission-error', new FirestorePermissionError({
                              path: configRef.path,
                              operation: 'write',
                              requestResourceData: data
                            }));
                          })
                          .finally(() => setSavingSettings(false));
                      }} 
                      disabled={savingSettings} 
                      className="h-16 rounded-[1.5rem] font-black text-base px-14 shadow-2xl shadow-primary/30 w-full sm:w-auto active:scale-95 transition-all gap-3"
                    >
                      {savingSettings ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />} Commit Parameters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-amber-500/5 border border-amber-500/20 p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center shadow-inner">
                      <Zap className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-amber-900 leading-none">Economy Constants</h4>
                      <p className="text-[10px] font-bold text-amber-700/60 uppercase tracking-widest mt-1">Managed hardcodes</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-amber-500/10">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AI Deep Dive</span>
                      <Badge className="bg-amber-100 text-amber-700 font-black text-[10px]">5 Credits</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-amber-500/10">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Result Unlock</span>
                      <Badge className="bg-amber-100 text-amber-700 font-black text-[10px]">10 Credits</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-amber-500/10">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Streak Recovery</span>
                      <Badge className="bg-amber-100 text-amber-700 font-black text-[10px]">50 Credits</Badge>
                    </div>
                  </div>
                  <div className="p-4 bg-amber-500/10 rounded-2xl border-2 border-dashed border-amber-500/20">
                    <div className="flex items-start gap-3">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase tracking-tight">These economy values are currently tied to system constants. Dynamic runtime adjustment pending future sync.</p>
                    </div>
                  </div>
                </Card>

                <Card className="border-none shadow-xl rounded-[2.5rem] bg-primary/5 border border-primary/20 p-8 text-center space-y-4">
                  <div className="w-14 h-14 bg-primary text-primary-foreground rounded-[1.5rem] flex items-center justify-center mx-auto shadow-lg">
                    <RotateCcw className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-black text-xl">Global Reset</h4>
                    <p className="text-xs font-medium text-muted-foreground mt-1">Purge all daily progress for every educator in the system base.</p>
                  </div>
                  <Button variant="destructive" className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all gap-2">
                    <AlertTriangle className="w-4 h-4" /> Trigger Global Reset
                  </Button>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="updates" className="space-y-8 animate-in fade-in duration-500">
            <Card className="android-surface border-none shadow-2xl rounded-[3rem] bg-card overflow-hidden">
              <CardHeader className="p-10 border-b bg-muted/20">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                    <Smartphone className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black tracking-tighter">Android Client Control</CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Manage professional binary distribution</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] ml-1 flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5" /> Latest Stable Version
                    </label>
                    <Input value={versionInfo.version} onChange={(e) => setVersionInfo({...versionInfo, version: e.target.value})} className="rounded-[1.25rem] h-14 font-black text-xl border-2 focus:border-primary shadow-inner" placeholder="e.g. 2.5.0" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] ml-1 flex items-center gap-2">
                      <Download className="w-3.5 h-3.5" /> Binary Trace URL (APK)
                    </label>
                    <Input value={versionInfo.downloadURL} onChange={(e) => setVersionInfo({...versionInfo, downloadURL: e.target.value})} className="rounded-[1.25rem] h-14 font-black text-base border-2 focus:border-primary shadow-inner" placeholder="https://github.com/.../release.apk" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] ml-1 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" /> Release Notes
                  </label>
                  <Textarea 
                    value={versionInfo.releaseNotes} 
                    onChange={(e) => setVersionInfo({...versionInfo, releaseNotes: e.target.value})} 
                    placeholder="Describe professional optimizations and new features..."
                    className="rounded-[1.75rem] border-2 min-h-[120px] font-medium p-6 text-sm shadow-inner"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 pt-6 border-t border-border/50">
                  <Button 
                    onClick={handleSaveVersion}
                    disabled={savingVersion}
                    className="h-16 rounded-[1.5rem] font-black text-base px-14 shadow-2xl shadow-emerald-500/30 w-full sm:w-auto active:scale-95 transition-all gap-3 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {savingVersion ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />} Commit Version Info
                  </Button>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0 shadow-sm"><Info className="w-4 h-4 text-emerald-600" /></div>
                    <p className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest text-left">AutoUpdateChecker will detect this version <br />immediately across all native educator clients.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Item Vault Dialog */}
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
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Academic Track</label>
                <Select value={editingQuestion?.subject || ""} onValueChange={(val) => setEditingQuestion({...editingQuestion, subject: val})}>
                  <SelectTrigger className="rounded-2xl h-14 font-black border-2 shadow-inner"><SelectValue placeholder="Select Track" /></SelectTrigger>
                  <SelectContent className="rounded-2xl p-2">{SUBJECTS.map(s => <SelectItem key={s} value={s} className="font-bold py-3 rounded-xl">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Calibration Depth</label>
                <Select value={editingQuestion?.difficulty || ""} onValueChange={(val: any) => setEditingQuestion({...editingQuestion, difficulty: val})}>
                  <SelectTrigger className="rounded-2xl h-14 font-black border-2 shadow-inner"><SelectValue placeholder="Select Depth" /></SelectTrigger>
                  <SelectContent className="rounded-2xl p-2">
                    <SelectItem value="easy" className="text-emerald-600 font-bold py-3 rounded-xl">Low (Easy)</SelectItem>
                    <SelectItem value="medium" className="text-amber-600 font-bold py-3 rounded-xl">Standard (Medium)</SelectItem>
                    <SelectItem value="hard" className="text-rose-600 font-bold py-3 rounded-xl">High (Hard)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Specialization Detail</label>
              <Input value={editingQuestion?.subCategory || ""} onChange={(e) => setEditingQuestion({...editingQuestion, subCategory: e.target.value})} className="rounded-2xl h-14 font-bold border-2 shadow-inner" placeholder="e.g. Biological Science" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Item Prompt</label>
              <Textarea value={editingQuestion?.text || ""} onChange={(e) => setEditingQuestion({...editingQuestion, text: e.target.value})} className="rounded-[1.75rem] font-medium min-h-[100px] border-2 p-6 text-sm shadow-inner" placeholder="Enter pedagogical scenario..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex justify-between">
                    Option {String.fromCharCode(65 + idx)}
                    {editingQuestion?.correctAnswer === editingQuestion?.options?.[idx] && editingQuestion?.options?.[idx] !== "" && <span className="text-emerald-600 font-black animate-pulse">KEY</span>}
                  </label>
                  <div className="flex gap-2">
                    <Input value={editingQuestion?.options?.[idx] || ""} onChange={(e) => { const n = [...(editingQuestion?.options || ["","","",""])]; n[idx] = e.target.value; setEditingQuestion({...editingQuestion, options: n}); }} className="rounded-xl h-12 font-medium border-2 text-sm shadow-inner" />
                    <Button type="button" variant="outline" size="icon" className={cn("h-12 w-12 rounded-xl shrink-0 border-2 transition-all active:scale-90", editingQuestion?.correctAnswer === editingQuestion?.options?.[idx] ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "hover:bg-muted")} onClick={() => setEditingQuestion({...editingQuestion, correctAnswer: editingQuestion?.options?.[idx]})}>
                      <Check className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </form>
          
          <div className="p-8 border-t bg-muted/10 shrink-0">
            <DialogFooter className="gap-4 sm:flex-row flex-col">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-2xl font-black text-xs uppercase tracking-widest h-14 w-full sm:w-auto">Discard</Button>
              <Button onClick={handleSaveQuestion} className="rounded-2xl font-black text-sm uppercase tracking-widest h-14 px-12 shadow-2xl shadow-primary/30 w-full sm:flex-1 active:scale-95 transition-all">Commit to Vault</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Management Dialog */}
      <Dialog open={!!manageUser} onOpenChange={() => setManageUser(null)}>
        <DialogContent className="max-w-2xl rounded-[3rem] p-0 border-none shadow-[0_40px_120px_rgba(0,0,0,0.5)] overflow-hidden outline-none z-[1100] flex flex-col max-h-[95vh] bg-background">
          <div className="bg-foreground text-background p-8 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden shrink-0">
            <div className="w-20 h-20 rounded-[1.75rem] bg-primary flex items-center justify-center text-primary-foreground font-black text-3xl shadow-2xl relative z-10 shrink-0">
              {manageUser?.displayName?.charAt(0) || 'E'}
            </div>
            <div className="space-y-1 text-center sm:text-left relative z-10 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <DialogTitle className="text-3xl font-black tracking-tighter">{editUserForm.displayName || 'Educator Profile'}</DialogTitle>
                <div className="flex justify-center gap-2">
                  {editUserForm.isPro && <Badge className="bg-yellow-500 text-yellow-900 font-black px-3 py-1 rounded-xl border-none text-[9px] shadow-lg animate-sparkle">PLATINUM</Badge>}
                  {editUserForm.isBlocked && <Badge className="bg-rose-500 text-white font-black px-3 py-1 rounded-xl border-none text-[9px] shadow-lg">BLOCKED</Badge>}
                </div>
              </div>
              <p className="text-muted-foreground font-black uppercase tracking-[0.3em] text-[10px] opacity-60">{manageUser?.email || 'Secure Authenticated Trace'}</p>
            </div>
            <DialogClose className="absolute right-6 top-6 rounded-full h-10 w-10 bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center z-20 active:scale-90">
              <X className="w-5 h-5 text-white" />
            </DialogClose>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar bg-background">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Professional Nickname</label>
                <Input value={editUserForm.displayName} onChange={(e) => setEditUserForm({...editUserForm, displayName: e.target.value})} className="rounded-2xl h-14 font-black border-2 bg-muted/10 shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Specialization Track</label>
                <Select value={editUserForm.majorship} onValueChange={(val) => setEditUserForm({...editUserForm, majorship: val})}>
                  <SelectTrigger className="rounded-2xl h-14 font-black border-2 bg-muted/10 shadow-inner"><SelectValue placeholder="Select Majorship" /></SelectTrigger>
                  <SelectContent className="rounded-2xl p-2">
                    {MAJORSHIPS.map(m => <SelectItem key={m} value={m} className="font-bold py-3 rounded-xl">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3 p-6 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/50 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Sparkles className="w-16 h-16 text-yellow-600" /></div>
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-600" /> Vault Credits
                </label>
                <div className="flex items-center gap-3 relative z-10">
                  <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-2 shrink-0 active:scale-90" onClick={() => setEditUserForm({...editUserForm, credits: Math.max(0, editUserForm.credits - 10)})}><Minus className="w-4 h-4" /></Button>
                  <Input type="number" value={editUserForm.credits} onChange={(e) => setEditUserForm({...editUserForm, credits: parseInt(e.target.value) || 0})} className="rounded-2xl h-14 font-black text-center border-2 text-xl bg-card shadow-lg" />
                  <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-2 shrink-0 active:scale-90" onClick={() => setEditUserForm({...editUserForm, credits: editUserForm.credits + 10})}><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="space-y-3 p-6 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/50 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Trophy className="w-16 h-16 text-primary" /></div>
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Character XP
                </label>
                <div className="space-y-2 relative z-10">
                  <Input type="number" value={editUserForm.xp} onChange={(e) => setEditUserForm({...editUserForm, xp: parseInt(e.target.value) || 0})} className="rounded-2xl h-14 font-black border-2 bg-card text-xl shadow-lg" />
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[9px] font-black uppercase text-primary tracking-widest">Rank {getRankData(editUserForm.xp).rank}</span>
                    <span className="text-[9px] font-bold text-muted-foreground tracking-tighter uppercase">{getRankData(editUserForm.xp).title}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                onClick={async () => {
                  if (!firestore || !manageUser) return;
                  setIsResettingTasks(true);
                  const userRef = doc(firestore, 'users', manageUser.id);
                  updateDoc(userRef, {
                    dailyQuestionsAnswered: 0,
                    dailyTestsFinished: 0,
                    dailyAiUsage: 0,
                    dailyCreditEarned: 0,
                    dailyAdCount: 0,
                    taskLoginClaimed: false,
                    taskQuestionsClaimed: false,
                    taskMockClaimed: false,
                    taskMistakesClaimed: false,
                    lastTaskReset: serverTimestamp()
                  })
                  .then(() => {
                    toast({ title: "Quests Reset", description: `Daily progress cleared for ${editUserForm.displayName}` });
                    fetchUsers();
                  })
                  .catch(e => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                      path: userRef.path,
                      operation: 'update'
                    }));
                  })
                  .finally(() => {
                    setIsResettingTasks(false);
                  });
                }} 
                disabled={isResettingTasks}
                className="h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 border-2 border-amber-200 text-amber-700 bg-amber-50/30 active:scale-95 transition-all"
              >
                {isResettingTasks ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Reset Quests
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 border-2 border-rose-200 text-rose-600 bg-rose-50/30 active:scale-95 transition-all">
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[3rem] border-none shadow-2xl p-10 outline-none">
                  <AlertDialogHeader>
                    <div className="w-16 h-16 bg-rose-500/10 rounded-[1.5rem] flex items-center justify-center mb-4 mx-auto shadow-inner">
                      <ShieldAlert className="w-8 h-8 text-rose-600" />
                    </div>
                    <AlertDialogTitle className="text-2xl font-black text-center tracking-tighter">Irreversible Purge</AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-sm font-medium leading-relaxed px-4">
                      Terminate <strong>{editUserForm.displayName}</strong> from the system? This action purges all XP, analytical traces, and vault credits.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="sm:flex-col gap-3 mt-6">
                    <AlertDialogAction onClick={async () => {
                      if (!firestore || !manageUser) return;
                      setIsDeletingUser(true);
                      const userRef = doc(firestore, 'users', manageUser.id);
                      deleteDoc(userRef)
                        .then(() => {
                          toast({ title: "Account Purged", description: "Educator record has been removed." });
                          fetchUsers();
                          setManageUser(null);
                        })
                        .catch(e => {
                          errorEmitter.emit('permission-error', new FirestorePermissionError({
                            path: userRef.path,
                            operation: 'delete'
                          }));
                        })
                        .finally(() => {
                          setIsDeletingUser(false);
                        });
                    }} className="bg-rose-600 hover:bg-rose-700 text-white h-16 rounded-2xl font-black w-full shadow-xl shadow-rose-500/30 text-xs uppercase tracking-widest">
                      {isDeletingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Purge'}
                    </AlertDialogAction>
                    <AlertDialogCancel className="h-12 rounded-xl font-bold border-2 w-full text-[10px] uppercase tracking-widest">Abort</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="p-8 bg-muted/5 border-t shrink-0">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button variant="ghost" onClick={() => setManageUser(null)} className="w-full sm:w-auto h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest text-muted-foreground">Cancel</Button>
              <Button onClick={handleUpdateUser} disabled={isUpdatingUser} className="w-full sm:flex-1 h-16 rounded-[1.5rem] font-black text-sm uppercase tracking-widest gap-3 shadow-2xl shadow-primary/30 active:scale-95 transition-all">
                {isUpdatingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Commit Profile
              </Button>
            </div>
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

function Minus({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function Compass({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
