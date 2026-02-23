import { genkit } from 'genkit';

/**
 * Genkit initialization. 
 * Plugins are removed as we are using Puter.js directly within flows.
 */
export const ai = genkit({
  plugins: [],
});
