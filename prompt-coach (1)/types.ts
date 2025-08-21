export interface Message {
  id: number;
  sender: 'user' | 'bot';
  text: string;
  isPrompt?: boolean;
}

export enum AppState {
  INITIAL_PROMPT,
  ASKING_QUESTIONS,
  GENERATING_PROMPT,
  FEEDBACK,
  REFINING,
  AWAITING_NEURO_MEDIA_CHOICE,
  AWAITING_RESTART,
  DONE,
}

export interface ClarifyingQuestion {
  question: string;
  options: string[];
}

export interface QnaHistoryItem {
  question: string;
  answer: string;
}

// Types for dynamic conversation flow
export interface Explanation {
  type: 'explanation';
  text: string;
}
export interface NextQuestion {
  type: 'next_question';
  question: ClarifyingQuestion;
}
export interface GeneratePrompt {
  type: 'generate_prompt';
}
export type NextStep = Explanation | NextQuestion | GeneratePrompt;
