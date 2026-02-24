
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
  UserX,
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
  limit as queryLimit
} from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";
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

  // User management states
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
        setLimits({
          limitGenEd: data.limitGenEd || 10,
          limitProfEd: data.limitProfEd || 10,
          limitSpec: data.limitSpec || 10
        });
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (firestore) {
      fetchData();
    }
  }, [firestore]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'General Education': 0,
      'Professional Education': 0,
      'Specialization': 0
    };
    questions.forEach(q => {
      if (counts[q.subject] !== undefined) {
        counts[q.subject]++;
      }
    });
    return counts;
  }, [questions]);

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingQuestion) return;

    const data = {
      ...editingQuestion,
      options: editingQuestion.options || ["", "", "", ""],
    };

    try {
      if (editingQuestion.id) {
        await updateDoc(doc(firestore, "questions", editingQuestion.id), data);
        toast({ title: "Success", description: "Question updated." });
      } else {
        const newId = crypto.randomUUID();
        await setDoc(doc(firestore, "questions", newId), { ...data, id: newId });
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

  const handleClearAll = async () => {
    if (!firestore || !confirm("DANGER: This will permanently delete ALL questions in the database. Proceed?")) return;
    setLoading(true);
    try {
      const qSnap = await getDocs(collection(firestore, "questions"));
      const batch = writeBatch(firestore);
      qSnap.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      toast({ title: "Success", description: `Wiped ${qSnap.size} questions from database.` });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedSamples = async () => {
    if (!firestore || seeding) return;
    setSeeding(true);
    try {
      const success = await seedInitialQuestions(firestore);
      if (success) {
        toast({ title: "Success", description: "Database seeded with sample questions." });
        fetchData();
      } else {
        toast({ variant: "destructive", title: "Seeding Failed", description: "Check your Security Rules or connection." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSeeding(false);
    }
  };

  const handleManualExtract = async () => {
    if (!pdfFile) {
      toast({ variant: "destructive", title: "Missing Input", description: "Please select a file." });
      return;
    }

    setExtractingRaw(true);
    setExtractedRawText("");
    setExtractedPreview([]);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const text = await extractRawTextFromPdf(base64);
          setExtractedRawText(text);
          toast({ title: "Manual Extraction Complete", description: "Raw text successfully parsed without AI." });
        } catch (err: any) {
          toast({ variant: "destructive", title: "Parsing Error", description: err.message });
        } finally {
          setExtractingRaw(false);
        }
      };
      reader.readAsDataURL(pdfFile);
    } catch (error: any) {
      toast({ variant: "destructive", title: "File Error", description: error.message });
      setExtractingRaw(false);
    }
  };

  const handleAiFormat = async () => {
    if (!extractedRawText || !aiSubject) {
      toast({ variant: "destructive", title: "Missing Context", description: "Subject and extracted text are required." });
      return;
    }

    setAiProcessing(true);
    try {
      const result = await processTextToQuestions({
        rawText: extractedRawText,
        subject: aiSubject,
        subCategory: aiSubCategory === "none" ? "" : aiSubCategory
      });

      if (result.questions && result.questions.length > 0) {
        setExtractedPreview(result.questions.map(q => ({
          ...q,
          id: crypto.randomUUID(),
          subject: aiSubject,
          subCategory: aiSubCategory === "none" ? "" : aiSubCategory,
          difficulty: 'medium' as const,
          explanation: ""
        })));
        toast({ title: "Questions Formatted", description: `AI identified ${result.questions.length} items from text.` });
      } else {
        toast({ variant: "destructive", title: "Structuring Failed", description: "AI could not identify structured questions in this text." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "AI Error", description: error.message });
    } finally {
      setAiProcessing(false);
    }
  };

  const handleSaveExtracted = async () => {
    if (!firestore || extractedPreview.length === 0) return;
    setLoading(true);
    try {
      const batch = writeBatch(firestore);
      extractedPreview.forEach(q => {
        const docRef = doc(collection(firestore, "questions"), q.id!);
        batch.set(docRef, q);
      });
      await batch.commit();
      toast({ title: "Batch Saved", description: `Added ${extractedPreview.length} questions to Firestore.` });
      setExtractedPreview([]);
      setExtractedRawText("");
      setPdfFile(null);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (questions.length === 0) return;
    const data = questions.map(q => ({
      Question: q.text,
      'Option A': q.options[0],
      'Option B': q.options[1],
      'Option C': q.options[2],
      'Option D': q.options[3],
      Correct: q.correctAnswer,
      Subject: q.subject,
      SubCat: q.subCategory || "",
      Difficulty: q.difficulty,
      Explanation: q.explanation || ""
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `let_questions_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleImportCsv = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore) return;

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const batch = writeBatch(firestore);
        let count = 0;

        results.data.forEach((row: any) => {
          const text = row["Question"] || row["text"];
          const options = [
            row["Option A"] || (row["options"] ? JSON.parse(row["options"])[0] : ""),
            row["Option B"] || (row["options"] ? JSON.parse(row["options"])[1] : ""),
            row["Option C"] || (row["options"] ? JSON.parse(row["options"])[2] : ""),
            row["Option D"] || (row["options"] ? JSON.parse(row["options"])[3] : ""),
          ];
          const correctAnswer = row["Correct"] || row["correctAnswer"];
          const subject = row["Subject"] || row["subject"];
          const subCategory = row["SubCat"] || row["subCategory"] || "";
          const difficulty = (row["Difficulty"] || row["difficulty"] || "medium") as 'easy' | 'medium' | 'hard';

          if (text && options.every(o => o) && correctAnswer && subject) {
            const newId = crypto.randomUUID();
            const questionData: Question = {
              id: newId,
              text,
              options,
              correctAnswer,
              subject,
              subCategory,
              difficulty,
              explanation: row["Explanation"] || row["explanation"] || "",
            };
            const docRef = doc(firestore, "questions", newId);
            batch.set(docRef, questionData);
            count++;
          }
        });

        try {
          await batch.commit();
          toast({ title: "Success", description: `Imported ${count} questions to Firestore.` });
          fetchData();
        } catch (error: any) {
          toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
          setLoading(false);
          if (csvInputRef.current) csvInputRef.current.value = "";
        }
      },
      error: (err) => {
        toast({ variant: "destructive", title: "CSV Parse Error", description: err.message });
        setLoading(false);
      }
    });
  };

  const handleSaveSettings = async () => {
    if (!firestore) return;
    setSavingSettings(true);
    try {
      await setDoc(doc(firestore, "system_configs", "global"), { 
        timePerQuestion,
        ...limits
      });
      toast({ title: "Settings Saved", description: "Global simulation parameters updated." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRunAIConnectionTest = async () => {
    setTestingAI(true);
    setAiTestResult(null);
    try {
      const result = await testAIConnection();
      setAiTestResult(result);
      if (result.success) {
        toast({ title: "Puter AI Successful", description: "GPT-5 Nano is responsive." });
      } else {
        toast({ variant: "destructive", title: "AI Connection Failed", description: result.message });
      }
    } catch (error: any) {
      setAiTestResult({ success: false, message: error.message || "Failed to initiate AI test.", timestamp: Date.now() });
      toast({ variant: "destructive", title: "Error", description: "Failed to connect to AI server action." });
    } finally {
      setTestingAI(false);
    }
  };

  // User management functions
  const fetchUsers = async () => {
    if (!firestore) return;
    try {
      const usersQuery = query(
        collection(firestore, "users"),
        orderBy("lastActiveDate", "desc"),
        queryLimit(50)
      );
      const usersSnap = await getDocs(usersQuery);
      const usersList = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch users." });
    }
  };

  const handleResetUserDailyTasks = async (userId: string, userEmail: string) => {
    if (!firestore || !confirm(`Reset daily tasks for ${userEmail}? This will clear their progress for today.`)) return;
    
    setResettingUserTask(userId);
    try {
      const userRef = doc(firestore, "users", userId);
      await updateDoc(userRef, {
        dailyQuestionsAnswered: 0,
        dailyTestsFinished: 0,
        mistakesReviewed: 0,
        taskQuestionsClaimed: false,
        taskMockClaimed: false,
        taskMistakesClaimed: false,
        dailyCreditEarned: 0,
        lastTaskReset: serverTimestamp()
      });
      
      toast({ 
        title: "Daily Tasks Reset", 
        description: `Successfully reset daily tasks for ${userEmail}` 
      });
      
      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setResettingUserTask(null);
    }
  };

  // Fetch users when component mounts
  useEffect(() => {
    if (firestore) {
      fetchUsers();
    }
  }, [firestore]);

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = (q.text || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === "all" || q.subject === filterSubject;
    return matchesSearch && matchesSubject;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster />
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/"><Button variant="ghost" size="sm" className="gap-2 font-bold"><ArrowLeft className="w-4 h-4" />Back</Button></Link>
            <span className="text-lg font-black tracking-tight flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Admin Panel
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm"><CardHeader className="p-4"><CardDescription className="text-[10px] font-black uppercase tracking-widest">Total Pool</CardDescription><CardTitle className="text-xl font-black">{questions.length}</CardTitle></CardHeader></Card>
          <Card className="border-none shadow-sm"><CardHeader className="p-4"><CardDescription className="text-[10px] font-black uppercase tracking-widest">Gen Ed</CardDescription><CardTitle className="text-xl font-black">{categoryCounts['General Education']}</CardTitle></CardHeader></Card>
          <Card className="border-none shadow-sm"><CardHeader className="p-4"><CardDescription className="text-[10px] font-black uppercase tracking-widest">Prof Ed</CardDescription><CardTitle className="text-xl font-black">{categoryCounts['Professional Education']}</CardTitle></CardHeader></Card>
          <Card className="border-none shadow-sm"><CardHeader className="p-4"><CardDescription className="text-[10px] font-black uppercase tracking-widest">Specialization</CardDescription><CardTitle className="text-xl font-black">{categoryCounts['Specialization']}</CardTitle></CardHeader></Card>
        </div>

        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="bg-white border p-1 rounded-xl">
            <TabsTrigger value="questions" className="font-bold">Question Manager</TabsTrigger>
            <TabsTrigger value="pdf-import" className="font-bold flex items-center gap-2">
              <FileUp className="w-3.5 h-3.5" /> Manual PDF Ingestion
            </TabsTrigger>
            <TabsTrigger value="users" className="font-bold flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> User Management
            </TabsTrigger>
            <TabsTrigger value="config" className="font-bold">System Config</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            <div className="flex justify-between gap-4 flex-wrap items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search questions..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={handleSeedSamples} disabled={seeding} className="gap-2 font-black text-xs border-primary/20 text-primary hover:bg-primary/5">
                  {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Seed Samples
                </Button>
                <input
                    type="file"
                    ref={csvInputRef}
                    accept=".csv"
                    className="hidden"
                    onChange={handleImportCsv}
                />
                <Button variant="outline" onClick={() => csvInputRef.current?.click()} className="gap-2 font-black text-xs">
                  <FileUp className="w-4 h-4" /> Import CSV
                </Button>
                <Button variant="outline" onClick={handleExportCsv} className="gap-2 font-black text-xs">
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
                <Button onClick={handleClearAll} variant="destructive" className="gap-2 font-black text-xs">
                  <AlertTriangle className="w-4 h-4" /> Clear All
                </Button>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild><Button className="font-black text-xs"><Plus className="w-4 h-4 mr-2" /> Add Item</Button></DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem]">
                    <DialogHeader>
                      <DialogTitle className="font-black">Question Editor</DialogTitle>
                      <DialogDescription>Create or update a multiple-choice question for the test bank.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveQuestion} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Select value={editingQuestion?.subject} onValueChange={(v) => setEditingQuestion(p => ({...(p||{}), subject: v}))}>
                          <SelectTrigger><SelectValue placeholder="Subject Category" /></SelectTrigger>
                          <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={editingQuestion?.subCategory} onValueChange={(v) => setEditingQuestion(p => ({...(p||{}), subCategory: v}))}>
                          <SelectTrigger><SelectValue placeholder="Majorship/Track" /></SelectTrigger>
                          <SelectContent><SelectItem value="none">None</SelectItem>{MAJORSHIPS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Textarea placeholder="Question Text" value={editingQuestion?.text || ""} onChange={(e) => setEditingQuestion(p => ({...(p||{}), text: e.target.value}))} className="min-h-[120px]" />
                      <div className="grid grid-cols-2 gap-2">
                        {[0,1,2,3].map(i => <Input key={i} placeholder={`Option ${String.fromCharCode(65 + i)}`} value={editingQuestion?.options?.[i] || ""} onChange={(e) => {
                          const opts = [...(editingQuestion?.options || ["","","",""])];
                          opts[i] = e.target.value;
                          setEditingQuestion(p => ({...(p||{}), options: opts}));
                        }} />)}
                      </div>
                      <Input placeholder="Exact Correct Answer String" value={editingQuestion?.correctAnswer || ""} onChange={(e) => setEditingQuestion(p => ({...(p||{}), correctAnswer: e.target.value}))} />
                      <DialogFooter><Button type="submit" className="w-full font-black py-6">Save to Cloud</Button></DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Card className="overflow-hidden border-none shadow-sm rounded-xl bg-white">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px]">Track</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Question Content</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map(q => (
                    <TableRow key={q.id}>
                      <TableCell><Badge variant="outline" className="text-[10px] font-bold">{q.subject}</Badge></TableCell>
                      <TableCell className="font-medium text-sm"><span className="line-clamp-1">{q.text}</span></TableCell>
                      <TableCell className="text-right flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingQuestion(q); setIsDialogOpen(true); }}><Edit className="w-4 h-4 text-primary" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(q.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredQuestions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-muted-foreground font-medium">No questions found matching your criteria.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="pdf-import" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6 lg:col-span-1">
                <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                  <CardHeader className="bg-primary/5">
                    <div className="flex items-center gap-2">
                      <FileUp className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg font-black">Step 1: Manual Extraction</CardTitle>
                    </div>
                    <CardDescription>Parse raw text from PDF without AI (Safe & Fast).</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div 
                      onClick={() => pdfInputRef.current?.click()}
                      className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors border-muted-foreground/20"
                    >
                      <input 
                        type="file" 
                        ref={pdfInputRef} 
                        accept=".pdf" 
                        className="hidden" 
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      />
                      {pdfFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="w-8 h-8 text-primary" />
                          <span className="text-xs font-bold text-center line-clamp-1">{pdfFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <FileUp className="w-8 h-8 text-muted-foreground/40" />
                          <span className="text-xs font-bold text-muted-foreground text-center">Select Exam PDF</span>
                        </>
                      )}
                    </div>
                    <Button 
                      className="w-full h-12 font-black" 
                      variant="outline"
                      disabled={!pdfFile || extractingRaw}
                      onClick={handleManualExtract}
                    >
                      {extractingRaw ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Type className="w-4 h-4 mr-2" />}
                      Extract Raw Text
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                  <CardHeader className="bg-primary/5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg font-black">Step 2: AI Structure</CardTitle>
                    </div>
                    <CardDescription>Use Puter AI to format the raw text into items.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Subject</label>
                      <Select value={aiSubject} onValueChange={setAiSubject}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                        <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Majorship (Optional)</label>
                      <Select value={aiSubCategory} onValueChange={setAiSubCategory}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select Majorship" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {MAJORSHIPS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      className="w-full h-12 font-black shadow-lg" 
                      disabled={!extractedRawText || !aiSubject || aiProcessing}
                      onClick={handleAiFormat}
                    >
                      {aiProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
                      Format with AI
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="lg:col-span-2 border-none shadow-sm bg-white rounded-2xl overflow-hidden flex flex-col">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-black flex items-center gap-2">
                        {extractedPreview.length > 0 ? <FileCheck className="w-5 h-5 text-emerald-500" /> : <FileText className="w-5 h-5 text-slate-400" />}
                        Ingestion Review
                      </CardTitle>
                      <CardDescription>Verify items before committing to Firestore.</CardDescription>
                    </div>
                    {extractedPreview.length > 0 && (
                      <Badge variant="secondary" className="font-black bg-emerald-50 text-emerald-700">{extractedPreview.length} items formatted</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto max-h-[600px] bg-slate-50/20">
                  {extractedPreview.length > 0 ? (
                    <Table>
                      <TableHeader className="bg-white sticky top-0 z-10 border-b">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase w-2/3">Question Preview</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center">Correct</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {extractedPreview.map((q, i) => (
                          <TableRow key={q.id || i} className="bg-white border-b hover:bg-slate-50">
                            <TableCell className="py-4">
                              <p className="text-sm font-bold text-slate-800 mb-2">{q.text}</p>
                              <div className="grid grid-cols-2 gap-2">
                                {q.options?.map((opt, idx) => (
                                  <div key={idx} className={`text-[9px] px-2 py-1 rounded border ${opt === q.correctAnswer ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                    {String.fromCharCode(65 + idx)}. {opt}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-center align-middle">
                              <Badge className="font-black text-[10px] bg-emerald-100 text-emerald-700 border-none px-3">
                                {q.correctAnswer}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : extractedRawText ? (
                    <div className="p-6">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Extracted Raw Text (Review & Edit)</label>
                      <Textarea 
                        className="min-h-[400px] font-mono text-xs whitespace-pre-wrap border rounded-xl bg-white p-4 leading-relaxed focus:ring-primary/20"
                        value={extractedRawText}
                        onChange={(e) => setExtractedRawText(e.target.value)}
                        placeholder="Raw text will appear here after manual extraction..."
                      />
                    </div>
                  ) : (
                    <div className="h-full min-h-[450px] flex flex-col items-center justify-center text-center p-12 space-y-6">
                      <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center border border-dashed border-slate-200">
                        <FileText className="w-10 h-10 text-slate-300" />
                      </div>
                      <div className="space-y-2">
                        <p className="font-black text-slate-800 text-lg">Empty Pipeline</p>
                        <p className="text-xs text-slate-500 max-w-sm font-medium leading-relaxed">
                          Select a PDF to extract raw text manually, then use Puter AI to structure it into questions.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
                {extractedPreview.length > 0 && (
                  <CardFooter className="bg-white p-6 border-t flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => { setExtractedPreview([]); }} className="font-bold text-slate-500">Reset</Button>
                    <Button onClick={handleSaveExtracted} className="font-black h-12 px-10 shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-transform active:scale-95">
                      Batch Save to Cloud
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between gap-4 flex-wrap items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search users by email..." 
                  className="pl-9" 
                  value={userSearchQuery} 
                  onChange={(e) => setUserSearchQuery(e.target.value)} 
                />
              </div>
              <Button 
                variant="outline" 
                onClick={fetchUsers} 
                className="gap-2 font-black text-xs"
              >
                <RefreshCw className="w-4 h-4" /> Refresh Users
              </Button>
            </div>

            <Card className="overflow-hidden border-none shadow-sm rounded-xl bg-white">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px]">User</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Daily Progress</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Credits</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Streak</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Last Active</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users
                    .filter(user => 
                      user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                    )
                    .map(user => {
                      const dailyProgress = Math.round(
                        ((user.dailyQuestionsAnswered || 0) / 20 * 30) + 
                        ((user.dailyTestsFinished || 0) / 1 * 40) + 
                        ((user.mistakesReviewed || 0) / 10 * 30)
                      );
                      const hasClaimedRewards = user.taskQuestionsClaimed && user.taskMockClaimed && user.taskMistakesClaimed;
                      
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <UserCheck className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{user.email || 'Unknown'}</p>
                                <p className="text-[10px] text-slate-500">ID: {user.id?.slice(0, 8)}...</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-600">Progress</span>
                                <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                  <div 
                                    className="bg-primary h-1.5 rounded-full transition-all" 
                                    style={{ width: `${Math.min(dailyProgress, 100)}%` }} 
                                  />
                                </div>
                                <span className="text-xs font-black text-primary">{Math.min(dailyProgress, 100)}%</span>
                              </div>
                              <div className="flex gap-3 text-[9px] text-slate-500">
                                <span>Q: {user.dailyQuestionsAnswered || 0}/20</span>
                                <span>T: {user.dailyTestsFinished || 0}/1</span>
                                <span>M: {user.mistakesReviewed || 0}/10</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800">{user.credits || 0}</span>
                                <Badge variant={hasClaimedRewards ? "secondary" : "outline"} className="text-[8px]">
                                  {hasClaimedRewards ? "Claimed" : "Available"}
                                </Badge>
                              </div>
                              <p className="text-[9px] text-slate-500">Today: +{user.dailyCreditEarned || 0}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Calendar className="w-3 h-3 text-orange-600" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-800">{user.streakCount || 0}</p>
                                <p className="text-[9px] text-slate-500">days</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs text-slate-600">
                              {user.lastActiveDate ? 
                                new Date(user.lastActiveDate?.toDate?.() || user.lastActiveDate).toLocaleDateString() : 
                                'Never'
                              }
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetUserDailyTasks(user.id, user.email || 'Unknown')}
                              disabled={resettingUserTask === user.id}
                              className="gap-2 font-black text-xs"
                            >
                              {resettingUserTask === user.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              Reset Tasks
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-medium">
                        No users found in the system.
                      </TableCell>
                    </TableRow>
                  )}
                  {users.filter(user => 
                    user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                  ).length === 0 && userSearchQuery && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-medium">
                        No users found matching "{userSearchQuery}".
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm rounded-xl bg-white">
                <CardHeader><CardTitle className="text-lg font-black">Simulation Rules</CardTitle><CardDescription>Global limits for random question fetching.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Global Timer (Seconds/Question)</label>
                    <Input type="number" value={timePerQuestion} onChange={(e) => setTimePerQuestion(parseInt(e.target.value) || 60)} />
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl space-y-4 border">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Dynamic Limit Logic</p>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black">Gen Ed Limit</label>
                      <Input type="number" value={limits.limitGenEd} onChange={(e) => setLimits(l => ({...l, limitGenEd: parseInt(e.target.value) || 10}))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black">Prof Ed Limit</label>
                      <Input type="number" value={limits.limitProfEd} onChange={(e) => setLimits(l => ({...l, limitProfEd: parseInt(e.target.value) || 10}))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black">Specialization Limit</label>
                      <Input type="number" value={limits.limitSpec} onChange={(e) => setLimits(l => ({...l, limitSpec: parseInt(e.target.value) || 10}))} />
                    </div>
                  </div>
                  <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full font-black h-12 shadow-lg shadow-primary/20">
                    {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Config
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm rounded-xl bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" /> Puter AI Health
                  </CardTitle>
                  <CardDescription>Verify your Puter AI connection.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-6 bg-slate-50 rounded-2xl border min-h-[120px] flex flex-col justify-center">
                    {!aiTestResult && !testingAI && (
                      <p className="text-xs text-muted-foreground text-center font-medium italic">Click to probe the AI gateway.</p>
                    )}
                    {testingAI && (
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Probing Puter...</span>
                      </div>
                    )}
                    {aiTestResult && (
                      <div className={`space-y-3 ${aiTestResult.success ? 'text-emerald-700' : 'text-destructive'}`}>
                        <div className="flex items-center gap-2">
                          {aiTestResult.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                          <span className="font-black text-sm">{aiTestResult.success ? 'Success' : 'Failed'}</span>
                        </div>
                        <p className="text-xs leading-relaxed font-medium bg-white p-3 rounded-lg border shadow-inner">
                          {aiTestResult.message}
                        </p>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={handleRunAIConnectionTest} 
                    disabled={testingAI} 
                    variant="outline" 
                    className="w-full font-black h-12 gap-2 border-primary/20 hover:bg-primary/5 text-primary"
                  >
                    {testingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} 
                    Run AI Health Check
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
