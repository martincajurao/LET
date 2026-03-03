'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Template: Page Transition Animations
 * 
 * In Next.js App Router, template.tsx re-renders on every navigation,
 * making it perfect for page transitions. Unlike layout.tsx which
 * persists across navigations, template.tsx creates a new instance
 * each time a route is visited.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(true);

  // Trigger animation on every route change
  useEffect(() => {
    // Start animation - page is invisible initially
    setIsAnimating(true);
    
    // Complete animation after duration
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        scale: 0.92,
        filter: "blur(20px)",
        y: 30
      }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        filter: "blur(0px)",
        y: 0
      }}
      transition={{ 
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1], // Smooth "tactical snap" easing
        opacity: { duration: 0.4 },
        scale: { duration: 0.6 },
        filter: { duration: 0.6 },
        y: { duration: 0.6 }
      }}
      style={{ 
        originX: 0.5, 
        originY: 0.5,
        width: '100%',
        minHeight: '100vh'
      }}
    >
      {children}
    </motion.div>
  );
}

