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
  'English',
  'Social Studies',
  'Filipino',
  'Biological Science',
  'Physical Science'
];

/**
 * High-fidelity practice questions for LET (Licensure Examination for Teachers).
 * These items reflect the near-realistic pedagogical depth required for the board exam.
 */
export const INITIAL_QUESTIONS: Question[] = [
  {
    id: "gen-ed-math-1",
    text: "A merchant marks his goods 20% above the cost price and allows a discount of 10% on the marked price. What is his actual profit percentage?",
    options: ["8%", "10%", "12%", "15%"],
    correctAnswer: "8%",
    subject: "General Education",
    subCategory: "Mathematics",
    difficulty: "medium",
    explanation: "If cost is 100, marked price is 120. Discount of 10% on 120 is 12. Sale price is 108, which is 8% profit."
  },
  {
    id: "gen-ed-lit-1",
    text: "In Filipino literature, who is known as the 'Huseng Sisiw' and served as a mentor to Francisco Balagtas?",
    options: ["Jose de la Cruz", "Modesto de Castro", "Pascual Poblete", "Lope K. Santos"],
    correctAnswer: "Jose de la Cruz",
    subject: "General Education",
    subCategory: "Literature",
    difficulty: "hard",
    explanation: "Jose de la Cruz was the mentor of Balagtas and was known for requiring chicks (sisiw) as payment for his poems."
  },
  {
    id: "prof-ed-theory-1",
    text: "Which pillar of education, as defined by UNESCO, focuses on the development of the whole person—mind and body, intelligence, sensitivity, and aesthetic appreciation?",
    options: ["Learning to know", "Learning to do", "Learning to be", "Learning to live together"],
    correctAnswer: "Learning to be",
    subject: "Professional Education",
    subCategory: "Foundations of Education",
    difficulty: "medium",
    explanation: "Learning to be emphasizes the complete development of an individual to their full potential."
  },
  {
    id: "prof-ed-dev-1",
    text: "According to Piaget's stages of cognitive development, a child who can perform mental operations like conservation and reversibility but only on physical objects is in which stage?",
    options: ["Sensorimotor", "Pre-operational", "Concrete operational", "Formal operational"],
    correctAnswer: "Concrete operational",
    subject: "Professional Education",
    subCategory: "Child and Adolescent Development",
    difficulty: "medium",
    explanation: "Concrete operational children (7-11 years) can reason logically about concrete events but struggle with abstract concepts."
  },
  {
    id: "prof-ed-ethics-1",
    text: "A teacher discovers a colleague is receiving money from parents in exchange for higher grades. According to the Code of Ethics for Professional Teachers, what is the most appropriate action?",
    options: ["Ignore it to maintain harmony", "Publicly confront the teacher", "Report the matter to the proper school authorities", "Ask for a share of the money"],
    correctAnswer: "Report the matter to the proper school authorities",
    subject: "Professional Education",
    subCategory: "Professional Ethics",
    difficulty: "hard",
    explanation: "Professional ethics mandate reporting corrupt practices through official channels to protect the integrity of the profession."
  },
  {
    id: "spec-math-1",
    text: "What is the limit of (sin x) / x as x approaches 0?",
    options: ["0", "1", "Infinity", "Undefined"],
    correctAnswer: "1",
    subject: "Specialization",
    subCategory: "Mathematics",
    difficulty: "medium",
    explanation: "This is a fundamental limit in calculus derived from the Squeeze Theorem."
  },
  {
    id: "spec-eng-1",
    text: "In George Orwell's 'Animal Farm', the pigs' transition from revolutionaries to oppressors is a classic example of which literary device?",
    options: ["Allegory", "Hyperbole", "Oxymoron", "Onomatopoeia"],
    correctAnswer: "Allegory",
    subject: "Specialization",
    subCategory: "English",
    difficulty: "medium",
    explanation: "Animal Farm is an allegory where animals represent historical figures and events of the Russian Revolution."
  }
];
