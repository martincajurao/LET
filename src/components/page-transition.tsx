'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

/**
 * PageTransition Orchestrator: "Tactical Sector Entry"
 * 
 * Implements a strictly sequential "Exit-First" logic.
 * Ensures the previous sector is purged and blurred before the new 
 * intelligence track is phased into focus.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Standard container for SSR to prevent hydration jumps
  if (!isMounted) {
    return (
      <div className="w-full min-h-screen bg-background opacity-0">
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ 
          opacity: 0, 
          scale: 0.95, 
          filter: "blur(20px)",
          z: -100
        }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          filter: "blur(0px)",
          z: 0,
          transition: {
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1], // Tactical Snap Ease
            opacity: { duration: 0.4 }
          }
        }}
        exit={{ 
          opacity: 0, 
          scale: 1.05, 
          filter: "blur(30px)",
          transition: {
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1]
          }
        }}
        className="w-full min-h-screen bg-background origin-center"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default PageTransition;
