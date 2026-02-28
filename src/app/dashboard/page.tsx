'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  GraduationCap, 
  BrainCircuit, 
  ChevronRight, 
  Zap,
  Trophy,
  Flame,
  Star,
  Loader2,
  BookOpen,
  Smartphone,
  Facebook,
  ShieldCheck,
  CheckCircle2,
  Languages,
  User,
  Users,
  Moon,
  Sun,
  Crown,
  Shield,
  Heart,
  LayoutGrid,
  Sparkles,
  Lock,
  Timer,
  Play,
  BellRing,
  Download,
  QrCode,
  Info,
  ShieldAlert,
  Gift,
  Lightbulb,
  Award,
  Target,
  Coins
} from "lucide-react";
import QRCode from 'qrcode';
import { ExamInterface } from "@/components/exam/ExamInterface";
import { ResultsOverview } from "@/components/exam/ResultsOverview";
import { QuickFireInterface } from "@/components/exam/QuickFireInterface";
import { QuickFireResults } from "@/components/exam/QuickFireResults";
import { ResultUnlockDialog } from "@/components/exam/ResultUnlockDialog";
import { RankUpDialog } from "@/components/ui/rank-up-dialog";
import { Question, MAJORSHIPS, INITIAL_QUESTIONS } from "@/app/lib/mock-data";
import { useUser, useFirestore } from "@/firebase";
import { collection, addDoc, doc, onSnapshot, updateDoc, increment, serverTimestamp, query, where, getCountFromServer } from "firebase/firestore";
import { fetchQuestionsFromFirestore, seedInitialQuestions } from "@/lib/db-seed";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getRankData, isTrackUnlocked, XP_REWARDS, COOLDOWNS, UNLOCK_RANKS, getCareerRankTitle } from '@/lib/xp-system';
import { getApkInfoUrl, getDownloadUrl } from '@/lib/config';
import { AchievementSystem } from '@/components/ui/achievement-system';
import { ReferralSystem } from '@/components/ui/referral-system';
import { useIsMobile } from '@/hooks/use-mobile';

export default function DashboardPage() {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { isDark, toggleDarkMode } = useTheme();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedMajor, setSelectedMajor] = useState<string>('');
  const [showExam, setShowExam] = useState(false);
  const [showQuickFire, setShowQuickFire] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [quickFireStarted, setQuickFireStarted] = useState(false);
  const [examResults, setExamResults] = useState<any>(null);
  const [quickFireResults, setQuickFireResults] = useState<any>(null);
  const [unlockingResult, setUnlockingResult] = useState<any>(null);
  const [showRankUpDialog, setShowRankUpDialog] = useState(false);
  const [rankUpData, setRankUpData] = useState<any>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [apkInfo, setApkInfo] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  const rankData = useMemo(() => user ? getRankData(user.xp || 0) : null, [user?.xp]);
  
  const examCategories = useMemo(() => {
    const categories = [
      { id: 'gen-ed', name: 'General Education', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10', unlocked: true },
      { id: 'prof-ed', name: 'Professional Education', icon: Users, color: 'text-green-500', bg: 'bg-green-500/10', unlocked: isTrackUnlocked(user?.xp || 0, 'prof-ed') },
      { id: 'spec', name: 'Specialization', icon: Crown, color: 'text-purple-500', bg: 'bg-purple-500/10', unlocked: isTrackUnlocked(user?.xp || 0, 'spec') },
    ];
    return categories;
  }, [user?.xp]);

  const handleStartExam = (category: string) => {
    setSelectedMajor(category);
    setShowExam(true);
    setExamStarted(true);
  };

  const handleStartQuickFire = () => {
    setShowQuickFire(true);
    setQuickFireStarted(true);
  };

  const handleExamComplete = (results: any) => {
    setExamResults(results);
    setExamStarted(false);
  };

  const handleQuickFireComplete = (results: any) => {
    setQuickFireResults(results);
    setQuickFireStarted(false);
  };

  const handleUnlockResult = (result: any) => {
    setUnlockingResult(result);
  };

  const handleRankUp = (data: any) => {
    setRankUpData(data);
    setShowRankUpDialog(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 pb-24 space-y-6">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Track your progress and achievements</p>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>

        {/* Stats Cards */}
        {user && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-none shadow-lg rounded-2xl bg-card">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-2xl font-black">{user.streakCount || 0}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Streak</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-lg rounded-2xl bg-card">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                </div>
                <p className="text-2xl font-black">{user.xp || 0}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Total XP</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-lg rounded-2xl bg-card">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-black">{rankData?.title || 'Novice'}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Rank</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-lg rounded-2xl bg-card">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Target className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-black">{user.dailyQuestionsAnswered || 0}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Questions</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Achievements */}
        <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <Award className="w-6 h-6 text-yellow-500" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {user && (
              <AchievementSystem 
                userStats={{
                  streakCount: user?.streakCount || 0,
                  totalQuestionsAnswered: user?.dailyQuestionsAnswered || 0,
                  highestScore: 0,
                  rank: rankData?.rank || 1,
                  dailyQuestionsCompleted: 0
                }}
                unlockedAchievements={[]}
              />
            )}
          </CardContent>
        </Card>

        {/* Referral System */}
        <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              Invite Friends
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <ReferralSystem />
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </div>
  );
}
