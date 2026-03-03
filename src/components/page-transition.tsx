'use client';

import { motion } from 'framer-motion';
import { ReactNode, useEffect, useState } from 'react';

/**
 * PageTransition: Initial mount animation wrapper
 * 
 * This component handles the initial page load animation.
 * For navigation transitions, use src/app/template.tsx instead.
 * 
 * template.tsx is specifically designed for page transitions in 
 * Next.js App Router because it re-renders on every navigation.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: isMounted ? 1 : 0 
      }}
      transition={{ 
        duration: 0.3,
        ease: "easeOut"
      }}
      className="w-full min-h-screen bg-background"
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;

