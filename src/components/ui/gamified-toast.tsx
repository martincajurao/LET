'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Sparkles,
  Trophy,
  Zap,
  Star,
  Flame,
  Lock,
  Unlock,
  X,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'reward' | 'info' | 'achievement' | 'streak' | 'unlock' | 'levelup';

export interface GamifiedToastData {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  xp?: number;
  credits?: number;
  duration?: number;
}

interface GamifiedToastProps {
  toast: GamifiedToastData;
  onClose: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle2,
    color: 'from-emerald-500 to-green-400',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-500',
    shadowColor: 'shadow-emerald-500/20',
  },
  error: {
    icon: XCircle,
    color: 'from-red-500 to-rose-400',
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-500',
    shadowColor: 'shadow-red-500/20',
  },
  reward: {
    icon: Sparkles,
    color: 'from-yellow-500 to-orange-400',
    borderColor: 'border-yellow-500/30',
    iconColor: 'text-yellow-500',
    shadowColor: 'shadow-yellow-500/20',
  },
  info: {
    icon: Zap,
    color: 'from-blue-500 to-cyan-400',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-500',
    shadowColor: 'shadow-blue-500/20',
  },
  achievement: {
    icon: Trophy,
    color: 'from-purple-500 to-pink-400',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-500',
    shadowColor: 'shadow-purple-500/20',
  },
  streak: {
    icon: Flame,
    color: 'from-orange-500 to-red-400',
    borderColor: 'border-orange-500/30',
    iconColor: 'text-orange-500',
    shadowColor: 'shadow-orange-500/20',
  },
  unlock: {
    icon: Unlock,
    color: 'from-emerald-500 to-teal-400',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-500',
    shadowColor: 'shadow-emerald-500/20',
  },
  levelup: {
    icon: Star,
    color: 'from-yellow-500 to-amber-400',
    borderColor: 'border-yellow-500/30',
    iconColor: 'text-yellow-500',
    shadowColor: 'shadow-yellow-500/20',
  },
};

function GamifiedToastItem({ toast, onClose }: GamifiedToastProps) {
  const config = toastConfig[toast.type];
  const Icon = config.icon;
  const [isVisible, setIsVisible] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  const duration = toast.duration || 4000;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => {
        onClose(toast.id);
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, toast.id, onClose]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ 
          opacity: isClosing ? 0 : 1, 
          y: isClosing ? -20 : 0,
          scale: isClosing ? 0.9 : 1 
        }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4"
      >
        <div 
          className={cn(
            "relative overflow-hidden rounded-[1.5rem] border-2 bg-card p-4 shadow-2xl backdrop-blur-xl",
            config.borderColor,
            config.shadowColor
          )}
        >
          {/* Background gradient */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-10",
            config.color
          )} />
          
          {/* Content */}
          <div className="relative flex items-start gap-4">
            <div className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg",
              config.color
            )}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-sm text-foreground">{toast.title}</h4>
              {toast.description && (
                <p className="mt-0.5 text-xs text-muted-foreground font-medium">{toast.description}</p>
              )}
              
              {/* Rewards display */}
              {(toast.xp || toast.credits) && (
                <div className="mt-2 flex gap-2">
                  {toast.xp && (
                    <div className={cn(
                      "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black",
                      config.iconColor,
                      "bg-current/10"
                    )}>
                      <Zap className="h-3 w-3" />
                      +{toast.xp} XP
                    </div>
                  )}
                  {toast.credits && (
                    <div className="flex items-center gap-1 rounded-lg bg-yellow-500/10 px-2 py-1 text-xs font-black text-yellow-600">
                      <Sparkles className="h-3 w-3" />
                      +{toast.credits}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <motion.div 
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: duration / 1000, ease: "linear" }}
              className={cn("h-full bg-gradient-to-r", config.color)}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Toast manager context
interface ToastContextType {
  toasts: GamifiedToastData[];
  addToast: (toast: Omit<GamifiedToastData, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export function useGamifiedToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useGamifiedToast must be used within a GamifiedToastProvider');
  }
  return context;
}

// Provider component
interface GamifiedToastProviderProps {
  children: React.ReactNode;
}

let toastId = 0;

export function GamifiedToastProvider({ children }: GamifiedToastProviderProps) {
  const [toasts, setToasts] = useState<GamifiedToastData[]>([]);

  const addToast = useCallback((toast: Omit<GamifiedToastData, 'id'>) => {
    const id = (++toastId).toString();
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <AnimatePresence>
        {toasts.map(toast => (
          <GamifiedToastItem 
            key={toast.id} 
            toast={toast} 
            onClose={removeToast} 
          />
        ))}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

// Standalone showToast function (for use outside provider)
export function showGamifiedToast(toast: Omit<GamifiedToastData, 'id'>) {
  // This will be handled by dispatching through the provider
  // For now, we'll dispatch a custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('showGamifiedToast', { detail: toast }));
  }
}

// Hook to use toast without provider
export function useGamifiedToastSimple() {
  const addToast = useCallback((toast: Omit<GamifiedToastData, 'id'>) => {
    showGamifiedToast(toast);
  }, []);

  return { toast: addToast };
}

export default GamifiedToastProvider;

