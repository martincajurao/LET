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
  Calendar
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
  serverTimestamp
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Question, MAJORSHIPS, SUBJECTS } from "@/app/lib/mock-data";
import { testAIConnection, type TestConnectionOutput } from "@/ai/flows/test-connection-flow";
import { extractRawTextFromPdf } from "@/lib/pdf-extractor";
import { processTextToQuestions } from "@/ai/flows/process-text-to-questions-flow";
import { seedInitialQuestions } from "@/lib/db-seed";
import Link from 'next/link';
import Papa from 'papaparse';

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [timePerQuestion, setTimePerQuestion] = useState(60);
  const [limits, setLimits] = useState({ limitGenEd: 10, limitProfEd: 10, limitSpec: 10 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [testingAI, setTestingAI] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<TestConnectionOutput | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractingRaw, setExtractingRaw] = useState(false);
  const [extractedRawText, setExtractedRawText] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiSubject, setAiSubject] = useState("");
  const [aiSubCategory, setAiSubCategory] = useState("");
  const [extractedPreview, setExtractedPreview] = useState<Partial<Question>[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [resettingUserTask, setResettingUserTask] = useState<string | null>(null);

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
    } catch (error) { console.error("Fetch error:", error); } finally { setLoading(false); }
  };

  useEffect(() => { if (firestore) { fetchData(); fetchUsers(); } }, [firestore]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'General Education': 0, 'Professional Education': 0, 'Specialization': 0 };
    questions.forEach(q => { if (counts[q.subject] !== undefined) counts[q.subject]++; });
    return counts;
  }, [questions]);

  const fetchUsers = async () => {
    if (!firestore) return;
    try {
      const usersQuery = query(collection(firestore, "users"), orderBy("lastActiveDate", "desc"), queryLimit(50));
      const usersSnap = await getDocs(usersQuery);
      setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) { console.error("Error fetching users:", error); }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingQuestion) return;
    try {
      if (editingQuestion.id) { await updateDoc(doc(firestore, "questions", editingQuestion.id), editingQuestion); toast({ title: "Success", description: "Question updated." }); }
      else { const newId = crypto.randomUUID(); await setDoc(doc(firestore, "questions", newId), { ...editingQuestion, id: newId }); toast({ title: "Success", description: "New question added." }); }
      setIsDialogOpen(false); setEditingQuestion(null); fetchData();
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }); }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!firestore || !confirm("Delete this question?")) return;
    try { await deleteDoc(doc(firestore, "questions", id)); fetchData(); }
    catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }); }
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
            <TabsTrigger value="questions" className="font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Manager</TabsTrigger>
            <TabsTrigger value="pdf-import" className="font-bold flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><FileUp className="w-3.5 h-3.5" /> PDF Import</TabsTrigger>
            <TabsTrigger value="users" className="font-bold flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
            <TabsTrigger value="config" className="font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Config</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            <div className="flex justify-between gap-4 flex-wrap items-center">
              <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." className="pl-9 bg-card border-border text-foreground" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
              <div className="flex gap-2"><Button onClick={() => setIsDialogOpen(true)} className="font-black text-xs"><Plus className="w-4 h-4 mr-2" /> Add Item</Button></div>
            </div>
            <Card className="overflow-hidden border-none shadow-sm rounded-xl bg-card border border-border">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border"><TableHead className="font-black uppercase text-[10px] text-muted-foreground">Track</TableHead><TableHead className="font-black uppercase text-[10px] text-muted-foreground">Question</TableHead><TableHead className="text-right font-black uppercase text-[10px] text-muted-foreground">Actions</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {questions.filter(q => q.text.toLowerCase().includes(searchQuery.toLowerCase())).map(q => (
                    <TableRow key={q.id} className="hover:bg-muted/10 border-border">
                      <TableCell><Badge variant="outline" className="text-[10px] font-bold text-foreground border-border">{q.subject}</Badge></TableCell>
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

          <TabsContent value="users" className="space-y-6">
            <Card className="overflow-hidden border-none shadow-sm rounded-xl bg-card border border-border">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border"><TableHead className="font-black uppercase text-[10px] text-muted-foreground">User</TableHead><TableHead className="font-black uppercase text-[10px] text-muted-foreground">Credits</TableHead><TableHead className="font-black uppercase text-[10px] text-muted-foreground">Last Active</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id} className="hover:bg-muted/10 border-border">
                      <TableCell><p className="text-sm font-bold text-foreground">{user.email || 'Unknown'}</p></TableCell>
                      <TableCell><Badge variant="secondary" className="font-bold">{user.credits || 0}</Badge></TableCell>
                      <TableCell><p className="text-xs text-muted-foreground">{user.lastActiveDate ? new Date(user.lastActiveDate.toDate ? user.lastActiveDate.toDate() : user.lastActiveDate).toLocaleDateString() : 'Never'}</p></TableCell>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Time per Question (seconds)</label>
                    <Input 
                      type="number" 
                      value={timePerQuestion} 
                      onChange={(e) => setTimePerQuestion(parseInt(e.target.value) || 60)}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Gen Ed Limit</label>
                    <Input 
                      type="number" 
                      value={limits.limitGenEd} 
                      onChange={(e) => setLimits({...limits, limitGenEd: parseInt(e.target.value) || 10})}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Prof Ed Limit</label>
                    <Input 
                      type="number" 
                      value={limits.limitProfEd} 
                      onChange={(e) => setLimits({...limits, limitProfEd: parseInt(e.target.value) || 10})}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Specialization Limit</label>
                    <Input 
                      type="number" 
                      value={limits.limitSpec} 
                      onChange={(e) => setLimits({...limits, limitSpec: parseInt(e.target.value) || 10})}
                      className="bg-background border-border"
                    />
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
                      toast({ title: "Settings Saved", description: "Simulation settings have been updated." });
                    } catch (error: any) {
                      toast({ variant: "destructive", title: "Error", description: error.message });
                    } finally {
                      setSavingSettings(false);
                    }
                  }}
                  disabled={savingSettings}
                  className="font-black"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Settings
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
                        toast({ title: "Seeding Complete", description: "Questions have been seeded to the database." });
                        fetchData();
                      } catch (error: any) {
                        toast({ variant: "destructive", title: "Error", description: error.message });
                      } finally {
                        setSeeding(false);
                      }
                    }}
                    disabled={seeding}
                    className="font-bold"
                  >
                    {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Seed Questions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pdf-import" className="space-y-6">
            <Card className="overflow-hidden border-none shadow-sm rounded-xl bg-card border border-border">
              <CardHeader className="p-6">
                <CardTitle className="text-lg font-black flex items-center gap-2"><FileUp className="w-5 h-5 text-primary" /> PDF Question Import</CardTitle>
                <CardDescription className="text-sm">Import questions from PDF documents using AI.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Subject</label>
                      <Select value={aiSubject} onValueChange={setAiSubject}>
                        <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select subject" /></SelectTrigger>
                        <SelectContent>
                          {SUBJECTS.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Sub-category (Optional)</label>
                      <Select value={aiSubCategory} onValueChange={setAiSubCategory}>
                        <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select sub-category" /></SelectTrigger>
                        <SelectContent>
                          {MAJORSHIPS.map(m => <SelectItem key={m} value={m} className="font-bold">{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <input 
                      type="file" 
                      accept=".pdf"
                      ref={pdfInputRef}
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <Button variant="outline" onClick={() => pdfInputRef.current?.click()} className="w-full font-bold border-dashed">
                      <FileText className="w-4 h-4 mr-2" />
                      {pdfFile ? pdfFile.name : "Select PDF File"}
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
                            toast({ title: "Extraction Complete", description: "PDF text extracted successfully." });
                          } catch (error: any) {
                            toast({ variant: "destructive", title: "Error", description: error.message });
                          } finally {
                            setExtractingRaw(false);
                          }
                        }}
                        disabled={extractingRaw}
                        className="font-bold w-full"
                      >
                        {extractingRaw ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Type className="w-4 h-4 mr-2" />}
                        Extract Text
                      </Button>

                      {extractedRawText && (
                        <div className="space-y-4">
                          <div className="p-4 bg-muted/30 rounded-xl border border-border">
                            <p className="text-xs font-bold text-muted-foreground mb-2">Preview (first 500 chars):</p>
                            <p className="text-sm text-foreground line-clamp-3">{extractedRawText.slice(0, 500)}...</p>
                          </div>
                          <Button 
                            onClick={async () => {
                              if (!extractedRawText || !aiSubject) return;
                              setAiProcessing(true);
                              try {
                                const questions = await processTextToQuestions(extractedRawText, aiSubject, aiSubCategory || undefined);
                                setExtractedPreview(questions);
                                toast({ title: "Processing Complete", description: `Generated ${questions.length} questions.` });
                              } catch (error: any) {
                                toast({ variant: "destructive", title: "Error", description: error.message });
                              } finally {
                                setAiProcessing(false);
                              }
                            }}
                            disabled={aiProcessing}
                            className="font-bold w-full"
                          >
                            {aiProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                            Generate Questions
                          </Button>
                        </div>
                      )}

                      {extractedPreview.length > 0 && (
                        <div className="space-y-4">
                          <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                            <p className="text-sm font-black text-primary">{extractedPreview.length} questions generated</p>
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
                                  toast({ title: "Import Complete", description: `${extractedPreview.length} questions imported.` });
                                  setExtractedPreview([]);
                                  fetchData();
                                } catch (error: any) {
                                  toast({ variant: "destructive", title: "Error", description: error.message });
                                }
                              }}
                              className="flex-1 font-bold"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Import All
                            </Button>
                            <Button variant="outline" onClick={() => setExtractedPreview([])} className="font-bold">
                              Cancel
                            </Button>
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
    </div>
  );
}