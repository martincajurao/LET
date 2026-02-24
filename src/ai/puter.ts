
/**
 * Puter.js SDK initialization for browser/script tag usage.
 * Puter is loaded via script tag and available globally.
 */

// Make this a proper module
export {};

// Dynamic accessor for Puter - checks at runtime when methods are called
const getPuter = (): any => {
  if (typeof window === 'undefined') return null;
  return (window as any).puter || null;
};

// Create a wrapper that dynamically checks for Puter
export const puter = {
  ai: {
    chat: async (message: string, options?: any) => {
      const puterInstance = getPuter();
      if (!puterInstance || !puterInstance.ai) {
        // Return a mock response for graceful degradation
        console.warn('Puter AI not available - using fallback');
        return {
          toString: () => 'AI explanation temporarily unavailable. Please try again later.'
        };
      }
      return puterInstance.ai.chat(message, options);
    }
  }
};

export default puter;
