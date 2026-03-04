'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Users, 
  Swords, 
  Loader2, 
  Trophy,
  Flame,
  Zap,
  Target,
  Clock,
  Crown,
  ShieldCheck,
  Star,
  Sparkles,
  Crosshair,
  Search,
  ArrowRight,
  TrendingUp,
  Eye,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Prediction {
  id: string;
  userId: string;
  topic: string;
  subject: string;
  predicted: boolean;
  actual?: boolean;
  points: number;
  createdAt: number;
}

interface PredictionLeagueProps {
  userId?: string;
}

const TOPICS = [
  { id: 'child_dev', topic: 'Child Development', subject: 'General Education', difficulty: 'Medium' },
  { id: 'english_grammar', topic: 'English Grammar', subject: 'General Education', difficulty: 'Easy' },
  { id: 'math_fundamentals', topic: 'Mathematics Fundamentals', subject: 'General Education', difficulty: 'Medium' },
  { id: 'science_process', topic: 'Science Process', subject: 'General Education', difficulty: 'Easy' },
  { id: 'filipino_culture', topic: 'Filipino Culture & Values', subject: 'Professional Education', difficulty: 'Medium' },
  { id: 'teaching_methods', topic: 'Teaching Methods', subject: 'Professional Education', difficulty: 'Hard' },
  { id: 'assessment', topic: 'Assessment & Evaluation', subject: 'Professional Education', difficulty: 'Hard' },
  { id: 'special_ed', topic: 'Special Education', subject: 'Specialization', difficulty: 'Hard' },
  { id: 'guidance_counseling', topic: 'Guidance & Counseling', subject: 'Specialization', difficulty: 'Medium' },
  { id: 'curriculum_dev', topic: 'Curriculum Development', subject: 'Specialization', difficulty: 'Hard' },
];

