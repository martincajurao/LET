"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  ArrowLeft, 
  Search, 
  Save,
  Loader2,
  Download,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  FileUp,
  Brain,
  Type,
  FileCheck,
  Database,
  Users,
  RotateCcw,
  UserCheck,
  Calendar,
  Crown,
  Coins,
  ShieldAlert,
  ShieldCheck,
  MoreVertical,
  Minus,
  Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
  writeBatch,
  query,
  orderBy,
  limit as queryLimit,
  serverTimestamp,
  increment,
  where
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Question, MAJORSHIPS, SUBJECTS } from "@/app/lib/mock-data";
import { testAIConnection, type TestConnectionOutput } from "@/ai/flows/test-connection-flow";
import { extractRawTextFromPdf } from "@/lib/pdf-extractor";
import { processTextToQuestions } from "@/ai/flows/process-text-to-questions-flow";
import { seedInitialQuestions } from "@/lib/db-seed";
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timePerQuestion, setTimePerQuestion] = useState(60);
  const [limits, setLimits] = useState({ limitGenEd: 10, limitProfEd: 10, limitSpec: 10 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  
  // User Management State
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [manageUser, setManageUser] = useState<any | null>(null);
  const [creditAdjustment, setCreditAdjustment] = useState<number>(0);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // PDF Import State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractingRaw, setExtractingRaw] = useState(false);
  const [extractedRawText, setExtractedRawText] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiSubject, setAiSubject] = useState("");
  const [aiSubCategory, setAiSubCategory] = useState("");
  const [extractedPreview, setExtractedPreview] = useState<Partial<Question>[]>([]);
  const [seeding, setSeeding] = useState(false);

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
    } catch (error) { 
      console.error("Fetch error:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchUsers = async () => {
    if (!firestore) return;
    try {
      const usersQuery = query(collection(firestore, "users"), orderBy("lastActiveDate", "desc"), queryLimit(50));
      const usersSnap = await getDocs(usersQuery);
      setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) { 
      console.error("Error fetching users:", error); 
    }
  };

  useEffect(() => { 
    if (firestore) { 
      fetchData(); 
      fetchUsers(); 
    } 
  }, [firestore]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'General Education': 0, 'Professional Education': 0, 'Specialization': 0 };
    questions.forEach(q => { if (counts[q.subject] !== undefined) counts[q.subject]++; });
    return counts;
  }, [questions]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      (u.email?.toLowerCase() || "").includes(userSearchQuery.toLowerCase()) || 
      (u.displayName?.toLowerCase() || "").includes(userSearchQuery.toLowerCase())
    );
  }, [users, userSearchQuery]);

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingQuestion) return;
    try {
      if (editingQuestion.id) { 
        await updateDoc(doc(firestore, "questions", editingQuestion.id), editingQuestion); 
        toast({ title: "Success", description: "Question updated." }); 
      } else { 
        const newId = crypto.randomUUID(); 
        await setDoc(doc(firestore, "questions", newId), { ...editingQuestion, id: newId }); 
        toast({ title: "Success", description: "New question added." }); 
      }
      setIsDialogOpen(false); 
      setEditingQuestion(null); 
      fetchData();
    } catch (error: any) { 
      toast({ variant: "destructive", title: "Error", description: error.message }); 
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!firestore || !confirm("Delete this question?")) return;
    try { 
      await deleteDoc(doc(firestore, "questions", id)); 
      fetchData(); 
    } catch (error: any) { 
      toast({ variant: "destructive", title: "Error", description: error.message }); 
    }
  };

  // User Management Functions
  const handleUpdateCredits = async (userId: string, amount: number) => {
    if (!firestore || isUpdatingUser) return;
    setIsUpdatingUser(true);
    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        credits: increment(amount)
      });
      toast({ title: "Credits Updated", description: `Adjusted user credits by ${amount}.` });
      fetchUsers();
      setManageUser(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleTogglePro = async (userId: string, currentStatus: boolean) => {
    if (!firestore || isUpdatingUser) return;
    setIsUpdatingUser(true);
    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        isPro: !currentStatus
      });
      toast({ title: "Status Updated", description: `User Pro status set to ${!currentStatus}.` });
      fetchUsers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleResetTasks = async (userId: string) => {
    if (!firestore || isUpdatingUser) return;
    setIsUpdatingUser(true);
    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        dailyQuestionsAnswered: 0,
        dailyTestsFinished: 0,
        mistakesReviewed: 0,
        taskLoginClaimed: false,
        taskQuestionsClaimed: false,
        taskMockClaimed: false,
        taskMistakesClaimed: false,
        dailyCreditEarned: 0,
        lastTaskReset: serverTimestamp()
      });
      toast({ title: "Tasks Reset", description: "User's daily missions have been cleared." });
      fetchUsers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Reset Failed", description: error.message });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleClearAbuse = async (userId: string) => {
    if (!firestore || isUpdatingUser) return;
    setIsUpdatingUser(true);
    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        abuseFlags: [],
        lastAbuseWarning: null
      });
      toast({ title: "Security Cleared", description: "Abuse flags have been removed for this user." });
      fetchUsers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Clear Failed", description: error.message });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Toaster />
      <header className="bg-card border-b sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/"><Button variant="ghost" size="sm" className="gap-2 font-bold text-foreground hover:bg-muted"><ArrowLeft className="w-4 h-4" />Back</Button></Link>
            <span className="text-lg font-black tracking-tight flex items-center gap-2 text-foreground"><Settings className="w-5 h-5 text-primary" /> Admin Panel</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-card"><CardHeader className="p-4"><CardDescription className="text-[10px] font-black uppercase text-muted-foreground">Total Pool</CardDescription><CardTitle className="text-xl font-black text-foreground">{questions.length}</CardTitle></CardHeader></Card>
          <Card className="border-none shadow-sm bg-card"><CardHeader className="p-4"><CardDescription className="text-[10px] font-black uppercase text-muted-foreground">Gen Ed</CardDescription><CardTitle className="text-xl font-black text-foreground">{categoryCounts['General Education']}</CardTitle></CardHeader></Card>
          <Card className="border-none shadow-sm bg-card"><CardHeader className="p-4"><CardDescription className="text-[10px] font-black uppercase text-muted-foreground">Prof Ed</CardDescription><CardTitle className="text-xl font-black text-foreground">{categoryCounts['Professional Education']}</CardTitle></CardHeader></Card>
          <Card className="border-none shadow-sm bg-card"><CardHeader className="p-4"><CardDescription className="text-[10px] font-black uppercase text-muted-foreground">Spec</CardDescription><CardTitle className="text-xl font-black text-foreground">{categoryCounts['Specialization']}</CardTitle></CardHeader></Card>
        </div>

        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="bg-card border p-1 rounded-xl border-border">
            <TabsTrigger value="questions" className="font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Item Manager</TabsTrigger>
            <TabsTrigger value="users" className="font-bold flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Users className="w-3.5 h-3.5" /> User Base</TabsTrigger>
            <TabsTrigger value="pdf-import" className="font-bold flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><FileUp className="w-3.5 h-3.5" /> AI Import</TabsTrigger>
            <TabsTrigger value="config" className="font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">System Config</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            <div className="flex justify-between gap-4 flex-wrap items-center">
              <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search questions..." className="pl-9 bg-card border-border text-foreground" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
              <Button onClick={() => { setEditingQuestion({}); setIsDialogOpen(true); }} className="font-black text-xs"><Plus className="w-4 h-4 mr-2" /> New Question</Button>
            </div>
            <Card className="overflow-hidden border-none shadow-sm rounded-xl bg-card border border-border">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border">
                    <TableHead className="font-black uppercase text-[10px] text-muted-foreground">Track</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-muted-foreground">Question Content</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.filter(q => q.text.toLowerCase().includes(searchQuery.toLowerCase())).map(q => (
                    <TableRow key={q.id} className="hover:bg-muted/10 border-border">
                      <TableCell><Badge variant="outline" className="text-[10px] font-bold text-foreground border-border shrink-0">{q.subject}</Badge></TableCell>
                      <TableCell className="font-medium text-sm text-foreground"><span className="line-clamp-1">{q.text}</span></TableCell>
                      <TableCell className="text-right flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingQuestion(q); setIsDialogOpen(true); }}><Edit className="w-4 h-4 text-primary" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(q.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between gap-4 flex-wrap items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search users by email or name..." className="pl-9 bg-card border-border text-foreground" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} />
              </div>
              <Button variant="outline" onClick={fetchUsers} className="font-bold text-xs"><RefreshCw className="w-4 h-4 mr-2" /> Refresh List</Button>
            </div>
            
            <Card className="overflow-hidden border-none shadow-sm rounded-xl bg-card border border-border">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border">
                    <TableHead className="font-black uppercase text-[10px] text-muted-foreground">Educator</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-muted-foreground">Status</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-muted-foreground text-center">Credits</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-muted-foreground">Last Active</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] text-muted-foreground">Management</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id} className="hover:bg-muted/10 border-border">
                      <TableCell>
                        <div className="flex flex-col">
                          <p className="text-sm font-bold text-foreground">{user.displayName || 'Guest User'}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">{user.email || 'No email'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5 flex-wrap">
                          {user.isPro ? (
                            <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-[9px] font-black uppercase">Platinum</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] font-black uppercase">Standard</Badge>
                          )}
                          {user.abuseFlags?.length > 0 && (
                            <Badge variant="destructive" className="text-[9px] font-black uppercase">Flagged</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-black gap-1">
                          <Coins className="w-3 h-3" /> {user.credits || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-muted-foreground font-medium">
                          {user.lastActiveDate ? new Date(user.lastActiveDate.toDate ? user.lastActiveDate.toDate() : user.lastActiveDate).toLocaleDateString() : 'Never'}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreVertical className="w-4 h-4 text-muted-foreground" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 border-border shadow-2xl">
                            <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1.5">Administrative Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => { setManageUser(user); setCreditAdjustment(0); }} className="font-bold gap-3 rounded-lg py-2.5">
                              <Coins className="w-4 h-4 text-yellow-600" /> Adjust Credits
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTogglePro(user.id, !!user.isPro)} className="font-bold gap-3 rounded-lg py-2.5">
                              <Crown className={cn("w-4 h-4", user.isPro ? "text-muted-foreground" : "text-yellow-500")} /> 
                              {user.isPro ? 'Revoke Platinum' : 'Grant Platinum'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/50" />
                            <DropdownMenuItem onClick={() => handleResetTasks(user.id)} className="font-bold gap-3 rounded-lg py-2.5">
                              <RotateCcw className="w-4 h-4 text-blue-500" /> Reset Daily Tasks
                            </DropdownMenuItem>
                            {user.abuseFlags?.length > 0 && (
                              <DropdownMenuItem onClick={() => handleClearAbuse(user.id)} className="font-bold gap-3 rounded-lg py-2.5 text-emerald-600">
                                <ShieldCheck className="w-4 h-4" /> Clear Security Flags
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-border/50" />
                            <DropdownMenuItem className="font-bold gap-3 rounded-lg py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive">
                              <Trash2 className="w-4 h-4" /> Delete Profile
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <Card className="overflow-hidden border-none shadow-sm rounded-xl bg-card border border-border">
              <CardHeader className="p-6">
                <CardTitle className="text-lg font-black flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Simulation Settings</CardTitle>
                <CardDescription className="text-sm">Configure exam parameters and limits.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Time per Item (s)</label>
                    <Input type="number" value={timePerQuestion} onChange={(e) => setTimePerQuestion(parseInt(e.target.value) || 60)} className="bg-background border-border font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Gen Ed Items</label>
                    <Input type="number" value={limits.limitGenEd} onChange={(e) => setLimits({...limits, limitGenEd: parseInt(e.target.value) || 10})} className="bg-background border-border font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Prof Ed Items</label>
                    <Input type="number" value={limits.limitProfEd} onChange={(e) => setLimits({...limits, limitProfEd: parseInt(e.target.value) || 10})} className="bg-background border-border font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Spec Items</label>
                    <Input type="number" value={limits.limitSpec} onChange={(e) => setLimits({...limits, limitSpec: parseInt(e.target.value) || 10})} className="bg-background border-border font-bold" />
                  </div>
                </div>
                <Button 
                  onClick={async () => {
                    if (!firestore) return;
                    setSavingSettings(true);
                    try {
                      await setDoc(doc(firestore, "system_configs", "global"), {
                        timePerQuestion,
                        limitGenEd: limits.limitGenEd,
                        limitProfEd: limits.limitProfEd,
                        limitSpec: limits.limitSpec,
                        updatedAt: serverTimestamp()
                      }, { merge: true });
                      toast({ title: "Settings Saved", description: "Simulation parameters updated." });
                    } catch (error: any) {
                      toast({ variant: "destructive", title: "Error", description: error.message });
                    } finally {
                      setSavingSettings(false);
                    }
                  }}
                  disabled={savingSettings}
                  className="font-black h-12 px-8 rounded-xl shadow-lg shadow-primary/20"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Configuration
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm rounded-xl bg-card border border-border">
              <CardHeader className="p-6">
                <CardTitle className="text-lg font-black flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> Database Management</CardTitle>
                <CardDescription className="text-sm">Manage question database and seeding.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                <div className="flex gap-3">
                  <Button 
                    onClick={async () => {
                      if (!firestore) return;
                      setSeeding(true);
                      try {
                        await seedInitialQuestions(firestore);
                        toast({ title: "Seeding Complete", description: "Standard items added to pool." });
                        fetchData();
                      } catch (error: any) {
                        toast({ variant: "destructive", title: "Error", description: error.message });
                      } finally {
                        setSeeding(false);
                      }
                    }}
                    disabled={seeding}
                    variant="outline"
                    className="font-bold h-12 rounded-xl"
                  >
                    {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Seed Default Items
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pdf-import" className="space-y-6">
            <Card className="overflow-hidden border-none shadow-sm rounded-xl bg-card border border-border">
              <CardHeader className="p-6">
                <CardTitle className="text-lg font-black flex items-center gap-2"><FileUp className="w-5 h-5 text-primary" /> PDF Question Import</CardTitle>
                <CardDescription className="text-sm">Import questions from PDF documents using AI analysis.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Target Subject</label>
                      <Select value={aiSubject} onValueChange={setAiSubject}>
                        <SelectTrigger className="bg-background border-border h-12 rounded-xl font-bold"><SelectValue placeholder="Select subject track" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {SUBJECTS.map(s => <SelectItem key={s} value={s} className="font-bold py-2">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Major Category (Optional)</label>
                      <Select value={aiSubCategory} onValueChange={setAiSubCategory}>
                        <SelectTrigger className="bg-background border-border h-12 rounded-xl font-bold"><SelectValue placeholder="Select specific major" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {MAJORSHIPS.map(m => <SelectItem key={m} value={m} className="font-bold py-2">{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <input type="file" accept=".pdf" ref={pdfInputRef} onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="hidden" />
                    <Button variant="outline" onClick={() => pdfInputRef.current?.click()} className="w-full h-20 font-bold border-dashed border-2 rounded-2xl flex flex-col gap-1 items-center justify-center bg-muted/10 hover:bg-muted/20">
                      <FileText className="w-6 h-6 text-primary" />
                      {pdfFile ? pdfFile.name : "Select PDF File to Analyze"}
                    </Button>
                  </div>

                  {pdfFile && (
                    <div className="space-y-4">
                      <Button 
                        onClick={async () => {
                          if (!pdfFile) return;
                          setExtractingRaw(true);
                          try {
                            const base64 = await new Promise<string>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () => resolve(reader.result as string);
                              reader.onerror = () => reject(new Error("Failed to read file"));
                              reader.readAsDataURL(pdfFile);
                            });
                            const text = await extractRawTextFromPdf(base64);
                            setExtractedRawText(text);
                            toast({ title: "Extraction Complete", description: "Raw text localized." });
                          } catch (error: any) {
                            toast({ variant: "destructive", title: "Error", description: error.message });
                          } finally {
                            setExtractingRaw(false);
                          }
                        }}
                        disabled={extractingRaw}
                        className="font-bold w-full h-12 rounded-xl"
                      >
                        {extractingRaw ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Type className="w-4 h-4 mr-2" />}
                        Step 1: Extract Raw Text
                      </Button>

                      {extractedRawText && (
                        <div className="space-y-4">
                          <div className="p-4 bg-muted/30 rounded-xl border border-border">
                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Content Preview</p>
                            <p className="text-xs text-foreground line-clamp-3 italic opacity-70">"{extractedRawText.slice(0, 500)}..."</p>
                          </div>
                          <Button 
                            onClick={async () => {
                              if (!extractedRawText || !aiSubject) return;
                              setAiProcessing(true);
                              try {
                                const questions = await processTextToQuestions(extractedRawText, aiSubject, aiSubCategory || undefined);
                                setExtractedPreview(questions);
                                toast({ title: "Processing Complete", description: `Found ${questions.length} valid items.` });
                              } catch (error: any) {
                                toast({ variant: "destructive", title: "Error", description: error.message });
                              } finally {
                                setAiProcessing(false);
                              }
                            }}
                            disabled={aiProcessing}
                            className="font-bold w-full h-12 rounded-xl shadow-lg shadow-primary/10"
                          >
                            {aiProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                            Step 2: AI Structural Calibration
                          </Button>
                        </div>
                      )}

                      {extractedPreview.length > 0 && (
                        <div className="space-y-4">
                          <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-between">
                            <p className="text-sm font-black text-primary">{extractedPreview.length} Items Ready for Database</p>
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={async () => {
                                if (!firestore || extractedPreview.length === 0) return;
                                try {
                                  const batch = writeBatch(firestore);
                                  extractedPreview.forEach(q => {
                                    const newId = crypto.randomUUID();
                                    batch.set(doc(firestore, "questions", newId), { ...q, id: newId });
                                  });
                                  await batch.commit();
                                  toast({ title: "Import Successful", description: `${extractedPreview.length} items added to pool.` });
                                  setExtractedPreview([]);
                                  fetchData();
                                } catch (error: any) {
                                  toast({ variant: "destructive", title: "Error", description: error.message });
                                }
                              }}
                              className="flex-1 font-black h-12 rounded-xl"
                            >
                              Finalize & Save All
                            </Button>
                            <Button variant="ghost" onClick={() => setExtractedPreview([])} className="font-bold h-12 px-6">Discard</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Question Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{editingQuestion?.id ? 'Edit Question' : 'Add New Item'}</DialogTitle>
            <DialogDescription className="font-medium">Maintain high-fidelity practice content for the board exam.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveQuestion} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Track</label>
                <Select 
                  value={editingQuestion?.subject || ""} 
                  onValueChange={(val) => setEditingQuestion({...editingQuestion, subject: val})}
                >
                  <SelectTrigger className="rounded-xl h-12 font-bold"><SelectValue placeholder="Select track" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {SUBJECTS.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Difficulty</label>
                <Select 
                  value={editingQuestion?.difficulty || ""} 
                  onValueChange={(val: any) => setEditingQuestion({...editingQuestion, difficulty: val})}
                >
                  <SelectTrigger className="rounded-xl h-12 font-bold"><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="easy" className="font-bold text-emerald-600">Easy</SelectItem>
                    <SelectItem value="medium" className="font-bold text-amber-600">Medium</SelectItem>
                    <SelectItem value="hard" className="font-bold text-rose-600">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Question Text</label>
              <Textarea 
                value={editingQuestion?.text || ""} 
                onChange={(e) => setEditingQuestion({...editingQuestion, text: e.target.value})}
                className="rounded-xl min-h-[100px] font-bold"
                placeholder="Enter the clinical or conceptual question..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Option {String.fromCharCode(65 + idx)}</label>
                  <Input 
                    value={editingQuestion?.options?.[idx] || ""} 
                    onChange={(e) => {
                      const newOpts = [...(editingQuestion?.options || ["", "", "", ""])];
                      newOpts[idx] = e.target.value;
                      setEditingQuestion({...editingQuestion, options: newOpts});
                    }}
                    className="rounded-xl h-12 font-bold"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Correct Answer</label>
              <Select 
                value={editingQuestion?.correctAnswer || ""} 
                onValueChange={(val) => setEditingQuestion({...editingQuestion, correctAnswer: val})}
              >
                <SelectTrigger className="rounded-xl h-12 font-black"><SelectValue placeholder="Select correct answer" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {editingQuestion?.options?.map((opt, i) => (
                    opt && <SelectItem key={i} value={opt} className="font-bold">Option {String.fromCharCode(65 + i)}: {opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold h-12 rounded-xl px-8">Cancel</Button>
              <Button type="submit" className="font-black h-12 rounded-xl px-12 shadow-xl shadow-primary/20">Save to Pool</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Management Dialog */}
      <Dialog open={!!manageUser} onOpenChange={(open) => !open && setManageUser(null)}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Wrench className="w-7 h-7 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black">Manage Educator</DialogTitle>
                <DialogDescription className="font-medium truncate max-w-[200px]">{manageUser?.email}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-8 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Adjust Credits</label>
                <Badge variant="secondary" className="font-black">Current: {manageUser?.credits || 0}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCreditAdjustment(prev => prev - 5)}
                  className="h-12 w-12 rounded-xl border-2"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="flex-1 bg-muted/20 border-2 border-dashed rounded-xl h-12 flex items-center justify-center font-black text-lg">
                  {creditAdjustment > 0 ? `+${creditAdjustment}` : creditAdjustment}
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCreditAdjustment(prev => prev + 5)}
                  className="h-12 w-12 rounded-xl border-2"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <Button 
                onClick={() => handleUpdateCredits(manageUser.id, creditAdjustment)} 
                disabled={creditAdjustment === 0 || isUpdatingUser}
                className="w-full h-12 rounded-xl font-black gap-2"
              >
                {isUpdatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                Apply Credit Adjustment
              </Button>
            </div>

            <div className="space-y-3 pt-4 border-t border-border/50">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Danger Zone</p>
              <div className="grid grid-cols-1 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleResetTasks(manageUser.id)} 
                  disabled={isUpdatingUser}
                  className="h-12 rounded-xl font-bold justify-start gap-3 border-2 border-blue-500/20 text-blue-600 hover:bg-blue-50"
                >
                  <RotateCcw className="w-4 h-4" /> Reset Daily Progress
                </Button>
                {manageUser?.abuseFlags?.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => handleClearAbuse(manageUser.id)} 
                    disabled={isUpdatingUser}
                    className="h-12 rounded-xl font-bold justify-start gap-3 border-2 border-emerald-500/20 text-emerald-600 hover:bg-emerald-50"
                  >
                    <ShieldCheck className="w-4 h-4" /> Clear Abuse Flags
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManageUser(null)} className="w-full font-bold h-12 rounded-xl">Close Management</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
