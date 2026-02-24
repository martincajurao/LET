'use client';

import React, { useState } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Languages, 
  BookOpen, 
  Star, 
  X, 
  Clock,
  ChevronRight 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExam: (category: string) => void;
  loading?: boolean;
}

export function PracticeModal({ isOpen, onClose, onStartExam, loading = false }: PracticeModalProps) {
  const { user } = useUser();

  const practiceModes = [
    {
      id: 'all',
      name: 'Full Simulation',
      description: 'Complete LET board exam with all categories',
      icon: <Zap className="w-6 h-6" />,
      color: 'bg-primary text-primary-foreground',
      borderColor: 'border-primary',
      time: '~30 minutes',
      questions: '30 questions'
    },
    {
      id: 'General Education',
      name: 'General Education',
      description: 'Language, Mathematics, Science & Humanities',
      icon: <Languages className="w-6 h-6" />,
      color: 'bg-blue-500 text-white',
      borderColor: 'border-blue-500',
      time: '~10 minutes',
      questions: '10 questions'
    },
    {
      id: 'Professional Education',
      name: 'Professional Education',
      description: 'Teaching Principles & Child Development',
      icon: <BookOpen className="w-6 h-6" />,
      color: 'bg-purple-500 text-white',
      borderColor: 'border-purple-500',
      time: '~10 minutes',
      questions: '10 questions'
    },
    {
      id: 'Specialization',
      name: user?.majorship || 'Specialization',
      description: `Your chosen major: ${user?.majorship || 'Not selected'}`,
      icon: <Star className="w-6 h-6" />,
      color: 'bg-emerald-500 text-white',
      borderColor: 'border-emerald-500',
      time: '~10 minutes',
      questions: '10 questions'
    }
  ];

  const handleStartPractice = (category: string) => {
    onStartExam(category);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 bg-slate-50 border-0 shadow-2xl practice-modal-overlay">
        <DialogHeader className="border-b border-slate-200/50 bg-white p-6 pb-4 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black text-left bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Choose Practice Mode
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-1">Select how you want to practice today</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full h-10 w-10 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5 text-slate-600" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {practiceModes.map((mode) => (
              <Card
                key={mode.id}
                className={cn(
                  "border-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-2 group practice-mode-card",
                  mode.borderColor,
                  "overflow-hidden bg-white rounded-2xl"
                )}
                onClick={() => !loading && handleStartPractice(mode.id)}
              >
                <CardHeader className="pb-4 relative">
                  {/* Android-style card header gradient */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-10 rounded-t-2xl",
                    mode.id === 'all' ? 'from-primary/20 to-primary/5' :
                    mode.id === 'General Education' ? 'from-blue-500/20 to-blue-500/5' :
                    mode.id === 'Professional Education' ? 'from-purple-500/20 to-purple-500/5' :
                    'from-emerald-500/20 to-emerald-500/5'
                  )} />
                  
                  <div className="flex items-start justify-between relative z-10">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                      mode.color
                    )}>
                      {mode.icon}
                    </div>
                    <Badge variant="secondary" className={cn(
                      "text-[10px] font-bold px-3 py-1 shadow-md",
                      mode.id === 'all' ? 'bg-primary/20 text-primary border-primary/30' :
                      mode.id === 'General Education' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      mode.id === 'Professional Education' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                      'bg-emerald-100 text-emerald-700 border-emerald-200'
                    )}>
                      {mode.questions}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-black mt-4 group-hover:text-primary transition-colors">{mode.name}</CardTitle>
                  <p className="text-sm text-slate-600 line-clamp-2 mt-1">{mode.description}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-full">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{mode.time}</span>
                    </div>
                    <Button
                      size="sm"
                      disabled={loading}
                      className={cn(
                        "font-bold text-xs px-6 py-3 h-10 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 android-button",
                        mode.id === 'all' 
                          ? "bg-primary hover:bg-primary/90 text-white shadow-primary/25 hover:shadow-primary/35" 
                          : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/25 hover:shadow-slate-900/35"
                      )}
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent border-r-transparent loading-spinner rounded-full" />
                          Starting...
                        </>
                      ) : (
                        <>
                          Start
                          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <Languages className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-black text-sm text-blue-900 flex items-center gap-2">
                  Pro Tip
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                </h4>
                <p className="text-xs text-blue-700 mt-2 leading-relaxed">
                  Start with a Full Simulation to get a complete assessment of your readiness, 
                  then focus on specific areas that need improvement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
