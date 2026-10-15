export type Difficulty = 'Facile' | 'Intermédiaire' | 'Expert';

export interface QuizOption {
  label: string;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizQuestion {
  id: number;
  category: string;
  difficulty: Difficulty;
  title: string;
  question: string;
  options: QuizOption[];
  funFact?: string;
}

export interface QuizState {
  currentQuestionIndex: number;
  score: number;
  selectedOptionIndex: number | null;
  isAnswerSubmitted: boolean;
  isCompleted: boolean;
  totalQuestions: number;
  answersHistory: boolean[]; // true = bonne réponse
  streak: number;            // série de bonnes réponses
  bestStreak: number;
}