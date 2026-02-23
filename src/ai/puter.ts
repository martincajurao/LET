
import puter from 'puter';

/**
 * Puter.js SDK initialization.
 * Standardizes access to the Puter singleton for server-side Genkit flows.
 */
const puterInstance = (puter as any).default || puter;

export { puterInstance as puter };
export default puterInstance;
