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
 * This function handles permission errors contextually via the global emitter.
 */
export async function fetchQuestionsFromFirestore(db: Firestore): Promise<Question[]> {
  const questionsRef = collection(db, "questions");
  
  return getDocs(questionsRef)
    .then(snapshot => {
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Question[];
    })
    .catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: questionsRef.path,
        operation: 'list'
      }));
      throw error; // Re-throw to handle loading states in caller
    });
}