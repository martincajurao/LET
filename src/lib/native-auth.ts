import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';

export interface NativeUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  idToken: string | null;
}

/**
 * Check if running on native mobile platform
 */
export const isNativeMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
};

/**
 * Native authentication handlers for Capacitor (mobile)
 * Uses @capacitor-firebase/authentication for Google Sign-In
 */
export const nativeAuth = {
  /**
   * Sign in with Google using native Firebase Authentication
   */
  async signInWithGoogle(): Promise<{ user: NativeUser | null; error: Error | null }> {
    try {
      const result = await FirebaseAuthentication.signInWithGoogle({
        scopes: ['profile', 'email'],
      });

      if (result.credential?.idToken && result.user) {
        const user = result.user;
        return {
          user: {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoUrl,
            idToken: result.credential.idToken,
          },
          error: null,
        };
      }

      return { user: null, error: new Error('No credential returned from native sign-in') };
    } catch (error) {
      console.error('Native Google Sign-In Error:', error);
      return { user: null, error: error as Error };
    }
  },

  /**
   * Sign out from native Firebase Authentication
   */
  async signOut(): Promise<{ error: Error | null }> {
    try {
      await FirebaseAuthentication.signOut();
      return { error: null };
    } catch (error) {
      console.error('Native Sign-Out Error:', error);
      return { error: error as Error };
    }
  },

  /**
   * Get the currently signed-in user from native Firebase
   */
  async getCurrentUser(): Promise<{ user: NativeUser | null; error: Error | null }> {
    try {
      const result = await FirebaseAuthentication.getCurrentUser();
      
      if (result.user) {
        const user = result.user;
        return {
          user: {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoUrl,
            idToken: null,
          },
          error: null,
        };
      }
      
      return { user: null, error: null };
    } catch (error) {
      console.error('Native Get Current User Error:', error);
      return { user: null, error: error as Error };
    }
  },

  /**
   * Add authentication state listener for native auth
   */
  async addAuthStateListener(callback: (user: NativeUser | null) => void): Promise<() => void> {
    const handler = await FirebaseAuthentication.addListener('authStateChange', (event) => {
      if (event.user) {
        const user = event.user;
        callback({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoUrl,
          idToken: null,
        });
      } else {
        callback(null);
      }
    });

    return () => {
      handler.remove();
    };
  },
};

export default nativeAuth;
