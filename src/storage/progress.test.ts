import { describe, expect, it } from "vitest";
import {
  loadProgress,
  recordAttempt
} from "./progress";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe("progress storage", () => {
  it("starts empty", () => {
    const storage = new MemoryStorage();
    expect(loadProgress("cis-df", storage)).toEqual({});
  });

  it("records attempts, totals and latest result", () => {
    const storage = new MemoryStorage();

    recordAttempt("cis-df", "q1", false, storage, "2026-10-07T00:00:00.000Z");
    recordAttempt("cis-df", "q1", true, storage, "2026-10-07T00:01:00.000Z");

    expect(loadProgress("cis-df", storage)).toEqual({
      q1: {
        attempts: 2,
        correct: 1,
        lastCorrect: true,
        lastAnsweredAt: "2026-10-07T00:01:00.000Z"
      }
    });
  });

  it("ignores broken persisted data instead of crashing the app", () => {
    const storage = new MemoryStorage();
    storage.setItem("servicenow-exam-trainer:cis-df:progress", "{broken");

    expect(loadProgress("cis-df", storage)).toEqual({});
  });
});
