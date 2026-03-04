'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  Bot, 
  Send, 
  Sparkles, 
  Lightbulb,
  Target,
  Heart,
  HelpCircle,
  Coins,
  X,
  Loader2,
  RefreshCw,
  User
} from "lucide-react";
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AI_BUDDY, AI_COSTS } from '@/lib/xp-system';
import { cn } from '@/lib/utils';
import { puter } from '@/ai/puter';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
}

interface AiBuddyDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type BuddyMode = 'tutor' | 'quizzers' | 'explainer' | 'motivator';

const MODE_ICONS: Record<BuddyMode, React.ReactNode> = {
  tutor: <Lightbulb className="w-5 h-5" />,
  quizzers: <Target className="w-5 h-5" />,
  explainer: <HelpCircle className="w-5 h-5" />,
  motivator: <Heart className="w-5 h-5" />,
};

const MODE_COLORS: Record<BuddyMode, string> = {
  tutor: 'bg-blue-500',
  quizzers: 'bg-purple-500',
  explainer: 'bg-green-500',
  motivator: 'bg-pink-500',
};

export function AiBuddyDialog({ isOpen, onClose }: AiBuddyDialogProps) {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<BuddyMode>('tutor');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      content: `Hi! I'm your AI Buddy! I can help you as a ${AI_BUDDY.MODES[mode.toUpperCase()].name}. Ask me anything!`,
      timestamp: Date.now()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Track daily usage
  const [dailyUsed, setDailyUsed] = useState(0);
  
  useEffect(() => {
    if (user) {
      const limit = user.isPro ? AI_BUDDY.PRO_MESSAGE_LIMIT : AI_BUDDY.DAILY_MESSAGE_LIMIT;
      const today = new Date().toDateString();
      const lastReset = user.lastAiBuddyReset;
      
      if (lastReset !== today) {
        setDailyUsed(0);
      } else {
        setDailyUsed(user.dailyAiBuddyMessages || 0);
      }
    }
  }, [user]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!input.trim() || !user || !firestore) return;
    
    const credits = typeof user.credits === 'number' ? user.credits : 0;
    const limit = user.isPro ? AI_BUDDY.PRO_MESSAGE_LIMIT : AI_BUDDY.DAILY_MESSAGE_LIMIT;
    
    // Check daily limit
    if (dailyUsed >= limit) {
      toast({ 
        variant: "destructive", 
        title: "Daily Limit Reached", 
        description: `You've used all ${limit} messages today. Upgrade to Pro for more!` 
      });
      return;
    }
    
    // Check credits (allow first 5 messages free, then charge)
    const messageCost = dailyUsed >= 5 ? AI_BUDDY.COST_PER_MESSAGE : 0;
    
    if (credits < messageCost && dailyUsed >= 5) {
      toast({ 
        variant: "destructive", 
        title: "Insufficient Credits", 
        description: `Need ${messageCost} credits for this message` 
      });
      return;
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Deduct credits if past free limit
      if (messageCost > 0) {
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, {
          credits: increment(-messageCost),
          dailyAiBuddyMessages: increment(1),
          lastAiBuddyReset: new Date().toDateString()
        });
        await refreshUser();
      }
      
      // Call Puter AI
      let aiResponse = '';
      
      if (puter && puter.ai) {
        const modeConfig = AI_BUDDY.MODES[mode.toUpperCase()];
        const contextMessages = messages.slice(-AI_BUDDY.MAX_HISTORY_MESSAGES)
          .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
          .join('\n');
        
        const response = await puter.ai.chat(
          `${modeConfig.systemPrompt}\n\nConversation:\n${contextMessages}\n\nUser: ${userMessage.content}\n\nAI:`,
          { model: 'gpt-5-nano', max_tokens: 512 }
        );
        
        aiResponse = response.toString();
      } else {
        aiResponse = getFallbackResponse(userMessage.content, mode);
      }
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiResponse,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setDailyUsed(prev => prev + 1);
      
    } catch (e) {
      console.error('AI Buddy error:', e);
      toast({ 
        variant: "destructive", 
        title: "AI Error", 
        description: "Failed to get response. Please try again." 
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleModeChange = (newMode: BuddyMode) => {
    setMode(newMode);
    setMessages([{
      id: 'mode-change',
      role: 'ai',
      content: `Switched to ${AI_BUDDY.MODES[newMode.toUpperCase()].name} mode! ${AI_BUDDY.MODES[newMode.toUpperCase()].description}`,
      timestamp: Date.now()
    }]);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const limit = user?.isPro ? AI_BUDDY.PRO_MESSAGE_LIMIT : AI_BUDDY.DAILY_MESSAGE_LIMIT;
  const remaining = limit - dailyUsed;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg h-[80vh] max-h-[700px] rounded-[2rem] bg-card border-none shadow-2xl p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black">AI Buddy</DialogTitle>
                <p className="text-white/70 text-xs">Your personal tutor</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg">
                <MessageCircle className="w-3 h-3" />
                <span className="text-xs font-bold">{remaining} left</span>
              </div>
              {dailyUsed >= 5 && (
                <div className="flex items-center gap-1 bg-yellow-500/80 px-2 py-1 rounded-lg">
                  <Coins className="w-3 h-3 text-white" />
                  <span className="text-xs font-bold text-white">{AI_BUDDY.COST_PER_MESSAGE}c</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Mode selector */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {(Object.keys(AI_BUDDY.MODES) as BuddyMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                  mode === m 
                    ? "bg-white text-purple-600" 
                    : "bg-white/20 text-white hover:bg-white/30"
                )}
              >
                {MODE_ICONS[m]}
                {AI_BUDDY.MODES[m.toUpperCase()].name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === 'ai' && (
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", MODE_COLORS[mode])}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-sm",
                    msg.role === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  )}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", MODE_COLORS[mode])}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted p-3 rounded-2xl">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Input */}
        <div className="p-4 border-t bg-card shrink-0">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask your ${AI_BUDDY.MODES[mode.toUpperCase()].name}...`}
              className="min-h-[44px] max-h-32 rounded-2xl resize-none bg-muted/50"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="h-auto px-4 rounded-2xl bg-primary"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          {dailyUsed >= 5 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Each message costs {AI_BUDDY.COST_PER_MESSAGE} credits
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Simple button to trigger AI Buddy dialog
export function AiBuddyButton({ onClick }: { onClick: () => void }) {
  return (
    <Button 
      onClick={onClick}
      className="h-12 px-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black text-xs uppercase tracking-widest gap-2 shadow-lg"
    >
      <Bot className="w-4 h-4" />
      AI Buddy
    </Button>
  );
}

// Fallback responses when AI is not available
function getFallbackResponse(input: string, mode: BuddyMode): string {
  const lower = input.toLowerCase();
  
  switch (mode) {
    case 'tutor':
      if (lower.includes('what') || lower.includes('define') || lower.includes('explain')) {
        return "Great question! Let me break this down step by step. Could you tell me which specific topic you'd like me to explain?";
      }
      return "I'm here to help explain any topic! What would you like to learn about?";
    
    case 'quizzers':
      if (lower.includes('create') || lower.includes('make') || lower.includes('generate')) {
        return "I'll create a practice question for you! What topic should the question be about?";
      }
      return "I can generate practice questions on any LET topic. What would you like to practice?";
    
    case 'explainer':
      if (lower.includes('complex') || lower.includes('difficult') || lower.includes('hard')) {
        return "I'll simplify this for you! What concept is confusing you?";
      }
      return "I'll make any complex topic easy to understand. What would you like explained simply?";
    
    case 'motivator':
      if (lower.includes('tired') || lower.includes('give up') || lower.includes('stop')) {
        return "Don't give up! Every step you take brings you closer to your goal. You've got this! 🎯";
      }
      return "I'm here to motivate you! Remember, every expert was once a beginner. Keep going! 💪";
    
    default:
      return "How can I help you today?";
  }
}
