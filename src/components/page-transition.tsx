'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

/**
 * PageTransition Orchestrator
 * Implements a strictly sequential "Exit-First" logic to eliminate content flashing.
 * By using mode="wait", the current page must complete its exit sequence 
 * before the incoming page is permitted to mount.
 *
 * Kinetic Portal Effect:
 * - Outgoing: Scale up slightly + Blur out + Fade. (Zooming into background)
 * - Incoming: Scale up from 97% + Blur in + Fade. (Focusing on the new track)
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ 
          opacity: 0, 
          scale: 0.97, 
          filter: "blur(12px)",
          y: 10
        }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          filter: "blur(0px)",
          y: 0,
          transition: {
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1], // Kinetic Portal Ease
            opacity: { duration: 0.3 }
          }
        }}
        exit={{ 
          opacity: 0, 
          scale: 1.03, 
          filter: "blur(15px)",
          y: -10,
          transition: {
            duration: 0.3,
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
