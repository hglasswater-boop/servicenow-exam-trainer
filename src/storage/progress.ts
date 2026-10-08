import type { ProgressMap } from "../domain/types";

function storageKey(examId: string): string {
  return `servicenow-exam-trainer:${examId}:progress`;
}

export function loadProgress(
  examId: string,
  storage: Storage = window.localStorage
): ProgressMap {
  const raw = storage.getItem(storageKey(examId));
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as ProgressMap;
  } catch {
    return {};
  }
}

export function saveProgress(
  examId: string,
  progress: ProgressMap,
  storage: Storage = window.localStorage
): void {
  storage.setItem(storageKey(examId), JSON.stringify(progress));
}

export function recordAttempt(
  examId: string,
  questionId: string,
  isCorrect: boolean,
  storage: Storage = window.localStorage,
  answeredAt: string = new Date().toISOString()
): ProgressMap {
  const progress = loadProgress(examId, storage);
  const current = progress[questionId];

  progress[questionId] = {
    attempts: (current?.attempts ?? 0) + 1,
    correct: (current?.correct ?? 0) + (isCorrect ? 1 : 0),
    lastCorrect: isCorrect,
    lastAnsweredAt: answeredAt
  };

  saveProgress(examId, progress, storage);
  return progress;
}
