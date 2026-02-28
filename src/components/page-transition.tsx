'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Use a key that includes both pathname and mounted state to trigger animations
  const transitionKey = isMounted ? pathname : 'initial';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          transition: { 
            duration: 0.4, 
            ease: [0.22, 1, 0.36, 1],
            opacity: { duration: 0.3 }
          }
        }}
        exit={{ 
          opacity: 0, 
          y: -10,
          scale: 1.02,
          transition: { duration: 0.2 }
        }}
        className="w-full min-h-screen"
        style={{ originY: 0 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default PageTransition;
