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
  RefreshCw,
  CheckCircle2,
  FileText,
  FileUp,
  Brain,
  Type,
  Database,
  Users,
  RotateCcw,
  Coins,
  ShieldCheck,
  MoreVertical,
  Minus,
  Wrench,
  ChevronRight,
  Crown,
  Download,
  Smartphone,
  Trash,
  Check,
  X,
  Upload
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
  increment
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Question, MAJORSHIPS, SUBJECTS } from "@/app/lib/mock-data";
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
  
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [manageUser, setManageUser] = useState<any | null>(null);
  const [creditAdjustment, setCreditAdjustment] = useState<number>(0);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractingRaw, setExtractingRaw] = useState(false);
  const [extractedRawText, setExtractedRawText] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiSubject, setAiSubject] = useState("");
  const [aiSubCategory, setAiSubCategory] = useState("");
  const [extractedPreview, setExtractedPreview] = useState<Partial<Question>[]>([]);
  const [seeding, setSeeding] = useState(false);

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
      const usersQuery = query(collection(firestore, "users"), orderBy("lastActiveDate", "desc"), queryLimit(50));
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

  const filteredUsers = useMemo(() => users.filter(u => (u.email?.toLowerCase() || "").includes(userSearchQuery.toLowerCase()) || (u.displayName?.toLowerCase() || "").includes(userSearchQuery.toLowerCase())), [users, userSearchQuery]);

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

  const handleUpdateCredits = async (userId: string, amount: number) => {
    if (!firestore) return; setIsUpdatingUser(true);
    try { await updateDoc(doc(firestore, 'users', userId), { credits: increment(amount) }); fetchUsers(); setManageUser(null); toast({ title: "Credits Adjusted" }); }
    catch (e: any) { toast({ variant: "destructive", title: "Failed", description: e.message }); } finally { setIsUpdatingUser(false); }
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
      <header className="bg-card border-b sticky top-0 z-50 h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/"><Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground"><ArrowLeft className="w-4 h-4" /> Exit</Button></Link>
          <span className="text-lg font-black tracking-tight flex items-center gap-2 text-foreground"><Settings className="w-5 h-5 text-primary" /> Admin Panel</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-24">
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="bg-muted/30 p-1 rounded-2xl w-full sm:w-auto grid grid-cols-2 md:flex">
            <TabsTrigger value="questions" className="font-bold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Item Manager</TabsTrigger>
            <TabsTrigger value="users" className="font-bold rounded-xl flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Users className="w-3.5 h-3.5" /> User Base</TabsTrigger>
            <TabsTrigger value="pdf-import" className="font-bold rounded-xl flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><FileUp className="w-3.5 h-3.5" /> AI Import</TabsTrigger>
            <TabsTrigger value="config" className="font-bold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Settings</TabsTrigger>
            <TabsTrigger value="apk-upload" className="font-bold rounded-xl flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Smartphone className="w-3.5 h-3.5" /> APK Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            <div className="flex justify-between gap-4 flex-wrap items-center">
              <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search vault..." className="pl-9 rounded-xl border-border" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
              <Button onClick={() => { setEditingQuestion({}); setIsDialogOpen(true); }} className="rounded-xl font-black text-xs h-11"><Plus className="w-4 h-4 mr-2" /> New Item</Button>
            </div>
            <div className="android-surface rounded-3xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow><TableHead className="font-bold uppercase text-[10px]">Track</TableHead><TableHead className="font-bold uppercase text-[10px]">Content</TableHead><TableHead className="text-right font-bold uppercase text-[10px]">Actions</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {questions.filter(q => q.text.toLowerCase().includes(searchQuery.toLowerCase())).map(q => (
                    <TableRow key={q.id} className="border-border">
                      <TableCell><Badge variant="outline" className="text-[10px] font-bold border-border">{q.subject}</Badge></TableCell>
                      <TableCell className="text-sm font-medium"><span className="line-clamp-1">{q.text}</span></TableCell>
                      <TableCell className="text-right flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingQuestion(q); setIsDialogOpen(true); }}><Edit className="w-4 h-4 text-primary" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(firestore!, "questions", q.id)).then(fetchData)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between gap-4 flex-wrap items-center">
              <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search educators..." className="pl-9 rounded-xl" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} /></div>
              <Button variant="outline" onClick={fetchUsers} className="rounded-xl font-bold h-11"><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
            </div>
            <div className="android-surface rounded-3xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow><TableHead className="font-bold uppercase text-[10px]">Educator</TableHead><TableHead className="font-bold uppercase text-[10px]">Status</TableHead><TableHead className="text-center font-bold uppercase text-[10px]">Credits</TableHead><TableHead className="text-right font-bold uppercase text-[10px]">Actions</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell><div className="flex flex-col"><p className="text-sm font-bold">{user.displayName || 'Guest'}</p><p className="text-[10px] text-muted-foreground">{user.email || 'No email'}</p></div></TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px] font-black uppercase">{user.isPro ? 'Platinum' : 'Standard'}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="secondary" className="font-black gap-1"><Coins className="w-3 h-3" /> {user.credits || 0}</Badge></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl p-2 border-border shadow-2xl">
                            <DropdownMenuItem onClick={() => { setManageUser(user); setCreditAdjustment(0); }} className="font-bold gap-3 rounded-lg py-2.5"><Coins className="w-4 h-4 text-yellow-600" /> Adjust Credits</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateDoc(doc(firestore!, 'users', user.id), { isPro: !user.isPro }).then(fetchUsers)} className="font-bold gap-3 rounded-lg py-2.5"><Crown className="w-4 h-4 text-yellow-500" /> {user.isPro ? 'Revoke Platinum' : 'Grant Platinum'}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <Card className="android-surface rounded-[2rem] border-none">
              <CardHeader><CardTitle className="text-lg font-black flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Global Parameters</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Time per Item (s)</label><Input type="number" value={timePerQuestion} onChange={(e) => setTimePerQuestion(parseInt(e.target.value) || 60)} className="rounded-xl font-bold" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Gen Ed Items</label><Input type="number" value={limits.limitGenEd} onChange={(e) => setLimits({...limits, limitGenEd: parseInt(e.target.value) || 10})} className="rounded-xl font-bold" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Prof Ed Items</label><Input type="number" value={limits.limitProfEd} onChange={(e) => setLimits({...limits, limitProfEd: parseInt(e.target.value) || 10})} className="rounded-xl font-bold" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Spec Items</label><Input type="number" value={limits.limitSpec} onChange={(e) => setLimits({...limits, limitSpec: parseInt(e.target.value) || 10})} className="rounded-xl font-bold" /></div>
                </div>
                <Button onClick={async () => { setSavingSettings(true); await setDoc(doc(firestore!, "system_configs", "global"), { timePerQuestion, limitGenEd: limits.limitGenEd, limitProfEd: limits.limitProfEd, limitSpec: limits.limitSpec, updatedAt: serverTimestamp() }, { merge: true }); setSavingSettings(false); toast({ title: "Config Saved" }); }} disabled={savingSettings} className="font-black h-12 rounded-xl w-full sm:w-auto px-12">{savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save System Configuration</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apk-upload" className="space-y-6">
            <Card className="android-surface rounded-[2rem] border-none">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" /> APK Management
                </CardTitle>
                <CardDescription className="font-medium">
                  Upload and manage the Android app APK file for users to download.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/20 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Current Version</h4>
                    {loadingApkInfo ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : currentApkInfo?.version ? (
                      <Badge variant="default" className="font-black bg-primary text-primary-foreground">
                        v{currentApkInfo.version}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="font-bold">No APK uploaded</Badge>
                    )}
                  </div>
                  {currentApkInfo?.version && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <p>File: {currentApkInfo.fileName}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(currentApkInfo.downloadURL, '_blank')}
                        className="rounded-xl font-bold gap-2"
                      >
                        <Download className="w-4 h-4" /> Download
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">APK Version</label>
                    <Input 
                      type="text" 
                      placeholder="e.g., 1.0.0" 
                      value={apkVersion} 
                      onChange={(e) => setApkVersion(e.target.value)}
                      className="rounded-xl font-bold"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Select APK File</label>
                    <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                      <input 
                        type="file" 
                        accept=".apk"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setApkFile(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="space-y-2">
                        {apkFile ? (
                          <>
                            <Check className="w-8 h-8 text-green-500 mx-auto" />
                            <p className="font-bold text-sm">{apkFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(apkFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </>
                        ) : (
                          <>
                            <FileUp className="w-8 h-8 text-muted-foreground mx-auto" />
                            <p className="font-bold text-sm">Click to select APK file</p>
                            <p className="text-xs text-muted-foreground">Only .apk files are allowed</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleUploadApk}
                    disabled={uploadingApk}
                    className="w-full h-14 rounded-2xl font-black gap-2 shadow-lg"
                  >
                    {uploadingApk ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                    {uploadingApk ? "Uploading..." : "Upload APK"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black">{editingQuestion?.id ? 'Edit Item' : 'New Item'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveQuestion} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-muted-foreground">Track</label><Select value={editingQuestion?.subject || ""} onValueChange={(val) => setEditingQuestion({...editingQuestion, subject: val})}><SelectTrigger className="rounded-xl h-12 font-bold"><SelectValue placeholder="Track" /></SelectTrigger><SelectContent className="rounded-xl">{SUBJECTS.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-muted-foreground">Difficulty</label><Select value={editingQuestion?.difficulty || ""} onValueChange={(val: any) => setEditingQuestion({...editingQuestion, difficulty: val})}><SelectTrigger className="rounded-xl h-12 font-bold"><SelectValue placeholder="Level" /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="easy" className="text-emerald-600 font-bold">Easy</SelectItem><SelectItem value="medium" className="text-amber-600 font-bold">Medium</SelectItem><SelectItem value="hard" className="text-rose-600 font-bold">Hard</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-muted-foreground">Question Content</label><Textarea value={editingQuestion?.text || ""} onChange={(e) => setEditingQuestion({...editingQuestion, text: e.target.value})} className="rounded-xl font-medium min-h-[100px]" /></div>
            <div className="grid grid-cols-2 gap-4">{[0, 1, 2, 3].map((idx) => (<div key={idx} className="space-y-2"><label className="text-[10px] font-bold uppercase text-muted-foreground">Option {String.fromCharCode(65 + idx)}</label><Input value={editingQuestion?.options?.[idx] || ""} onChange={(e) => { const n = [...(editingQuestion?.options || ["","","",""])]; n[idx] = e.target.value; setEditingQuestion({...editingQuestion, options: n}); }} className="rounded-xl h-12 font-medium" /></div>))}</div>
            <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold h-12">Cancel</Button><Button type="submit" className="rounded-xl font-black h-12 px-12 shadow-xl shadow-primary/20">Save Item</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!manageUser} onOpenChange={() => setManageUser(null)}>
        <DialogContent className="max-w-sm rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-black">Manage educator</DialogTitle><DialogDescription className="font-medium">{manageUser?.email}</DialogDescription></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setCreditAdjustment(p => p - 5)} className="h-12 w-12 rounded-xl border-2"><Minus className="w-4 h-4" /></Button>
              <div className="flex-1 bg-muted/20 rounded-xl h-12 flex items-center justify-center font-black text-lg">{creditAdjustment > 0 ? `+${creditAdjustment}` : creditAdjustment}</div>
              <Button variant="outline" onClick={() => setCreditAdjustment(p => p + 5)} className="h-12 w-12 rounded-xl border-2"><Plus className="w-4 h-4" /></Button>
            </div>
            <Button onClick={() => handleUpdateCredits(manageUser.id, creditAdjustment)} disabled={isUpdatingUser} className="w-full h-14 rounded-2xl font-black gap-2 shadow-lg">{isUpdatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />} Apply Credit Adjustment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
