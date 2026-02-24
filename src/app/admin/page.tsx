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
            <Link href="/"><Button variant="ghost" size="sm" className="gap-2 font-bold"><ArrowLeft className="w-4 h-4" />Back</Button></Link>
            <span className="text-lg font-black tracking-tight flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Admin Panel</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-card"><CardHeader className="p-4"><CardDescription className="text-[10px] font-black uppercase">Total Pool</CardDescription><CardTitle className="text-xl font-black">{questions.length}</CardTitle></CardHeader></Card>
          <Card className="border-none shadow-sm bg-card"><CardHeader className="p-4"><CardDescription className="text-[10px] font-black uppercase">Gen Ed</CardDescription><CardTitle className="text-xl font-black">{categoryCounts['General Education']}</CardTitle></CardHeader></Card>
          <Card className="border-none shadow-sm bg-card"><CardHeader className="p-4"><CardDescription className="text-[10px] font-black uppercase">Prof Ed</CardDescription><CardTitle className="text-xl font-black">{categoryCounts['Professional Education']}</CardTitle></CardHeader></Card>
          <Card className="border-none shadow-sm bg-card"><CardHeader className="p-4"><CardDescription className="text-[10px] font-black uppercase">Spec</CardDescription><CardTitle className="text-xl font-black">{categoryCounts['Specialization']}</CardTitle></CardHeader></Card>
        </div>

        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="bg-card border p-1 rounded-xl">
            <TabsTrigger value="questions" className="font-bold">Manager</TabsTrigger>
            <TabsTrigger value="pdf-import" className="font-bold flex items-center gap-2"><FileUp className="w-3.5 h-3.5" /> PDF Import</TabsTrigger>
            <TabsTrigger value="users" className="font-bold flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
            <TabsTrigger value="config" className="font-bold">Config</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            <div className="flex justify-between gap-4 flex-wrap items-center">
              <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." className="pl-9 bg-card border-border" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
              <div className="flex gap-2"><Button onClick={() => setIsDialogOpen(true)} className="font-black text-xs"><Plus className="w-4 h-4 mr-2" /> Add Item</Button></div>
            </div>
            <Card className="overflow-hidden border-none shadow-sm rounded-xl bg-card">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow><TableHead className="font-black uppercase text-[10px]">Track</TableHead><TableHead className="font-black uppercase text-[10px]">Question</TableHead><TableHead className="text-right font-black uppercase text-[10px]">Actions</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {questions.filter(q => q.text.toLowerCase().includes(searchQuery.toLowerCase())).map(q => (
                    <TableRow key={q.id} className="hover:bg-muted/10 border-border">
                      <TableCell><Badge variant="outline" className="text-[10px] font-bold">{q.subject}</Badge></TableCell>
                      <TableCell className="font-medium text-sm"><span className="line-clamp-1">{q.text}</span></TableCell>
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
            <Card className="overflow-hidden border-none shadow-sm rounded-xl bg-card">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow><TableHead className="font-black uppercase text-[10px]">User</TableHead><TableHead className="font-black uppercase text-[10px]">Credits</TableHead><TableHead className="font-black uppercase text-[10px]">Last Active</TableHead></TableRow>
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
        </Tabs>
      </main>
    </div>
  );
}