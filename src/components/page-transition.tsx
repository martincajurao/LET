'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * PageTransition Orchestrator
 * Implements a strictly sequential "Exit-First" logic to eliminate content flashing.
 * By using mode="wait", the current page must complete its exit sequence 
 * before the incoming page is permitted to mount.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // On first hydration, we render a stable container to prevent layout shifts.
  // Subsequent client-side navigations will trigger the high-fidelity portal sequence.
  if (!isClient) {
    return (
      <div className="w-full min-h-screen bg-background">
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ 
          opacity: 0, 
          scale: 0.98, 
          filter: "blur(12px)",
          y: 10
        }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          filter: "blur(0px)",
          y: 0,
          transition: {
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1], // Kinetic ease for professional feel
            opacity: { duration: 0.3 }
          }
        }}
        exit={{ 
          opacity: 0, 
          scale: 1.04, 
          filter: "blur(12px)",
          y: -10,
          transition: {
            duration: 0.25,
            ease: [0.22, 1, 0.36, 1]
          }
        }}
        className="w-full min-h-screen bg-background origin-top"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default PageTransition;
