'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Particle types for celebrations
interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  duration: number;
}

interface CelebrationEffectProps {
  show: boolean;
  type?: 'confetti' | 'fireworks' | 'stars' | 'xp';
  intensity?: number;
  onComplete?: () => void;
  colors?: string[];
}

const DEFAULT_COLORS = {
  confetti: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444'],
  fireworks: ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'],
  stars: ['#fbbf24', '#fcd34d', '#fef3c7', '#fde68a'],
  xp: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
};

// Generate random particles
const generateParticles = (
  count: number,
  type: 'confetti' | 'fireworks' | 'stars' | 'xp',
  colors?: string[]
): Particle[] => {
  const colorSet = colors || DEFAULT_COLORS[type];
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const velocity = 3 + Math.random() * 5;
    
    return {
      id: i,
      x: 50 + (Math.random() - 0.5) * 20,
      y: 50,
      color: colorSet[Math.floor(Math.random() * colorSet.length)],
      size: type === 'stars' ? 8 + Math.random() * 8 : 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      velocityX: Math.cos(angle) * velocity,
      velocityY: Math.sin(angle) * velocity - 8,
      duration: 1.5 + Math.random() * 1,
    };
  });
};

export function CelebrationEffect({
  show,
  type = 'confetti',
  intensity = 50,
  onComplete,
  colors,
}: CelebrationEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (show) {
      const newParticles = generateParticles(intensity, type, colors);
      setParticles(newParticles);
      
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [show, intensity, type, colors, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
        >
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                scale: 0,
                rotate: 0,
              }}
              animate={{
                left: `${particle.x + particle.velocityX * 20}%`,
                top: `${particle.y + particle.velocityY * 30 + 50}%`,
                scale: [0, 1, 0],
                rotate: particle.rotation * 4,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: particle.duration,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                position: 'absolute',
                width: particle.size,
                height: particle.size,
                borderRadius: type === 'stars' ? '50%' : Math.random() > 0.5 ? '50%' : '2px',
                backgroundColor: particle.color,
                boxShadow: `0 0 ${particle.size}px ${particle.color}`,
              }}
            >
              {type === 'stars' && (
                <svg
                  viewBox="0 0 24 24"
                  fill={particle.color}
                  style={{ width: '100%', height: '100%' }}
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              )}
            </motion.div>
          ))}
          
          {/* Floating XP text */}
          {type === 'xp' && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.5 }}
              animate={{ opacity: 1, y: -50, scale: 1.2 }}
              exit={{ opacity: 0, y: -100 }}
              transition={{ duration: 1.5 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="text-4xl font-black text-emerald-500 drop-shadow-lg flex items-center gap-2">
                <span className="animate-pulse">+</span>
                <span className="animate-bounce">XP</span>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Streak Fire Effect Component
interface StreakFireProps {
  streakCount: number;
  show?: boolean;
}

export function StreakFireEffect({ streakCount, show = true }: StreakFireProps) {
  const [flames, setFlames] = useState<number[]>([]);

  useEffect(() => {
    if (streakCount >= 7 && show) {
      setFlames([1, 2, 3]);
    } else {
      setFlames([]);
    }
  }, [streakCount, show]);

  if (flames.length === 0) return null;

  return (
    <div className="absolute -top-2 -right-2 flex">
      {flames.map((i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -4, 0],
            scale: [1, 1.2, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.1,
          }}
          className="w-4 h-4"
          style={{ marginLeft: i > 0 ? -8 : 0 }}
        >
          <svg viewBox="0 0 24 24" fill="#f97316">
            <path d="M12 2c0 0-8 6-8 12s4 8 8 8 8-4 8-8c0-6-8-12-8-12z" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

// Floating XP Animation Component
interface FloatingXPProps {
  amount: number;
  show: boolean;
  onComplete?: () => void;
}

export function FloatingXP({ amount, show, onComplete }: FloatingXPProps) {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ 
            opacity: [1, 1, 0], 
            y: -80, 
            scale: [1, 1.3, 1] 
          }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ duration: 2 }}
          className="fixed pointer-events-none z-[5000] left-1/2 top-1/2 -translate-x-1/2"
        >
          <div className="bg-gradient-to-r from-emerald-500 to-green-400 px-6 py-3 rounded-full shadow-2xl border-2 border-white/30">
            <span className="text-2xl font-black text-white flex items-center gap-2">
              <span className="animate-bounce">+</span>
              <span>{amount}</span>
              <span className="text-emerald-100 text-sm">XP</span>
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Pulse ring effect for achievements
interface PulseRingProps {
  show: boolean;
  color?: string;
}

export function PulseRing({ show, color = '#10b981' }: PulseRingProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0.5, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: `3px solid ${color}`,
          }}
        />
      )}
    </AnimatePresence>
  );
}

// Victory pose animation wrapper
interface VictoryAnimationProps {
  show: boolean;
  children: React.ReactNode;
}

export function VictoryAnimation({ show, children }: VictoryAnimationProps) {
  return (
    <AnimatePresence mode="wait">
      {show ? (
        <motion.div
          key="victory"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      ) : (
        <motion.div
          key="normal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Celebration hook for easy integration
export function useCelebration() {
  const [celebration, setCelebration] = useState<{
    show: boolean;
    type: 'confetti' | 'fireworks' | 'stars' | 'xp';
    amount?: number;
  }>({ show: false, type: 'confetti' });

  const triggerCelebration = useCallback((
    type: 'confetti' | 'fireworks' | 'stars' | 'xp' = 'confetti',
    amount?: number
  ) => {
    setCelebration({ show: true, type, amount });
  }, []);

  const triggerConfetti = useCallback(() => triggerCelebration('confetti'), [triggerCelebration]);
  const triggerFireworks = useCallback(() => triggerCelebration('fireworks'), [triggerCelebration]);
  const triggerXPGain = useCallback((amount: number) => triggerCelebration('xp', amount), [triggerCelebration]);

  const clearCelebration = useCallback(() => {
    setCelebration({ show: false, type: 'confetti' });
  }, []);

  return {
    celebration,
    triggerCelebration,
    triggerConfetti,
    triggerFireworks,
    triggerXPGain,
    clearCelebration,
  };
}

