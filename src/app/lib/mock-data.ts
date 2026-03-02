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
 * High-fidelity situational practice questions for LET (Licensure Examination for Teachers).
 * These items reflect the near-realistic pedagogical depth and situational analysis required for the board exam.
 */
export const INITIAL_QUESTIONS: Question[] = [
  {
    id: "sit-prof-ed-1",
    text: "Teacher Anna noticed that some of her Grade 7 students are consistently underperforming in collaborative tasks but excel in individual assessments. Following Vygotsky's Zone of Proximal Development, what should be her first strategic intervention to bridge this gap?",
    options: [
      "Provide scaffolding through peer-tutoring with high-performing classmates",
      "Assign more individual projects to capitalize on their current strengths",
      "Request a meeting with parents to discuss behavioral issues in groups",
      "Re-administer the individual assessments to verify the students' scores"
    ],
    correctAnswer: "Provide scaffolding through peer-tutoring with high-performing classmates",
    subject: "Professional Education",
    subCategory: "Child and Adolescent Development",
    difficulty: "hard",
    explanation: "Scaffolding within the ZPD involves providing temporary support (peer tutoring) to help students perform tasks they cannot yet do independently."
  },
  {
    id: "sit-prof-ed-2",
    text: "During a parent-teacher conference, a parent becomes aggressive and demands that her child's failing grade be changed, claiming that the teacher is 'too strict.' Which provision of the Code of Ethics for Professional Teachers should guide the teacher's professional response?",
    options: [
      "Maintain professional dignity and base the grade strictly on the established merit system",
      "Concede to the parent's demand to maintain harmonious school-community relations",
      "Publicly reprimand the parent to protect the teacher's authority in the classroom",
      "Refer the parent to the principal and refuse to discuss the student's performance further"
    ],
    correctAnswer: "Maintain professional dignity and base the grade strictly on the established merit system",
    subject: "Professional Education",
    subCategory: "Professional Ethics",
    difficulty: "medium",
    explanation: "The Code of Ethics mandates that teachers maintain professional integrity and that grades must be based on actual student performance and merit."
  },
  {
    id: "sit-gen-ed-1",
    text: "A Science teacher uses a 'Flipped Classroom' model for a lesson on Ecosystems. However, she observes that students from low-income households struggle to access the pre-recorded video lectures at home. To ensure academic equity, which pedagogical adjustment is most appropriate?",
    options: [
      "Provide offline transcriptions and schedule supervised school lab time for those students",
      "Revert to traditional lecture-style instruction for the entire class to ensure uniformity",
      "Exempt the disadvantaged students from the pre-activities and only grade their in-class work",
      "Grade the students on a separate curve to account for their lack of home resources"
    ],
    correctAnswer: "Provide offline transcriptions and schedule supervised school lab time for those students",
    subject: "General Education",
    subCategory: "Technology in Education",
    difficulty: "hard",
    explanation: "Ensuring equity means providing alternative access methods (offline materials/lab time) rather than lowering standards or reverting to less effective models."
  },
  {
    id: "sit-prof-ed-3",
    text: "In a diverse classroom, Teacher Mark observes that his students have varying levels of English proficiency. He wants to implement a 'Differentiated Instruction' approach for a literature lesson. Which strategy best reflects this pedagogical principle?",
    options: [
      "Providing reading materials at different complexity levels but with the same core learning goals",
      "Giving the same complex text to all students but grading them based on their initial level",
      "Allowing students with low proficiency to skip the literature lesson and focus on grammar",
      "Teaching only the students who can understand the material to keep the lesson on schedule"
    ],
    correctAnswer: "Providing reading materials at different complexity levels but with the same core learning goals",
    subject: "Professional Education",
    subCategory: "Principles of Teaching",
    difficulty: "medium",
    explanation: "Differentiated Instruction involves varying the content, process, or product based on student readiness while keeping the learning objectives consistent."
  }
];
