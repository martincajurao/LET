'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Share2, 
  Download, 
  Trophy, 
  Star, 
  Zap, 
  Flame,
  Award,
  Target,
  CheckCircle2,
  Twitter,
  Facebook,
  Link2,
  Copy,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getRankData, getCareerRankTitle } from '@/lib/xp-system';

interface ShareableResultCardProps {
  score: number;
  rank: number;
  xpEarned: number;
  totalXp: number;
  streakCount: number;
  subject?: string;
  timeSpent?: number;
  onShare?: () => void;
  onClose?: () => void;
}

export function ShareableResultCard({
  score,
  rank,
  xpEarned,
  totalXp,
  streakCount,
  subject = 'Full Simulation',
  timeSpent,
  onShare,
  onClose
}: ShareableResultCardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const rankData = getRankData(totalXp);
  const rankTitle = getCareerRankTitle(rank);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'from-yellow-400 to-amber-500';
    if (score >= 80) return 'from-emerald-400 to-green-500';
    if (score >= 70) return 'from-blue-400 to-cyan-500';
    if (score >= 60) return 'from-purple-400 to-violet-500';
    return 'from-gray-400 to-slate-500';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🏆';
    if (score >= 80) return '⭐';
    if (score >= 70) return '🎯';
    if (score >= 60) return '💪';
    return '📚';
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`I scored ${score}% on ${subject}! 🎉\n\nLet me challenge you to beat my score!`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `I scored ${score}% on ${subject}!`,
          text: `I just scored ${score}% on ${subject}! 🎉 Can you beat my score?`,
        });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setShowShareOptions(true);
        }
      }
    } else {
      setShowShareOptions(true);
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Result Card Preview */}
          <div 
            ref={cardRef}
            className={cn(
              "rounded-[2.5rem] overflow-hidden shadow-2xl",
              "bg-gradient-to-br from-card to-card"
            )}
          >
            {/* Header */}
            <div className={cn(
              "p-8 text-center text-white relative overflow-hidden",
              "bg-gradient-to-br from-primary to-purple-600"
            )}>
              <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <Trophy className="w-24 h-24" />
              </div>
              
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="text-6xl mb-2"
              >
                {getScoreEmoji(score)}
              </motion.div>
              
              <h2 className="text-3xl font-black tracking-tight">
                {score}%
              </h2>
              <p className="text-white/80 text-sm font-medium uppercase tracking-wider">
                {subject}
              </p>

              {score >= 90 && (
                <Badge className="mt-3 bg-yellow-500 text-yellow-900 font-black text-xs">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Perfect Score!
                </Badge>
              )}
            </div>

            {/* Stats */}
            <div className="p-6 bg-card space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-2xl p-4 text-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-black text-primary">+{xpEarned}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">XP Earned</p>
                </div>
                <div className="bg-muted/30 rounded-2xl p-4 text-center">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-2xl font-black text-orange-500">{streakCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Day Streak</p>
                </div>
              </div>

              <div className="bg-muted/30 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Rank Progress</span>
                  <span className="text-sm font-black text-primary">Rank {rank}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${rankData.progress}%` }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                      className="h-full bg-gradient-to-r from-primary to-purple-500"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {Math.round(rankData.progress)}%
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">{rankTitle}</p>
              </div>

              {timeSpent && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time Spent</span>
                  <span className="font-black">{formatTime(timeSpent)}</span>
                </div>
              )}
            </div>

            {/* Branding */}
            <div className="px-6 py-4 bg-muted/20 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                LET Prep
              </span>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 space-y-3">
            <Button 
              onClick={handleNativeShare}
              className="w-full h-14 rounded-2xl font-black text-sm gap-2 bg-primary hover:bg-primary/90"
            >
              <Share2 className="w-5 h-5" />
              Share Result
            </Button>
            
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={handleCopyLink}
                className="flex-1 h-12 rounded-xl font-black text-xs gap-2"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button 
                variant="outline"
                onClick={onClose}
                className="flex-1 h-12 rounded-xl font-black text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Share Options Modal */}
      <AnimatePresence>
        {showShareOptions && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
            onClick={() => setShowShareOptions(false)}
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-card rounded-[2rem] p-6 w-full max-w-xs mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black">Share to</h3>
                <button onClick={() => setShowShareOptions(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="w-12 h-12 bg-[#1DA1F2] rounded-xl flex items-center justify-center">
                    <Twitter className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-bold">Twitter</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="w-12 h-12 bg-[#4267B2] rounded-xl flex items-center justify-center">
                    <Facebook className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-bold">Facebook</span>
                </button>
              </div>

              <Button 
                variant="ghost"
                onClick={() => setShowShareOptions(false)}
                className="w-full mt-4"
              >
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ShareableResultCard;

