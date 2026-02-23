
import { config } from 'dotenv';
config();

import '@/ai/flows/personalized-performance-summary-flow.ts';
import '@/ai/flows/adaptive-question-selection.ts';
import '@/ai/flows/explain-mistakes-batch-flow.ts';
import '@/ai/flows/test-connection-flow.ts';
import '@/ai/flows/extract-questions-from-pdf-flow.ts';
import '@/ai/flows/process-text-to-questions-flow.ts';
