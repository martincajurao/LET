
/**
 * Puter.js SDK initialization for browser/script tag usage.
 * Puter is loaded via script tag and available globally.
 */

// Puter should be available globally when loaded via script tag
// @ts-ignore - Puter is loaded globally via script
const puterInstance = typeof window !== 'undefined' && (window as any).puter 
  ? (window as any).puter 
  : null;

// Create a mock puter object for server-side compatibility
const mockPuter = {
  ai: {
    chat: async (message: string, options?: any) => {
      if (typeof window === 'undefined') {
        throw new Error('Puter AI is only available in the browser environment');
      }
      // This will be replaced by the actual Puter instance when available
      throw new Error('Puter not loaded via script tag');
    }
  }
};

export const puter = puterInstance || mockPuter;
export default puter;
