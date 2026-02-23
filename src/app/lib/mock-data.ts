export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  subject: string;
  subCategory?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

export const SUBJECTS = [
  'General Education',
  'Professional Education',
  'Specialization'
];

export const MAJORSHIPS = [
  'Mathematics',
  'English'
];

/**
 * High-fidelity practice questions for LET (Licensure Examination for Teachers).
 */
export const INITIAL_QUESTIONS: Question[] = [
  {
    id: "gen-ed-1",
    text: "Which of the following is the smallest prime number?",
    options: ["1", "2", "3", "5"],
    correctAnswer: "2",
    subject: "General Education",
    subCategory: "Mathematics",
    difficulty: "easy",
    explanation: "2 is the only even prime number and is the smallest prime."
  },
  {
    id: "gen-ed-2",
    text: "Who is the author of 'Noli Me Tangere'?",
    options: ["Jose Rizal", "Andres Bonifacio", "Marcelo H. Del Pilar", "Emilio Jacinto"],
    correctAnswer: "Jose Rizal",
    subject: "General Education",
    subCategory: "Literature",
    difficulty: "easy",
    explanation: "Jose Rizal wrote Noli Me Tangere to expose the inequities of the Spanish Catholic friars and the ruling government."
  },
  {
    id: "prof-ed-1",
    text: "Which pillar of education emphasizes learning to live together?",
    options: ["Learning to know", "Learning to do", "Learning to be", "Learning to live together"],
    correctAnswer: "Learning to live together",
    subject: "Professional Education",
    subCategory: "Foundations of Education",
    difficulty: "medium",
    explanation: "Learning to live together involves developing an understanding of others and their history, traditions, and spiritual values."
  },
  {
    id: "prof-ed-2",
    text: "In Piaget's theory of cognitive development, which stage occurs from birth to approximately 2 years of age?",
    options: ["Pre-operational", "Concrete operational", "Sensorimotor", "Formal operational"],
    correctAnswer: "Sensorimotor",
    subject: "Professional Education",
    subCategory: "Child and Adolescent Development",
    difficulty: "medium",
    explanation: "The sensorimotor stage is the first stage where infants gain knowledge of the world from the physical actions they perform on it."
  },
  {
    id: "spec-math-1",
    text: "What is the derivative of f(x) = x^2?",
    options: ["x", "2x", "x^2", "2"],
    correctAnswer: "2x",
    subject: "Specialization",
    subCategory: "Mathematics",
    difficulty: "medium",
    explanation: "Using the power rule, the derivative of x^n is nx^(n-1)."
  },
  {
    id: "spec-eng-1",
    text: "Which figure of speech involves an exaggeration for emphasis?",
    options: ["Metaphor", "Simile", "Hyperbole", "Personification"],
    correctAnswer: "Hyperbole",
    subject: "Specialization",
    subCategory: "English",
    difficulty: "medium",
    explanation: "Hyperbole is the use of exaggeration as a rhetorical device or figure of speech."
  }
];
