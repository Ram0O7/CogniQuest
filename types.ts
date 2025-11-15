export enum AppStatus {
  INITIAL = 'INITIAL',
  CONFIGURING = 'CONFIGURING',
  GENERATING = 'GENERATING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CHATTING = 'CHATTING',
}

export type QuestionType = 'MCQ' | 'True/False' | 'Fill-in-the-Blank';
export type ConfidenceLevel = 'Guessing' | 'Not Sure' | 'Confident' | 'Unrated';

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

export interface ChatContext {
  question: Question;
  userAnswer: string | null | undefined;
  originalContexts: string[];
}

export interface AppState {
  status: AppStatus;
  fileContents: string[] | null;
  quizConfig: QuizConfig;
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
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export interface Flashcard {
  front: string;
  back: string;
}