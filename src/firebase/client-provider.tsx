
'use client';

import React from 'react';
import { firebaseApp, firestore, auth } from './index';
import { FirebaseProvider } from './provider';
import { AuthProvider } from './auth/use-user';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
      <AuthProvider>
        <FirebaseErrorListener />
        {children}
      </AuthProvider>
    </FirebaseProvider>
  );
}
