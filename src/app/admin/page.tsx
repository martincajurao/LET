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
  FileText,
  Brain,
  Users,
  RotateCcw,
  Coins,
  ShieldCheck,
  Minus,
  ChevronRight,
  Crown,
  Download,
  Smartphone,
  Check,
  Upload,
  User,
  Activity,
  ShieldAlert,
  Zap,
  Clock,
  Ban,
  Trophy,
  AlertTriangle
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
  increment
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Question, MAJORSHIPS, SUBJECTS } from "@/app/lib/mock-data";
import { format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getRankData } from '@/lib/xp-system';

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timePerQuestion, setTimePerQuestion] = useState(60);
  const [limits, setLimits] = useState({ limitGenEd: 10, limitProfEd: 10, limitSpec: 10 });
  const [savingSettings, setSavingSettings] = useState(false);
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

  // APK Upload state
  const [apkVersion, setApkVersion] = useState("");
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [uploadingApk, setUploadingApk] = useState(false);
  const [currentApkInfo, setCurrentApkInfo] = useState<any>(null);
  const [loadingApkInfo, setLoadingApkInfo] = useState(false);

  const fetchData = async () => {
    if (!firestore) return;
    setLoading(true);
    try {
      const qSnap = await getDocs(collection(firestore, "questions"));
      const qList = qSnap.docs.map(d => ({ ...d.data(), id: d.id } as Question));
      setQuestions(qList);
      const configDoc = await getDoc(doc(firestore, "system_configs", "global"));
      if (configDoc.exists()) {
        const data = configDoc.data();
        setTimePerQuestion(data.timePerQuestion || 60);
        setLimits({ limitGenEd: data.limitGenEd || 10, limitProfEd: data.limitProfEd || 10, limitSpec: data.limitSpec || 10 });
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    if (!firestore) return;
    try {
      const usersQuery = query(collection(firestore, "users"), orderBy("lastActiveDate", "desc"), queryLimit(100));
      const usersSnap = await getDocs(usersQuery);
      setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) { console.error(error); }
  };

  const fetchApkInfo = async () => {
    setLoadingApkInfo(true);
    try {
      const res = await fetch('/api/apk');
      const data = await res.json();
      setCurrentApkInfo(data);
    } catch (error) {
      console.error('Error fetching APK info:', error);
    } finally {
      setLoadingApkInfo(false);
    }
  };

  useEffect(() => { if (firestore) { fetchData(); fetchUsers(); fetchApkInfo(); } }, [firestore]);

  const filteredUsers = useMemo(() => users.filter(u => 
    (u.email?.toLowerCase() || "").includes(userSearchQuery.toLowerCase()) || 
    (u.displayName?.toLowerCase() || "").includes(userSearchQuery.toLowerCase())
  ), [users, userSearchQuery]);

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingQuestion) return;
    try {
      if (editingQuestion.id) await updateDoc(doc(firestore, "questions", editingQuestion.id), editingQuestion);
      else { const id = crypto.randomUUID(); await setDoc(doc(firestore, "questions", id), { ...editingQuestion, id }); }
      toast({ title: "Success", description: "Item saved to vault." });
      setIsDialogOpen(false); setEditingQuestion(null); fetchData();
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }); }
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
    try {
      await updateDoc(doc(firestore, 'users', manageUser.id), {
        displayName: editUserForm.displayName,
        majorship: editUserForm.majorship,
        credits: Number(editUserForm.credits),
        xp: Number(editUserForm.xp),
        isPro: editUserForm.isPro,
        isBlocked: editUserForm.isBlocked,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Profile Updated", description: `Changes saved for ${editUserForm.displayName}` });
      fetchUsers();
      setManageUser(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleResetDailyTasks = async () => {
    if (!firestore || !manageUser) return;
    setIsResettingTasks(true);
    try {
      await updateDoc(doc(firestore, 'users', manageUser.id), {
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
      });
      toast({ title: "Missions Reset", description: `Daily progress cleared for ${editUserForm.displayName}` });
      fetchUsers();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Reset Failed", description: e.message });
    } finally {
      setIsResettingTasks(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!firestore || !manageUser) return;
    setIsDeletingUser(true);
    try {
      await deleteDoc(doc(firestore, 'users', manageUser.id));
      toast({ title: "Account Deleted", description: "Educator record has been removed." });
      fetchUsers();
      setManageUser(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Deletion Failed", description: e.message });
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleUploadApk = async () => {
    if (!apkFile || !apkVersion) {
      toast({ variant: "destructive", title: "Error", description: "Please select a file and enter version" });
      return;
    }
    setUploadingApk(true);
    try {
      const formData = new FormData();
      formData.append('apk', apkFile);
      formData.append('version', apkVersion);
      
      const response = await fetch('/api/apk', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.success) {
        toast({ title: "Success", description: "APK uploaded successfully" });
        setApkFile(null);
        setApkVersion("");
        fetchApkInfo();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message });
    } finally {
      setUploadingApk(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background font-body transition-colors duration-300">
      <Toaster />
      <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-[100] pt-safe flex items-center justify-between px-4 sm:px-8 h-16 sm:h-20">
        <div className="flex items-center gap-4">
          <Link href="/"><Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground"><ArrowLeft className="w-4 h-4" /> Exit</Button></Link>
          <div className="h-8 w-[1px] bg-border mx-2 hidden sm:block" />
          <span className="text-lg font-black tracking-tight flex items-center gap-2 text-foreground"><Settings className="w-5 h-5 text-primary" /> Control Center</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:flex font-black text-[10px] uppercase tracking-widest border-primary/20 text-primary bg-primary/5">Admin Superuser</Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-32">
        <Tabs defaultValue="questions" className="space-y-6">
          <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-muted/30 p-1 rounded-2xl flex w-fit sm:w-full md:w-auto">
              <TabsTrigger value="questions" className="font-bold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-w-[120px]">Item Manager</TabsTrigger>
              <TabsTrigger value="users" className="font-bold rounded-xl flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-w-[120px]"><Users className="w-3.5 h-3.5" /> User Base</TabsTrigger>
              <TabsTrigger value="config" className="font-bold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-w-[120px]">Global Config</TabsTrigger>
              <TabsTrigger value="apk-upload" className="font-bold rounded-xl flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-w-[120px]"><Smartphone className="w-3.5 h-3.5" /> APK Hub</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="questions" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search question vault..." className="pl-9 rounded-xl border-border h-11" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Button onClick={() => { setEditingQuestion({}); setIsDialogOpen(true); }} className="w-full sm:w-auto rounded-xl font-black h-11 px-6 shadow-lg shadow-primary/20"><Plus className="w-4 h-4 mr-2" /> Create New Item</Button>
            </div>
            
            <div className="android-surface rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-bold uppercase text-[10px] w-24">Track</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]">Content Preview</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px] w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.filter(q => q.text.toLowerCase().includes(searchQuery.toLowerCase())).map(q => (
                      <TableRow key={q.id} className="border-border/50 hover:bg-muted/10 transition-colors">
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-black uppercase border-none",
                            q.subject === 'General Education' ? "bg-blue-500/10 text-blue-600" :
                            q.subject === 'Professional Education' ? "bg-purple-500/10 text-purple-600" :
                            "bg-emerald-500/10 text-emerald-600"
                          )}>{q.subject === 'Specialization' ? 'Spec' : q.subject === 'Professional Education' ? 'Prof' : 'Gen'}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          <p className="line-clamp-1 text-foreground/80">{q.text}</p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{q.difficulty} • {q.subCategory || 'No Sub'}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => { setEditingQuestion(q); setIsDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteDoc(doc(firestore!, "questions", q.id)).then(fetchData)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search educator name or email..." className="pl-9 rounded-xl h-11" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} />
              </div>
              <Button variant="outline" onClick={fetchUsers} className="w-full sm:w-auto rounded-xl font-bold h-11 border-2"><RefreshCw className="w-4 h-4 mr-2" /> Refresh Base</Button>
            </div>

            <div className="android-surface rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-bold uppercase text-[10px]">Educator</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]">Track</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] text-center">Progression</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] text-center">Credits</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] text-right">Last Seen</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px] w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => {
                      const rank = getRankData(user.xp || 0);
                      const lastSeen = user.lastActiveDate ? (user.lastActiveDate.toMillis ? user.lastActiveDate.toMillis() : user.lastActiveDate) : null;
                      
                      return (
                        <TableRow key={user.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs shrink-0">
                                {user.displayName?.charAt(0) || 'E'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-black truncate max-w-[120px]">{user.displayName || 'Unnamed'}</p>
                                  {user.isPro && <Crown className="w-3 h-3 text-yellow-500 fill-current" />}
                                  {user.isBlocked && <Ban className="w-3 h-3 text-destructive shrink-0" />}
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{user.email || 'No email'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] font-bold bg-background border-border/50 uppercase truncate max-w-[100px]">{user.majorship || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black text-primary uppercase leading-none">Rank {rank.rank}</span>
                              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{rank.title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-black gap-1 h-6 bg-yellow-500/10 text-yellow-700 border-none">
                              <Coins className="w-3 h-3" /> {Number(user.credits) || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="text-[10px] font-black uppercase text-foreground/60">{lastSeen ? format(lastSeen, 'MMM d, HH:mm') : 'Never'}</p>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenUserManagement(user)}>
                              <ChevronRight className="w-4 h-4" />
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

          <TabsContent value="config" className="space-y-6">
            <Card className="android-surface rounded-[2rem] border-none shadow-xl">
              <CardHeader className="p-8 border-b bg-muted/30">
                <CardTitle className="text-xl font-black flex items-center gap-3"><Settings className="w-6 h-6 text-primary" /> Global Parameters</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest">Adjust simulation engine calibration</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Pacing (s / item)</label>
                    <Input type="number" value={timePerQuestion} onChange={(e) => setTimePerQuestion(parseInt(e.target.value) || 60)} className="rounded-xl h-12 font-black text-lg border-2" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Gen Ed Items</label>
                    <Input type="number" value={limits.limitGenEd} onChange={(e) => setLimits({...limits, limitGenEd: parseInt(e.target.value) || 10})} className="rounded-xl h-12 font-black text-lg border-2" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Prof Ed Items</label>
                    <Input type="number" value={limits.limitProfEd} onChange={(e) => setLimits({...limits, limitProfEd: parseInt(e.target.value) || 10})} className="rounded-xl h-12 font-black text-lg border-2" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Spec Items</label>
                    <Input type="number" value={limits.limitSpec} onChange={(e) => setLimits({...limits, limitSpec: parseInt(e.target.value) || 10})} className="rounded-xl h-12 font-black text-lg border-2" />
                  </div>
                </div>
                <div className="pt-4 border-t border-border/50">
                  <Button onClick={async () => { setSavingSettings(true); await setDoc(doc(firestore!, "system_configs", "global"), { timePerQuestion, limitGenEd: limits.limitGenEd, limitProfEd: limits.limitProfEd, limitSpec: limits.limitSpec, updatedAt: serverTimestamp() }, { merge: true }); setSavingSettings(false); toast({ title: "Configuration Updated", description: "Simulation engine has been recalibrated." }); }} disabled={savingSettings} className="h-14 rounded-2xl font-black text-base px-12 shadow-xl shadow-primary/20 w-full sm:w-auto">
                    {savingSettings ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />} Save System Parameters
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apk-upload" className="space-y-6">
            <Card className="android-surface rounded-[2rem] border-none shadow-xl">
              <CardHeader className="p-8 border-b bg-muted/30">
                <CardTitle className="text-xl font-black flex items-center gap-3">
                  <Smartphone className="w-6 h-6 text-primary" /> APK Management Hub
                </CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest">
                  Deploy the latest Android simulation tool to educators
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="bg-primary/5 rounded-[2rem] p-8 border-2 border-dashed border-primary/20 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-black text-sm uppercase tracking-[0.2em] text-muted-foreground">Live Deployment</h4>
                      {loadingApkInfo ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary mt-2" />
                      ) : currentApkInfo?.version ? (
                        <Badge variant="default" className="font-black text-lg h-9 px-4 rounded-xl bg-primary text-primary-foreground shadow-lg">
                          v{currentApkInfo.version}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-bold h-8 px-4">Offline</Badge>
                      )}
                    </div>
                    {currentApkInfo?.version && (
                      <Button variant="outline" onClick={() => window.open(currentApkInfo.downloadURL, '_blank')} className="h-12 rounded-xl font-black gap-2 border-2 bg-card">
                        <Download className="w-4 h-4" /> Download Binary
                      </Button>
                    )}
                  </div>
                  {currentApkInfo?.version && (
                    <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      <p className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {currentApkInfo.fileName}</p>
                      <div className="w-1 h-1 bg-border rounded-full" />
                      <p className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> {(currentApkInfo.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Target Version String</label>
                      <Input type="text" placeholder="e.g., 2.1.0-stable" value={apkVersion} onChange={(e) => setApkVersion(e.target.value)} className="rounded-xl h-14 font-black border-2" />
                    </div>
                    <div className="p-6 bg-yellow-500/5 rounded-2xl border border-yellow-500/10 flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-medium text-yellow-800 leading-relaxed uppercase tracking-wider">Warning: Deploying a new APK will immediately update the download link for all educators. Ensure binary integrity before upload.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Binary Package (.apk)</label>
                    <div className="border-2 border-dashed border-border rounded-[2rem] h-[180px] text-center hover:border-primary/50 transition-all cursor-pointer relative bg-muted/10 group flex flex-col items-center justify-center">
                      <input type="file" accept=".apk" onChange={(e) => { const file = e.target.files?.[0]; if (file) setApkFile(file); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      {apkFile ? (
                        <div className="space-y-2 relative z-0">
                          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                          <p className="font-black text-sm text-foreground">{apkFile.name}</p>
                          <Badge variant="outline" className="font-bold border-border">{(apkFile.size / 1024 / 1024).toFixed(2)} MB</Badge>
                        </div>
                      ) : (
                        <div className="space-y-3 relative z-0 text-muted-foreground group-hover:text-primary transition-colors">
                          <Upload className="w-12 h-12 mx-auto opacity-20 group-hover:opacity-100" />
                          <div className="space-y-1">
                            <p className="font-black text-sm">Drop Binary or Click</p>
                            <p className="text-[9px] uppercase font-bold tracking-widest opacity-60">Verified APK files only</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/50">
                  <Button onClick={handleUploadApk} disabled={uploadingApk || !apkFile || !apkVersion} className="w-full h-16 rounded-[2rem] font-black text-lg gap-3 shadow-2xl shadow-primary/20">
                    {uploadingApk ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 fill-current" />}
                    {uploadingApk ? "Synchronizing Binary..." : "Deploy to Production"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Question Dialog - Viewport Optimized */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 border-none shadow-[0_30px_80px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[95vh] outline-none">
          <div className="bg-primary/10 p-8 border-b shrink-0">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg"><Brain className="w-6 h-6" /></div>
              {editingQuestion?.id ? 'Edit Academic Item' : 'New Simulation Item'}
            </DialogTitle>
          </div>
          
          <form onSubmit={handleSaveQuestion} className="flex-1 overflow-y-auto no-scrollbar">
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Simulation Track</label>
                  <Select value={editingQuestion?.subject || ""} onValueChange={(val) => setEditingQuestion({...editingQuestion, subject: val})}>
                    <SelectTrigger className="rounded-xl h-12 font-bold border-2"><SelectValue placeholder="Select Track" /></SelectTrigger>
                    <SelectContent className="rounded-xl">{SUBJECTS.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Calibrated Difficulty</label>
                  <Select value={editingQuestion?.difficulty || ""} onValueChange={(val: any) => setEditingQuestion({...editingQuestion, difficulty: val})}>
                    <SelectTrigger className="rounded-xl h-12 font-bold border-2"><SelectValue placeholder="Difficulty" /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="easy" className="text-emerald-600 font-bold">Low (Easy)</SelectItem>
                      <SelectItem value="medium" className="text-amber-600 font-bold">Standard (Medium)</SelectItem>
                      <SelectItem value="hard" className="text-rose-600 font-bold">High (Hard)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Item Majorship (Sub-category)</label>
                <Input value={editingQuestion?.subCategory || ""} onChange={(e) => setEditingQuestion({...editingQuestion, subCategory: e.target.value})} className="rounded-xl h-12 font-bold border-2" placeholder="e.g. Mathematics, Child Development" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Pedagogical content</label>
                <Textarea value={editingQuestion?.text || ""} onChange={(e) => setEditingQuestion({...editingQuestion, text: e.target.value})} className="rounded-[1.5rem] font-medium min-h-[120px] border-2 p-4 text-base" placeholder="Enter the question text here..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Option {String.fromCharCode(65 + idx)} {editingQuestion?.correctAnswer === editingQuestion?.options?.[idx] && editingQuestion?.options?.[idx] !== "" && <Badge variant="secondary" className="ml-2 bg-emerald-500/10 text-emerald-600 text-[8px] h-4">Correct</Badge>}</label>
                    <div className="flex gap-2">
                      <Input value={editingQuestion?.options?.[idx] || ""} onChange={(e) => { const n = [...(editingQuestion?.options || ["","","",""])]; n[idx] = e.target.value; setEditingQuestion({...editingQuestion, options: n}); }} className="rounded-xl h-12 font-medium border-2" />
                      <Button type="button" variant="outline" size="icon" className={cn("h-12 w-12 rounded-xl shrink-0 border-2", editingQuestion?.correctAnswer === editingQuestion?.options?.[idx] ? "bg-emerald-500 border-emerald-500 text-white" : "")} onClick={() => setEditingQuestion({...editingQuestion, correctAnswer: editingQuestion?.options?.[idx]})}>
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-8 border-t bg-muted/5 mt-auto shrink-0">
              <DialogFooter className="gap-3 sm:flex-row flex-col">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold h-12 w-full sm:w-auto">Discard</Button>
                <Button type="submit" className="rounded-xl font-black h-12 px-12 shadow-xl shadow-primary/20 w-full sm:flex-1">Commit to Vault</Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Full User Management Dialog - Viewport Optimized */}
      <Dialog open={!!manageUser} onOpenChange={() => setManageUser(null)}>
        <DialogContent className="max-w-2xl rounded-[3rem] p-0 border-none shadow-[0_30px_100px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col max-h-[95vh] outline-none">
          {/* Header Zone (Fixed) */}
          <div className="bg-foreground text-background p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-10 opacity-10"><User className="w-40 h-40" /></div>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] bg-primary flex items-center justify-center text-primary-foreground font-black text-3xl sm:text-4xl shadow-2xl relative z-10 shrink-0">
              {manageUser?.displayName?.charAt(0) || 'E'}
            </div>
            <div className="space-y-2 text-center sm:text-left relative z-10 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight">{editUserForm.displayName || 'Educator Profile'}</DialogTitle>
                <div className="flex justify-center gap-2">
                  {editUserForm.isPro && <Badge className="bg-yellow-500 text-yellow-900 font-black px-2 py-0.5 rounded-lg border-none shadow-lg text-[10px]">PLATINUM</Badge>}
                  {editUserForm.isBlocked && <Badge className="bg-rose-500 text-white font-black px-2 py-0.5 rounded-lg border-none text-[10px]">BLOCKED</Badge>}
                </div>
              </div>
              <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[9px] opacity-60">{manageUser?.email || 'Authenticated User'}</p>
              <p className="text-[9px] font-black text-primary/80 uppercase tracking-widest">ID: {manageUser?.id}</p>
            </div>
          </div>

          {/* Scrollable Content Zone */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 no-scrollbar bg-background">
            {/* Zone 1: Identity & Tracks */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-primary rounded-full" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Core Identity</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Nickname</label>
                  <Input value={editUserForm.displayName} onChange={(e) => setEditUserForm({...editUserForm, displayName: e.target.value})} className="rounded-xl h-12 font-bold border-2 bg-muted/10" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Specialization</label>
                  <Select value={editUserForm.majorship} onValueChange={(val) => setEditUserForm({...editUserForm, majorship: val})}>
                    <SelectTrigger className="rounded-xl h-12 font-bold border-2 bg-muted/10"><SelectValue placeholder="Select Majorship" /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {MAJORSHIPS.map(m => <SelectItem key={m} value={m} className="font-bold">{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Zone 2: Progress & Economy */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-primary rounded-full" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Progression & Balance</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3 p-5 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/50">
                  <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2">
                    <Coins className="w-3 h-3 text-yellow-600" /> Current Credits
                  </label>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-2 shrink-0" onClick={() => setEditUserForm({...editUserForm, credits: Math.max(0, editUserForm.credits - 10)})}><Minus className="w-4 h-4" /></Button>
                    <Input type="number" value={editUserForm.credits} onChange={(e) => setEditUserForm({...editUserForm, credits: parseInt(e.target.value) || 0})} className="rounded-xl h-12 font-black text-center border-2 text-lg bg-card" />
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-2 shrink-0" onClick={() => setEditUserForm({...editUserForm, credits: editUserForm.credits + 10})}><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="space-y-3 p-5 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/50">
                  <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2">
                    <Trophy className="w-3 h-3 text-primary" /> Total Experience (XP)
                  </label>
                  <div className="space-y-2">
                    <Input type="number" value={editUserForm.xp} onChange={(e) => setEditUserForm({...editUserForm, xp: parseInt(e.target.value) || 0})} className="rounded-xl h-12 font-black border-2 bg-card" />
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[8px] font-black uppercase text-primary tracking-widest">Rank {getRankData(editUserForm.xp).rank}</span>
                      <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">{getRankData(editUserForm.xp).title}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Zone 3: Special Tools */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-primary rounded-full" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Administrative Utilities</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  onClick={handleResetDailyTasks} 
                  disabled={isResettingTasks}
                  className="h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-3 border-2 border-amber-200 text-amber-700 bg-amber-50/30 hover:bg-amber-100 transition-all"
                >
                  {isResettingTasks ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  Force Reset Missions
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-3 border-2 border-rose-200 text-rose-600 bg-rose-50/30 hover:bg-rose-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 outline-none">
                    <AlertDialogHeader>
                      <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                        <AlertTriangle className="w-8 h-8 text-rose-600" />
                      </div>
                      <AlertDialogTitle className="text-2xl font-black text-center">Irreversible Purge</AlertDialogTitle>
                      <AlertDialogDescription className="text-center font-medium">
                        Remove <strong>{editUserForm.displayName}</strong> from the LET Practice base? All XP, credits, and simulation history will be lost.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:flex-col gap-3 mt-6">
                      <AlertDialogAction onClick={handleDeleteUser} className="bg-rose-600 hover:bg-rose-700 text-white h-14 rounded-2xl font-black w-full">
                        {isDeletingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Execute Permanent Deletion'}
                      </AlertDialogAction>
                      <AlertDialogCancel className="h-14 rounded-2xl font-bold border-2 w-full">Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Zone 4: Standing Toggles */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                variant={editUserForm.isPro ? "outline" : "default"} 
                onClick={() => setEditUserForm({...editUserForm, isPro: !editUserForm.isPro})} 
                className={cn(
                  "flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-3 border-2 transition-all", 
                  editUserForm.isPro 
                    ? "border-yellow-500/30 text-yellow-700 bg-yellow-500/5 hover:bg-yellow-500/10" 
                    : "bg-yellow-500 hover:bg-yellow-600 text-yellow-950 shadow-lg shadow-yellow-500/20"
                )}
              >
                <Crown className={cn("w-4 h-4", !editUserForm.isPro && "fill-current")} /> 
                {editUserForm.isPro ? 'Revoke Platinum Access' : 'Grant Platinum Status'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEditUserForm({...editUserForm, isBlocked: !editUserForm.isBlocked})} 
                className={cn(
                  "flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-3 border-2 transition-all", 
                  editUserForm.isBlocked 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" 
                    : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                )}
              >
                {editUserForm.isBlocked ? <ShieldCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                {editUserForm.isBlocked ? 'Restore Educator Access' : 'Restrict Account (Block)'}
              </Button>
            </div>
          </div>

          {/* Action Zone Footer (Fixed) */}
          <div className="p-6 sm:p-10 bg-muted/5 border-t shrink-0">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button variant="ghost" onClick={() => setManageUser(null)} className="w-full sm:w-auto h-14 px-8 rounded-2xl font-bold text-muted-foreground">Discard Changes</Button>
              <Button onClick={handleUpdateUser} disabled={isUpdatingUser} className="w-full sm:flex-1 h-16 rounded-[2rem] font-black text-lg gap-3 shadow-2xl shadow-primary/30">
                {isUpdatingUser ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />} Save Educator Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
