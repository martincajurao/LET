'use server';

import pdf from 'pdf-parse';

/**
 * Extracts raw text from a PDF file provided as a Base64 data URI.
 * This is a manual, non-AI approach using the pdf-parse library.
 * It is programmatic and deterministic, satisfying the constraint of non-AI powered extraction.
 */
export async function extractRawTextFromPdf(base64Data: string): Promise<string> {
  try {
    // Remove data URI prefix if present
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(base64Content, 'base64');
    
    // Programmatic extraction (no AI involved in this step)
    const data = await pdf(buffer);
    return data.text;
  } catch (error: any) {
    console.error("PDF Parsing Error:", error);
    throw new Error("Could not parse PDF file. Ensure it is a valid PDF document.");
  }
}