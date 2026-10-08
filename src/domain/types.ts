export type ChoiceQuestionType = "single" | "multiple";
export type QuestionType = ChoiceQuestionType | "matching";

export interface DomainDefinition {
  id: string;
  name: string;
  weight: number;
}

export interface ExamDefinition {
  id: string;
  name: string;
  durationMinutes: number;
  questionCount: number;
  contentVersion: number;
  updatedAt: string;
  domains: DomainDefinition[];
}

export interface QuestionOption {
  id: string;
  label: string;
}

interface QuestionBase {
  id: string;
  domainId: string;
  objective: string;
  scenario: boolean;
  prompt: string;
  explanation: string;
  tags: string[];
  sourceUrl: string;
}

export interface ChoiceQuestion extends QuestionBase {
  type: ChoiceQuestionType;
  options: QuestionOption[];
  correctOptionIds: string[];
}

export interface MatchingItem {
  id: string;
  label: string;
  correctTargetId: string;
}

export interface MatchingTarget {
  id: string;
  label: string;
}

export interface MatchingQuestion extends QuestionBase {
  type: "matching";
  matchingItems: MatchingItem[];
  matchingTargets: MatchingTarget[];
}

export type Question = ChoiceQuestion | MatchingQuestion;

export interface ChoiceAnswer {
  type: "choice";
  selectedOptionIds: string[];
}

export interface MatchingAnswer {
  type: "matching";
  matches: Record<string, string>;
}

export type QuestionAnswer = ChoiceAnswer | MatchingAnswer;

export interface QuestionProgress {
  attempts: number;
  correct: number;
  lastCorrect: boolean;
  lastAnsweredAt: string;
}

export type ProgressMap = Record<string, QuestionProgress>;