export function PredictionLeague({ userId }: PredictionLeagueProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPredictDialog, setShowPredictDialog] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<typeof TOPICS[0] | null>(null);
  const [userPrediction, setUserPrediction] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user predictions
  useEffect(() => {
    if (!userId || !firestore) return;

    const predictionsQuery = query(
      collection(firestore, 'predictions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsub = onSnapshot(predictionsQuery, (snap) => {
      const predData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prediction));
      setPredictions(predData);
      setLoading(false);
    });

    return () => unsub();
  }, [userId, firestore]);

  const handleSubmitPrediction = async () => {
    if (!user || !selectedTopic || userPrediction === null || !firestore) return;
    
    setIsSubmitting(true);

    try {
      const predictionData = {
        userId: user.uid,
        topic: selectedTopic.topic,
        subject: selectedTopic.subject,
        predicted: userPrediction,
        points: 0,
        createdAt: Date.now()
      };

      await addDoc(collection(firestore, 'predictions'), predictionData);
      
      toast({ 
        variant: "reward", 
        title: "Prediction Submitted!", 
        description: `You predicted "${selectedTopic.topic}" will appear. Results coming soon!` 
      });
      
      setShowPredictDialog(false);
      setSelectedTopic(null);
      setUserPrediction(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Prediction Failed", description: "Could not submit prediction." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const userStats = useMemo(() => {
    const total = predictions.length;
    const correct = predictions.filter(p => p.predicted === p.actual).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, correct, accuracy };
  }, [predictions]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-card rounded-[2rem] border-2 border-dashed border-border/50">
        <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Syncing...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight">Prediction League</h3>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Predict Exam Topics</p>
          </div>
        </div>
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[8px] font-black uppercase">
          {userStats.accuracy}% Accuracy
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-green-500/10 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-3 h-3 text-green-500" />
            <span className="text-[8px] font-black uppercase text-green-600">Predictions</span>
          </div>
          <p className="text-lg font-black text-green-700">{userStats.total}</p>
        </div>
        <div className="bg-teal-500/10 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-3 h-3 text-teal-500" />
            <span className="text-[8px] font-black uppercase text-teal-600">Correct</span>
          </div>
          <p className="text-lg font-black text-teal-700">{userStats.correct}</p>
        </div>
      </div>

      {/* Available Predictions */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Predict Next Week's Topics</p>
        <div className="space-y-2">
          {TOPICS.slice(0, 3).map(topic => (
            <Card key={topic.id} className="rounded-xl border-border/50 overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-black">{topic.topic}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="h-4 text-[7px] bg-muted text-muted-foreground">{topic.subject.replace(' Education', '')}</Badge>
                      <Badge className={cn(
                        "h-4 text-[7px]",
                        topic.difficulty === 'Easy' ? "bg-green-500/20 text-green-600" :
                        topic.difficulty === 'Medium' ? "bg-yellow-500/20 text-yellow-600" :
                        "bg-red-500/20 text-red-600"
                      )}>{topic.difficulty}</Badge>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setSelectedTopic(topic);
                      setShowPredictDialog(true);
                    }}
                    className="h-8 px-3 rounded-lg font-black text-[9px] bg-green-500"
                  >
                    <Eye className="w-3 h-3 mr-1" /> Predict
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Predictions */}
      {predictions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent Predictions</p>
          <div className="space-y-1">
            {predictions.slice(0, 3).map(pred => (
              <div key={pred.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate">{pred.topic}</p>
                  <p className="text-[8px] text-muted-foreground uppercase">
                    {pred.predicted ? 'Will appear' : "Won't appear"}
                  </p>
                </div>
                {pred.actual !== undefined && (
                  <Badge className={cn(
                    "h-5 text-[8px] font-black",
                    pred.predicted === pred.actual ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
                  )}>
                    {pred.predicted === pred.actual ? '✓ Correct' : '✗ Wrong'}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prediction Dialog */}
      <Dialog open={showPredictDialog} onOpenChange={setShowPredictDialog}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-w-[350px] overflow-hidden outline-none">
          <DialogHeader className="p-6 pb-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl">
                <HelpCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-xl font-black">Make Prediction</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Will this topic appear in next week's exams?
            </DialogDescription>
          </DialogHeader>

          {selectedTopic && (
            <div className="p-6 space-y-4">
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <p className="text-lg font-black">{selectedTopic.topic}</p>
                <div className="flex justify-center gap-2 mt-2">
                  <Badge className="h-5 text-[8px]">{selectedTopic.subject}</Badge>
                  <Badge className={cn(
                    "h-5 text-[8px]",
                    selectedTopic.difficulty === 'Easy' ? "bg-green-500/20 text-green-600" :
                    selectedTopic.difficulty === 'Medium' ? "bg-yellow-500/20 text-yellow-600" :
                    "bg-red-500/20 text-red-600"
                  )}>{selectedTopic.difficulty}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={userPrediction === true ? "default" : "outline"}
                  onClick={() => setUserPrediction(true)}
                  className={cn(
                    "h-14 rounded-xl font-black text-sm",
                    userPrediction === true ? "bg-green-500" : ""
                  )}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Will Appear
                </Button>
                <Button
                  variant={userPrediction === false ? "default" : "outline"}
                  onClick={() => setUserPrediction(false)}
                  className={cn(
                    "h-14 rounded-xl font-black text-sm",
                    userPrediction === false ? "bg-red-500" : ""
                  )}
                >
                  <TrendingUp className="w-4 h-4 mr-2 rotate-180" />
                  Won't Appear
                </Button>
              </div>

              <div className="bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-600" />
                  <p className="text-[9px] font-black text-yellow-700">
                    +50 XP for correct predictions!
                  </p>
                </div>
              </div>

              <Button 
                onClick={handleSubmitPrediction}
                disabled={userPrediction === null || isSubmitting}
                className="w-full h-12 rounded-xl font-black text-sm bg-gradient-to-r from-green-500 to-teal-500"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Submit Prediction <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PredictionLeague;

