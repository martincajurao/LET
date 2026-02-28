/**
 * Extracts raw text from a PDF file provided as a Base64 data URI.
 * This is a manual, non-AI approach using the pdf-parse library.
 * It is programmatic and deterministic, satisfying the constraint of non-AI powered extraction.
 * 
 * NOTE: This function runs client-side. For static export compatibility,
 * we avoid 'use server' directive which doesn't work with static output.
 */

import pdf from 'pdf-parse';

/**
 * Extract text from a PDF file
 * @param base64Data - The PDF file as a Base64 string (with or without data URI prefix)
 * @returns The extracted text content
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
