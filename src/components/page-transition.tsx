'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

/**
 * PageTransition Orchestrator
 * 
 * Implements a strictly sequential "Exit-First" logic using mode="wait".
 * This ensures that when a user clicks a nav icon, the current pedagogical track
 * performs a full "Deep Exit" before the new interface is revealed.
 *
 * Kinetic Portal Logic:
 * - Outgoing: Scale up (zooming in closer) + Blur + Slide Left + Fade.
 * - Incoming: Scale up from 96% (stepping into sector) + Blur in + Fade.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ 
          opacity: 0, 
          scale: 0.96, 
          filter: "blur(15px)",
          x: 20
        }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          filter: "blur(0px)",
          x: 0,
          transition: {
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1], // Kinetic Portal Ease
            opacity: { duration: 0.3 }
          }
        }}
        exit={{ 
          opacity: 0, 
          scale: 1.04, 
          filter: "blur(20px)",
          x: -20,
          transition: {
            duration: 0.35,
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
