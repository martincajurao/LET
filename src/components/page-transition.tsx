'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * PageTransition orchestrates high-fidelity route animations.
 * It uses 'mode="wait"' to ensure the outgoing page completes its exit
 * animation (blur/fade) before the incoming page is allowed to mount,
 * eliminating flickering and content flashing.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // During initial hydration, we render a static container to prevent layout shifts.
  // Once mounted, AnimatePresence takes over the lifecycle.
  if (!isMounted) {
    return <div className="w-full min-h-screen bg-background">{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={true}>
      <motion.div
        key={pathname}
        initial={{ 
          opacity: 0, 
          scale: 0.96, 
          filter: "blur(12px)",
          y: 10
        }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          filter: "blur(0px)",
          y: 0,
          transition: {
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1], // Kinetic cubic-bezier for native feel
            opacity: { duration: 0.3 }
          }
        }}
        exit={{ 
          opacity: 0, 
          scale: 1.04, 
          filter: "blur(12px)",
          y: -10,
          transition: {
            duration: 0.3,
            ease: [0.22, 1, 0.36, 1]
          }
        }}
        className="w-full min-h-screen bg-background"
        style={{ originY: 0 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default PageTransition;
