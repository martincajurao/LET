'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Share2, 
  Download, 
  CheckCircle2, 
  Trophy, 
  Flame,
  Sparkles,
  Copy,
  Twitter,
  Facebook,
  MessageCircle,
  Loader2,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

interface ShareableResultCardProps {
  open: boolean;
  onClose: () => void;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  rank?: number;
  streak?: number;
  xpEarned?: number;
  subject?: string;
}

export function ShareableResultCard({
  open,
  onClose,
  score,
  totalQuestions,
  correctAnswers,
  timeSpent,
  rank = 1,
  streak = 0,
  xpEarned = 0,
  subject = 'Full Simulation',
}: ShareableResultCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate canvas image
  const generateImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (Instagram story ratio 9:16)
    canvas.width = 1080;
    canvas.height = 1920;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative circles
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.beginPath();
    ctx.arc(200, 200, 400, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.beginPath();
    ctx.arc(900, 1600, 300, 0, Math.PI * 2);
    ctx.fill();

    // Header
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 48px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText("LET's PREP", canvas.width / 2, 180);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '32px system-ui';
    ctx.fillText("Board Exam Results", canvas.width / 2, 240);

    // Subject badge
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.roundRect(340, 300, 400, 60, 30);
    ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 28px system-ui';
    ctx.fillText(subject, canvas.width / 2, 340);

    // Score circle
    const centerX = canvas.width / 2;
    const centerY = 650;
    const radius = 200;

    // Background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
    ctx.fill();
    ctx.strokeStyle = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    ctx.lineWidth = 20;
    ctx.stroke();

    // Score text
    ctx.fillStyle = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    ctx.font = 'bold 120px system-ui';
    ctx.fillText(`${score}%`, centerX, centerY + 40);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '28px system-ui';
    ctx.fillText(getScoreMessage(score), centerX, centerY + 100);

    // Stats row
    const stats = [
      { label: 'Correct', value: `${correctAnswers}/${totalQuestions}`, color: '#10b981' },
      { label: 'Time', value: formatTime(timeSpent), color: '#3b82f6' },
      { label: 'XP', value: `+${xpEarned}`, color: '#f59e0b' },
    ];

    const startX = 140;
    const spacing = 340;

    stats.forEach((stat, i) => {
      const x = startX + i * spacing;
      
      // Card background
      ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
      ctx.roundRect(x - 100, 1000, 200, 180, 24);
      ctx.fill();

      // Value
      ctx.fillStyle = stat.color;
      ctx.font = 'bold 48px system-ui';
      ctx.fillText(stat.value, x, 1080);

      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '24px system-ui';
      ctx.fillText(stat.label, x, 1130);
    });

    // Bottom info
    if (streak > 0) {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
      ctx.roundRect(340, 1300, 400, 80, 40);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 36px system-ui';
      ctx.fillText(`🔥 ${streak} Day Streak`, canvas.width / 2, 1350);
    }

    // Rank
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.roundRect(340, 1420, 400, 80, 40);
    ctx.fill();
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 36px system-ui';
    ctx.fillText(`Rank ${rank}`, canvas.width / 2, 1470);

    // Footer
    ctx.fillStyle = '#64748b';
    ctx.font = '24px system-ui';
    ctx.fillText("Join me on LET's Prep!", canvas.width / 2, 1750);
    ctx.fillText("letprep.app", canvas.width / 2, 1800);

    // Generate image URL
    const dataUrl = canvas.toDataURL('image/png');
    setGeneratedImage(dataUrl);
  }, [score, totalQuestions, correctAnswers, timeSpent, xpEarned, streak, rank, subject]);

  const handleShare = async () => {
    setIsGenerating(true);
    
    try {
      await generateImage();
      
      if (generatedImage && navigator.share) {
        const response = await fetch(generatedImage);
        const blob = await response.blob();
        const file = new File([blob], 'result.png', { type: 'image/png' });
        
        await navigator.share({
          title: "My LET Exam Results",
          text: `I scored ${score}% on LET's Prep! 🔥`,
          files: [file],
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(`I scored ${score}% on LET's Prep! 🎓\n\nCorrect: ${correctAnswers}/${totalQuestions}\nTime: ${formatTime(timeSpent)}\nStreak: ${streak} days\n\nJoin me: letprep.app`);
        toast({ title: "Results copied!", description: "Share your achievement!" });
      }
    } catch (e) {
      // Silent fail for share
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyImage = async () => {
    if (!generatedImage) {
      await generateImage();
    }
    
    try {
      const response = await fetch(generatedImage!);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setIsCopied(true);
      toast({ title: "Image copied!", description: "Paste in your social media" });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      toast({ variant: "destructive", title: "Copy failed", description: "Try downloading instead" });
    }
  };

  const handleDownload = () => {
    if (!generatedImage) {
      generateImage();
      return;
    }

    const link = document.createElement('a');
    link.download = `lets-prep-result-${Date.now()}.png`;
    link.href = generatedImage;
    link.click();
    toast({ title: "Downloaded!", description: "Share your achievement!" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-w-[400px] overflow-hidden outline-none">
          <DialogHeader className="p-6 pb-0 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-black">Share Your Results!</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Show off your achievement and inspire others
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            {/* Preview */}
            <div className="aspect-[9/16] max-h-[300px] mx-auto rounded-2xl overflow-hidden bg-muted relative">
              {generatedImage ? (
                <img src={generatedImage} alt="Result card" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button variant="outline" onClick={generateImage} className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Generate Preview
                  </Button>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={handleShare}
                disabled={isGenerating}
                className="h-12 rounded-xl font-black text-xs gap-2"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                Share
              </Button>
              
              <Button 
                onClick={handleDownload}
                disabled={isGenerating}
                variant="outline"
                className="h-12 rounded-xl font-black text-xs gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>

            <Button 
              onClick={handleCopyImage}
              variant="ghost"
              className="w-full h-10 rounded-xl font-bold text-xs gap-2"
            >
              {isCopied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {isCopied ? "Copied to clipboard!" : "Copy as Image"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden canvas for generation */}
      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}

// Helper functions
function getScoreMessage(score: number): string {
  if (score >= 90) return "Outstanding!";
  if (score >= 80) return "Excellent!";
  if (score >= 70) return "Great Job!";
  if (score >= 60) return "Good Effort!";
  return "Keep Practicing!";
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

