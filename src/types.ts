// src/types.ts — FINAL UPDATED VERSION
// Supports MongoDB data structure, coding tests, quiz logic & course modules

// ----------------- LESSON CONTENT -----------------
export interface LessonContent {
  explanation?: string[];
  examples?: string[];
  quiz?: {
    question: string;
    options: string[];
    answer: string;
  }[];
  coding?: {
    problem: string;
    starterCode?: string;
    solution?: string;
    testCases?: {
      input: string;
      expectedOutput: string;
      points?: number; // optional, default 1
    }[];
  }[];
}

// ----------------- LESSON -----------------
export interface Lesson {
  _id: string; // MongoDB ObjectId
  lessonId: string;
  title: string;
  type?: "quiz" | "coding" | "video" | "explanation" | "examples" | "text";
  duration?: number;
  isPreview?: boolean;
  courseId?: string;
  content?: LessonContent;
}

// ----------------- UNIT -----------------
export interface Unit {
  unitId: string;
  title: string;
  description?: string;
  order?: number;
  lessons: Lesson[];
  [key: string]: string | number | Lesson[] | undefined;
}

// ----------------- COURSE -----------------
export interface Course {
  _id: string;
  title: string;
  description?: string;
  units: Unit[];
  price?: number;
  category?: string;
  level?: string;
  thumbnail?: string;
}

// ----------------- QUIZ -----------------
export interface Question {
  questionId?: string;
  question: string;
  options: string[];
  correctAnswer?: string;
  answer?: string;
  type?: "single" | "multiple" | "mcq" | "fill_blank" | "true_false";
  explanation?: string;
  points?: number;
}

export interface Quiz {
  questions: Question[];
  timeLimit?: number;
  passingScore?: number;
}

// ----------------- QUIZ RESULTS -----------------
export interface QuizResultDetail {
  questionId: string;
  question: string;
  userAnswer?: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
  points: number;
}

export interface QuizResults {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  earnedPoints: number;
  totalPoints: number;
  passed: boolean;
  details: QuizResultDetail[];
}

// ----------------- CODING / EXAMPLES -----------------
export interface Example {
  title?: string;
  code?: string;
  language?: string;
  explanation?: string;
  description?: string;
  output?: string;
}

export interface TestCase {
  input: string;
  expected: string;
  points?: number; // optional, default 1
}

export interface Problem {
  problemId?: string;
  title?: string;
  description?: string;
  problem?: string;
  starterCode?: string;
  solution?: string;
  hints?: string[];
  testCases?: TestCase[];
  courseId?: string;
  language?: string;
}

export interface SubmissionResult {
  success: boolean;
  output: string;
  error?: string;
}

// ----------------- PROGRESS -----------------
export interface ProgressLesson {
  lessonId: string;
  status: "not_started" | "in_progress" | "completed";
}

export interface Progress {
  detailedProgress?: ProgressLesson[];
}

// ----------------- ENROLLMENT -----------------
export interface Enrollment {
  _id?: string;
  courseId?: string;
  accessLevel?: "full" | "preview";
  paymentStatus?: string;
  status?: string;
  progress?: {
    completedLessons: string[];
    currentLesson?: string;
    currentUnit?: string;
    totalProgress?: number;
    timeSpent?: number;
    lastAccessed?: string;
  };
}

// ----------------- FRONTEND COURSE TYPE -----------------
export interface CourseType {
  id: string;
  _id: string;
  title: string;
  description: string;
  icon: string;
  price: number;
}

// ----------------- HELPER CONVERTERS -----------------

/**
 * Convert MongoDB quiz format → Question interface
 */
export const convertMongoQuizToQuestion = (mongoQuiz: {
  question: string;
  options: string[];
  answer: string;
}): Question => ({
  questionId: Math.random().toString(36).substr(2, 9),
  question: mongoQuiz.question,
  options: mongoQuiz.options,
  correctAnswer: mongoQuiz.answer,
  answer: mongoQuiz.answer,
});

/**
 * Convert MongoDB coding format → Problem interface
 */
export const convertMongoCodingToProblem = (mongoCoding: {
  problem: string;
  starterCode?: string;
  solution?: string;
  testCases?: {
    input: string;
    expectedOutput: string;
    points?: number;
  }[];
}): Problem => ({
  problemId: Math.random().toString(36).substr(2, 9),
  title: "Coding Problem",
  description: mongoCoding.problem,
  problem: mongoCoding.problem,
  starterCode: mongoCoding.starterCode,
  solution: mongoCoding.solution,
  testCases:
    mongoCoding.testCases?.map((tc) => ({
      input: tc.input,
      expected: tc.expectedOutput,
      points: tc.points ?? 1,
    })) ?? [],
});

/**
 * Convert raw example string → Example interface
 */
export const convertMongoExampleToExample = (exampleCode: string): Example => ({
  title: "",
  code: "",
  language: "code",
});
