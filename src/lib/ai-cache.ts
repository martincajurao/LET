/**
 * AI Explanation Cache System
 * Optimizes AI costs by caching explanations in Firestore
 * 
 * Flow:
 * 1. Check if explanation exists in Firestore cache
 * 2. If cached (exists): serve from cache (FREE - no AI call)
 * 3. If not cached: call AI, save to cache, then serve (cost credits)
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { AI_OPTIMIZATION } from './xp-system';

/**
 * Check if an explanation is cached in Firestore
 * @param questionId - The unique question identifier
 * @returns Cached explanation or null
 */
export async function getCachedExplanation(questionId: string): Promise<{
  exists: boolean;
  explanation?: string;
  cachedAt?: number;
  viewCount?: number;
} | null> {
  if (!firestore) return null;
  
  try {
    const cacheRef = doc(
      firestore, 
      AI_OPTIMIZATION.EXPLANATIONS_COLLECTION, 
      questionId
    );
    const snapshot = await getDoc(cacheRef);
    
    if (snapshot.exists()) {
      const data = snapshot.data();
      
      // Check if cache is still valid (not expired)
      const cachedAt = data.cachedAt?.toMillis?.() || data.cachedAt;
      const now = Date.now();
      const expiryMs = AI_OPTIMIZATION.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      
      if (cachedAt && (now - cachedAt) < expiryMs) {
        // Update view count for analytics
        await setDoc(cacheRef, { 
          viewCount: (data.viewCount || 0) + 1,
          lastViewed: serverTimestamp() 
        }, { merge: true });
        
        return {
          exists: true,
          explanation: data.explanation,
          cachedAt,
          viewCount: data.viewCount || 0
        };
      }
    }
    
    return { exists: false };
  } catch (error) {
    console.error('[AI Cache] Error checking cache:', error);
    return { exists: false };
  }
}

/**
 * Save an AI-generated explanation to Firestore cache
 * @param questionId - The unique question identifier
 * @param explanation - The AI-generated explanation
 * @param metadata - Optional metadata about the question
 */
export async function cacheExplanation(
  questionId: string, 
  explanation: string,
  metadata?: {
    subject?: string;
    category?: string;
    correctAnswer?: string;
    userAnswer?: string;
  }
): Promise<boolean> {
  if (!firestore) return false;
  
  try {
    const cacheRef = doc(
      firestore, 
      AI_OPTIMIZATION.EXPLANATIONS_COLLECTION, 
      questionId
    );
    
    await setDoc(cacheRef, {
      explanation,
      cachedAt: serverTimestamp(),
      lastViewed: serverTimestamp(),
      viewCount: 1,
      generationCount: 1,
      ...metadata
    });
    
    console.log(`[AI Cache] Cached explanation for ${questionId}`);
    return true;
  } catch (error) {
    console.error('[AI Cache] Error caching explanation:', error);
    return false;
  }
}

/**
 * Get multiple cached explanations by question IDs
 * @param questionIds - Array of question identifiers
 * @returns Map of questionId -> explanation
 */
export async function getCachedExplanations(
  questionIds: string[]
): Promise<Map<string, string>> {
  if (!firestore || !questionIds.length) return new Map();
  
  try {
    const cachedExplanations = new Map<string, string>();
    
    // Batch fetch - limit to avoid too many requests
    const batchSize = 10;
    for (let i = 0; i < questionIds.length; i += batchSize) {
      const batch = questionIds.slice(i, i + batchSize);
      
      for (const questionId of batch) {
        const result = await getCachedExplanation(questionId);
        if (result?.exists && result.explanation) {
          cachedExplanations.set(questionId, result.explanation);
        }
      }
    }
    
    return cachedExplanations;
  } catch (error) {
    console.error('[AI Cache] Error batch fetching:', error);
    return new Map();
  }
}

/**
 * Check for similar questions that might have cached explanations
 * Uses subject/category matching as fallback
 * @param subject - Question subject
 * @param category - Question category/subcategory
 * @returns Similar cached explanation or null
 */
export async function findSimilarCachedExplanation(
  subject: string,
  category?: string
): Promise<{
  exists: boolean;
  explanation?: string;
  matchedQuestionId?: string;
  similarityType: 'exact' | 'subject' | 'none';
} | null> {
  if (!firestore) return null;
  
  try {
    // First try exact category match
    if (category) {
      const q = query(
        collection(firestore, AI_OPTIMIZATION.EXPLANATIONS_COLLECTION),
        where('category', '==', category),
        where('subject', '==', subject)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        return {
          exists: true,
          explanation: docData.explanation,
          matchedQuestionId: snapshot.docs[0].id,
          similarityType: 'exact'
        };
      }
    }
    
    // Fallback to subject-only match
    const subjectQuery = query(
      collection(firestore, AI_OPTIMIZATION.EXPLANATIONS_COLLECTION),
      where('subject', '==', subject)
    );
    
    const subjectSnapshot = await getDocs(subjectQuery);
    if (!subjectSnapshot.empty) {
      const docData = subjectSnapshot.docs[0].data();
      return {
        exists: true,
        explanation: docData.explanation,
        matchedQuestionId: subjectSnapshot.docs[0].id,
        similarityType: 'subject'
      };
    }
    
    return { exists: false, similarityType: 'none' };
  } catch (error) {
    console.error('[AI Cache] Error finding similar:', error);
    return { exists: false, similarityType: 'none' };
  }
}

/**
 * Get cache statistics for analytics
 * @returns Cache hit/miss statistics
 */
export async function getCacheStats(): Promise<{
  totalCached: number;
  totalViews: number;
  avgViewsPerExplanation: number;
} | null> {
  if (!firestore) return null;
  
  try {
    const snapshot = await getDocs(
      collection(firestore, AI_OPTIMIZATION.EXPLANATIONS_COLLECTION)
    );
    
    let totalViews = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      totalViews += data.viewCount || 0;
    });
    
    return {
      totalCached: snapshot.size,
      totalViews,
      avgViewsPerExplanation: snapshot.size > 0 
        ? Math.round(totalViews / snapshot.size) 
        : 0
    };
  } catch (error) {
    console.error('[AI Cache] Error getting stats:', error);
    return null;
  }
}

/**
 * Static fallback explanations for when cache miss and AI unavailable
 * These are generic pedagogical insights
 */
export function getStaticExplanation(
  subject: string,
  isCorrect: boolean
): string {
  const genericCorrect = [
    "Excellent understanding! You've demonstrated strong conceptual knowledge in this area.",
    "Your answer shows good mastery of the material. Keep up the great work!",
    "Well done! Your reasoning aligns with the expected pedagogical approach.",
    "Great job! Your understanding of this concept is solid.",
  ];
  
  const genericIncorrect = [
    "This is a common area of confusion. Consider reviewing the fundamental principles behind this concept.",
    "The key here is to understand the underlying framework. Try breaking down the problem into smaller components.",
    "This type of question tests your application skills. Practice similar problems to strengthen your understanding.",
    "Review the core concepts related to this topic. Understanding the 'why' will help you approach similar questions better.",
  ];
  
  const pool = isCorrect ? genericCorrect : genericIncorrect;
  return pool[Math.floor(Math.random() * pool.length)];
}
