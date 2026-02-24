'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Coins, Sparkles, ChevronRight, Zap, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCareerRankTitle } from '@/lib/xp-system';

interface RankUpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rank: number;
  reward: number;
}

export function RankUpDialog({ isOpen, onClose, rank, reward }: RankUpDialogProps) {
  const currentTitle = getCareerRankTitle(rank);
  const nextRank = rank + 1;
  const nextTitle = getCareerRankTitle(nextRank);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-[3rem] border-none shadow-2xl p-0 max-w-[340px] overflow-hidden outline-none z-[1100]">
        <div className="bg-primary/10 p-12 flex flex-col items-center justify-center relative overflow-hidden">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.2 }}
            className="w-24 h-24 bg-primary text-primary-foreground rounded-[2.5rem] flex items-center justify-center shadow-2xl relative z-10"
          >
            <Trophy className="w-12 h-12" />
          </motion.div>
          
          {/* Animated Glow Background */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3] 
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent z-0" 
          />
          
          <div className="absolute inset-0 z-5 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], y: -100, x: (i - 2.5) * 40 }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                className="absolute bottom-0 left-1/2"
              >
                <Star className="w-3 h-3 text-primary fill-current" />
              </motion.div>
            ))}
          </div>
        </div>
        
        <div className="p-8 pt-4 text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <DialogHeader>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Career Ascension</span>
                <DialogTitle className="text-3xl font-black tracking-tight text-foreground">Rank {rank} Reached!</DialogTitle>
                <DialogDescription className="text-muted-foreground font-bold text-xs uppercase tracking-widest mt-1">
                  {currentTitle}
                </DialogDescription>
              </div>
            </DialogHeader>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-muted/30 rounded-3xl p-5 border border-border/50 flex flex-col items-center gap-2 relative overflow-hidden"
          >
            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Academic Promotion Reward</span>
            <div className="flex items-center gap-2">
              <Coins className="w-7 h-7 text-yellow-600 fill-current" />
              <span className="text-4xl font-black text-foreground">+{reward}</span>
            </div>
            <p className="text-[10px] font-medium text-muted-foreground italic">Professional credits added to vault.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
              <span>Current: {currentTitle}</span>
              <ChevronRight className="w-3 h-3" />
              <span>Next: {nextTitle}</span>
            </div>
            <Button 
              onClick={onClose}
              className="w-full h-16 rounded-[2rem] font-black text-lg gap-3 shadow-xl shadow-primary/30 group active:scale-95 transition-all"
            >
              <Zap className="w-5 h-5 fill-current" />
              Continue Journey
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
