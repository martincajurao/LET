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
  AlertTriangle,
  X
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
  increment
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

  const fetchData = async () => {
    if (!firestore) return;
    setLoading(true);
    
    // Questions Fetch
    getDocs(collection(firestore, "questions"))
      .then(qSnap => {
        const qList = qSnap.docs.map(d => ({ ...d.data(), id: d.id } as Question));
        setQuestions(qList);
      })
      .catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'questions',
          operation: 'list'
        }));
      });

    // Global Config Fetch
    const configRef = doc(firestore, "system_configs", "global");
    getDoc(configRef)
      .then(configDoc => {
        if (configDoc.exists()) {
          const data = configDoc.data();
          setTimePerQuestion(data.timePerQuestion || 60);
          setLimits({ 
            limitGenEd: data.limitGenEd || 10, 
            limitProfEd: data.limitProfEd || 10, 
            limitSpec: data.limitSpec || 10 
          });
        }
      })
      .catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: configRef.path,
          operation: 'get'
        }));
      })
      .finally(() => setLoading(false));
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
        toast({ title: "Success", description: "Item saved to vault." });
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
        toast({ title: "Profile Updated", description: `Changes saved for ${editUserForm.displayName}` });
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
                      <TableHead className="font-bold uppercase text-[10px] text-center">AI Credits</TableHead>
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
                              <Sparkles className="w-3 h-3 animate-sparkle" /> {Number(user.credits) || 0}
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
                  <Button 
                    onClick={async () => { 
                      if (!firestore) return;
                      setSavingSettings(true); 
                      const configRef = doc(firestore, "system_configs", "global");
                      const data = { timePerQuestion, limitGenEd: limits.limitGenEd, limitProfEd: limits.limitProfEd, limitSpec: limits.limitSpec, updatedAt: serverTimestamp() };
                      
                      setDoc(configRef, data, { merge: true })
                        .then(() => {
                          toast({ title: "Configuration Updated", description: "Simulation engine has been recalibrated." });
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
                    className="h-14 rounded-2xl font-black text-base px-12 shadow-xl shadow-primary/20 w-full sm:w-auto"
                  >
                    {savingSettings ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />} Save System Parameters
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Question Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden flex flex-col max-h-[95vh] outline-none">
          <div className="bg-primary/10 p-5 border-b shrink-0 flex items-center justify-between">
            <DialogTitle className="text-xl font-black flex items-center gap-3">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg"><Brain className="w-5 h-5" /></div>
              {editingQuestion?.id ? 'Edit Item' : 'New Item'}
            </DialogTitle>
            <DialogClose className="rounded-full h-8 w-8 bg-background/50 hover:bg-muted transition-colors flex items-center justify-center">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>
          
          <form onSubmit={handleSaveQuestion} className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Simulation Track</label>
                <Select value={editingQuestion?.subject || ""} onValueChange={(val) => setEditingQuestion({...editingQuestion, subject: val})}>
                  <SelectTrigger className="rounded-xl h-11 font-bold border-2"><SelectValue placeholder="Select Track" /></SelectTrigger>
                  <SelectContent className="rounded-xl">{SUBJECTS.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Difficulty</label>
                <Select value={editingQuestion?.difficulty || ""} onValueChange={(val: any) => setEditingQuestion({...editingQuestion, difficulty: val})}>
                  <SelectTrigger className="rounded-xl h-11 font-bold border-2"><SelectValue placeholder="Difficulty" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="easy" className="text-emerald-600 font-bold">Low (Easy)</SelectItem>
                    <SelectItem value="medium" className="text-amber-600 font-bold">Standard (Medium)</SelectItem>
                    <SelectItem value="hard" className="text-rose-600 font-bold">High (Hard)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Item Majorship</label>
              <Input value={editingQuestion?.subCategory || ""} onChange={(e) => setEditingQuestion({...editingQuestion, subCategory: e.target.value})} className="rounded-xl h-11 font-bold border-2" placeholder="e.g. Mathematics" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Question content</label>
              <Textarea value={editingQuestion?.text || ""} onChange={(e) => setEditingQuestion({...editingQuestion, text: e.target.value})} className="rounded-2xl font-medium min-h-[80px] border-2 p-4 text-sm" placeholder="Enter text..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex justify-between">
                    Option {String.fromCharCode(65 + idx)}
                    {editingQuestion?.correctAnswer === editingQuestion?.options?.[idx] && editingQuestion?.options?.[idx] !== "" && <span className="text-emerald-600 font-black">Correct</span>}
                  </label>
                  <div className="flex gap-2">
                    <Input value={editingQuestion?.options?.[idx] || ""} onChange={(e) => { const n = [...(editingQuestion?.options || ["","","",""])]; n[idx] = e.target.value; setEditingQuestion({...editingQuestion, options: n}); }} className="rounded-xl h-11 font-medium border-2 text-sm" />
                    <Button type="button" variant="outline" size="icon" className={cn("h-11 w-11 rounded-xl shrink-0 border-2", editingQuestion?.correctAnswer === editingQuestion?.options?.[idx] ? "bg-emerald-500 border-emerald-500 text-white" : "")} onClick={() => setEditingQuestion({...editingQuestion, correctAnswer: editingQuestion?.options?.[idx]})}>
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </form>
          
          <div className="p-5 border-t bg-muted/5 mt-auto shrink-0">
            <DialogFooter className="gap-3 sm:flex-row flex-col">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold h-11 w-full sm:w-auto">Discard</Button>
              <Button onClick={handleSaveQuestion} className="rounded-xl font-black h-11 px-10 shadow-xl shadow-primary/20 w-full sm:flex-1">Commit to Vault</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Management Dialog */}
      <Dialog open={!!manageUser} onOpenChange={() => setManageUser(null)}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden flex flex-col max-h-[95vh] outline-none">
          <div className="bg-foreground text-background p-5 flex flex-col sm:flex-row items-center gap-4 relative overflow-hidden shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-2xl shadow-xl relative z-10 shrink-0">
              {manageUser?.displayName?.charAt(0) || 'E'}
            </div>
            <div className="space-y-0.5 text-center sm:text-left relative z-10 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <DialogTitle className="text-xl font-black tracking-tight">{editUserForm.displayName || 'Educator Profile'}</DialogTitle>
                <div className="flex justify-center gap-1.5">
                  {editUserForm.isPro && <Badge className="bg-yellow-500 text-yellow-900 font-black px-2 py-0.5 rounded-lg border-none text-[9px]">PLATINUM</Badge>}
                  {editUserForm.isBlocked && <Badge className="bg-rose-500 text-white font-black px-2 py-0.5 rounded-lg border-none text-[9px]">BLOCKED</Badge>}
                </div>
              </div>
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-[8px] opacity-60">{manageUser?.email || 'Authenticated User'}</p>
            </div>
            <DialogClose className="absolute right-4 top-4 rounded-full h-8 w-8 bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center z-20">
              <X className="w-4 h-4 text-white" />
            </DialogClose>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar bg-background">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Nickname</label>
                <Input value={editUserForm.displayName} onChange={(e) => setEditUserForm({...editUserForm, displayName: e.target.value})} className="rounded-xl h-11 font-bold border-2 bg-muted/10" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Specialization</label>
                <Select value={editUserForm.majorship} onValueChange={(val) => setEditUserForm({...editUserForm, majorship: val})}>
                  <SelectTrigger className="rounded-xl h-11 font-bold border-2 bg-muted/10"><SelectValue placeholder="Select Majorship" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {MAJORSHIPS.map(m => <SelectItem key={m} value={m} className="font-bold">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 p-4 bg-muted/20 rounded-2xl border border-border/50">
                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-600 animate-sparkle" /> Current Credits
                </label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-2 shrink-0" onClick={() => setEditUserForm({...editUserForm, credits: Math.max(0, editUserForm.credits - 10)})}><Minus className="w-3.5 h-3.5" /></Button>
                  <Input type="number" value={editUserForm.credits} onChange={(e) => setEditUserForm({...editUserForm, credits: parseInt(e.target.value) || 0})} className="rounded-xl h-10 font-black text-center border-2 text-base bg-card" />
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-2 shrink-0" onClick={() => setEditUserForm({...editUserForm, credits: editUserForm.credits + 10})}><Plus className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <div className="space-y-2 p-4 bg-muted/20 rounded-2xl border border-border/50">
                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2">
                  <Trophy className="w-3 h-3 text-primary" /> Total XP
                </label>
                <div className="space-y-1">
                  <Input type="number" value={editUserForm.xp} onChange={(e) => setEditUserForm({...editUserForm, xp: parseInt(e.target.value) || 0})} className="rounded-xl h-10 font-black border-2 bg-card" />
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[8px] font-black uppercase text-primary tracking-widest">Rank {getRankData(editUserForm.xp).rank}</span>
                    <span className="text-[8px] font-bold text-muted-foreground tracking-tight">{getRankData(editUserForm.xp).title}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    toast({ title: "Missions Reset", description: `Daily progress cleared for ${editUserForm.displayName}` });
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
                className="h-12 rounded-xl font-black text-[9px] uppercase tracking-widest gap-2 border-2 border-amber-200 text-amber-700 bg-amber-50/30"
              >
                {isResettingTasks ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Reset Missions
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="h-12 rounded-xl font-black text-[9px] uppercase tracking-widest gap-2 border-2 border-rose-200 text-rose-600 bg-rose-50/30">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-6 outline-none">
                  <AlertDialogHeader>
                    <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-2 mx-auto">
                      <AlertTriangle className="w-6 h-6 text-rose-600" />
                    </div>
                    <AlertDialogTitle className="text-xl font-black text-center">Irreversible Purge</AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-sm font-medium">
                      Remove <strong>{editUserForm.displayName}</strong> from the LET Practice base? All XP, credits, and history will be lost.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="sm:flex-col gap-2 mt-4">
                    <AlertDialogAction onClick={async () => {
                      if (!firestore || !manageUser) return;
                      setIsDeletingUser(true);
                      const userRef = doc(firestore, 'users', manageUser.id);
                      deleteDoc(userRef)
                        .then(() => {
                          toast({ title: "Account Deleted", description: "Educator record has been removed." });
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
                    }} className="bg-rose-600 hover:bg-rose-700 text-white h-12 rounded-xl font-black w-full">
                      {isDeletingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Deletion'}
                    </AlertDialogAction>
                    <AlertDialogCancel className="h-11 rounded-xl font-bold border-2 w-full">Cancel</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="p-5 bg-muted/5 border-t shrink-0">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button variant="ghost" onClick={() => setManageUser(null)} className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold text-muted-foreground">Cancel</Button>
              <Button onClick={handleUpdateUser} disabled={isUpdatingUser} className="w-full sm:flex-1 h-14 rounded-2xl font-black text-base gap-2 shadow-xl shadow-primary/30">
                {isUpdatingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}