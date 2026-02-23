
import { Firestore, collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { INITIAL_QUESTIONS, Question } from "@/app/lib/mock-data";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError, SecurityRuleContext } from "@/firebase/errors";

/**
 * Seeds the Firestore database with initial sample questions.
 */
export async function seedInitialQuestions(db: Firestore) {
  try {
    const batch = writeBatch(db);
    INITIAL_QUESTIONS.forEach(question => {
      const docRef = doc(db, "questions", question.id);
      batch.set(docRef, question, { merge: true });
    });
    
    await batch.commit();
    return true;
  } catch (serverError: any) {
    const permissionError = new FirestorePermissionError({
      path: 'questions',
      operation: 'write',
      requestResourceData: INITIAL_QUESTIONS,
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
    return false;
  }
}

/**
 * Fetches all questions from the Firestore 'questions' collection.
 * This function now throws errors so they can be handled contextually in the caller.
 */
export async function fetchQuestionsFromFirestore(db: Firestore): Promise<Question[]> {
  const snapshot = await getDocs(collection(db, "questions"));
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id
  })) as Question[];
}
