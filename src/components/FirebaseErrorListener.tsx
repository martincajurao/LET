'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // In a production app, you might log this to a service.
      // In Studio, we surface this to help with Security Rules debugging.
      toast({
        variant: 'destructive',
        title: 'Firestore Permission Denied',
        description: `Operation: ${error.context.operation} at ${error.context.path}. Check your Security Rules.`,
      });
      
      // We throw the error so it shows up in the Next.js development overlay if in dev mode
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
