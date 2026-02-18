
export enum AppStatus {
  INITIAL = 'INITIAL',
  DASHBOARD = 'DASHBOARD',
  CONFIGURING = 'CONFIGURING',
  GENERATING = 'GENERATING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CHATTING = 'CHATTING',
  FLASHCARDS = 'FLASHCARDS',
}

export type QuestionType = 'MCQ' | 'True/False' | 'Fill-in-the-Blank';
export type ConfidenceLevel = 'Guessing' | 'Not Sure' | 'Confident' | 'Unrated';
export type ChatMode = 'standard' | 'socratic' | 'eli5';

export interface QuizConfig {
  numQuestions: number;
  negativeMarking: boolean;
  penalty: number;
  timerType: 'overall' | 'per-question';
  time: number; // minutes for overall, seconds for per-question
  complexity: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
  tone: 'Creative' | 'Accurate' | 'Expanded';
  feedbackMode: 'instant' | 'end-of-quiz';
  questionVariety: 'MCQ Only' | 'Varied';
}

export interface Question {
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  category?: string; // For analytics
}

export interface UserAnswer {
  [questionIndex: number]: string | null; // null represents a skipped question
}

export interface UserConfidence {
  [questionIndex: number]: ConfidenceLevel;
}

export interface SourceMaterial {
  type: 'text' | 'image';
  content: string; // Text content or Base64 string (without data URI prefix for images)
  mimeType?: string; // Required for images
  fileName: string;
}

export interface ChatContext {
  question: Question;
  userAnswer: string | null | undefined;
  sourceMaterials: SourceMaterial[];
}

export interface AppState {
  status: AppStatus;
  sourceMaterials: SourceMaterial[] | null;
  quizConfig: QuizConfig;
  quizTitle: string | null; // New field for smart title
  currentHistoryId?: number; // New field to track ID for updates
  quizData: Question[] | null;
  userAnswers: UserAnswer;
  userConfidence: UserConfidence;
  currentQuestionIndex: number;
  startTime: number | null;
  endTime: number | null;
  chatContext: ChatContext | null;
  hints: { [questionIndex: number]: string };
  loadingHints: { [questionIndex: number]: boolean };
  performanceSummary: string | null;
  isGeneratingSummary: boolean;
  error: string | null;
  flashcards: Flashcard[] | null;
  isGeneratingFlashcards: boolean;
  isReviewingHistory?: boolean; 
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizHistoryItem {
  id?: number; // Auto-incremented by IDB
  timestamp: number;
  topic: string; // Derived from file name or prompt, or AI generated
  score: number;
  totalQuestions: number;
  quizData: Question[];
  userAnswers: UserAnswer;
  userConfidence: UserConfidence;
  quizConfig: QuizConfig;
  sourceMaterials: SourceMaterial[] | null; // Stored to enable Chat/Flashcards on review
  performanceSummary: string | null;
}
