import { describe, expect, it } from "vitest";
import {
  allocateDomainCounts,
  getWrongQuestionIds,
  isCorrectAnswer,
  selectMockQuestions
} from "./examEngine";
import type {
  ChoiceQuestion,
  ExamDefinition,
  MatchingQuestion,
  ProgressMap,
  Question,
  QuestionAnswer
} from "./types";

const exam: ExamDefinition = {
  id: "test",
  name: "Test",
  durationMinutes: 90,
  questionCount: 20,
  contentVersion: 1,
  updatedAt: "2026-10-07",
  domains: [
    { id: "configuration", name: "Configuration", weight: 15 },
    { id: "ingest", name: "Ingest", weight: 19 },
    { id: "govern", name: "Govern", weight: 35 },
    { id: "insight", name: "Insight", weight: 20 },
    { id: "csdm", name: "CSDM Fundamentals", weight: 11 }
  ]
};

function makeChoiceQuestion(id: string, domainId: string): ChoiceQuestion {
  return {
    id,
    domainId,
    objective: "test objective",
    type: "single",
    scenario: false,
    prompt: id,
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" }
    ],
    correctOptionIds: ["a"],
    explanation: "because",
    tags: [],
    sourceUrl: "https://www.servicenow.com/docs/"
  };
}

function makeMatchingQuestion(): MatchingQuestion {
  return {
    id: "match-1",
    domainId: "configuration",
    objective: "matching objective",
    type: "matching",
    scenario: true,
    prompt: "Match each item.",
    matchingItems: [
      { id: "i1", label: "Item 1", correctTargetId: "t1" },
      { id: "i2", label: "Item 2", correctTargetId: "t2" },
      { id: "i3", label: "Item 3", correctTargetId: "t2" }
    ],
    matchingTargets: [
      { id: "t1", label: "Target 1" },
      { id: "t2", label: "Target 2" },
      { id: "unused", label: "Unused" }
    ],
    explanation: "because",
    tags: [],
    sourceUrl: "https://www.servicenow.com/docs/"
  };
}

describe("isCorrectAnswer", () => {
  it("accepts the exact answer for a single-select question", () => {
    const question = makeChoiceQuestion("q1", "configuration");

    expect(
      isCorrectAnswer(question, { type: "choice", selectedOptionIds: ["a"] })
    ).toBe(true);
    expect(
      isCorrectAnswer(question, { type: "choice", selectedOptionIds: ["b"] })
    ).toBe(false);
  });

  it("treats multi-select as an exact set with no partial credit", () => {
    const question: ChoiceQuestion = {
      ...makeChoiceQuestion("q2", "govern"),
      type: "multiple",
      correctOptionIds: ["a", "c"],
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "c", label: "C" }
      ]
    };

    expect(
      isCorrectAnswer(question, {
        type: "choice",
        selectedOptionIds: ["c", "a"]
      })
    ).toBe(true);
    expect(
      isCorrectAnswer(question, {
        type: "choice",
        selectedOptionIds: ["a"]
      })
    ).toBe(false);
    expect(
      isCorrectAnswer(question, {
        type: "choice",
        selectedOptionIds: ["a", "b", "c"]
      })
    ).toBe(false);
  });

  it("requires every matching item to have the exact target with no partial credit", () => {
    const question = makeMatchingQuestion();

    const exact: QuestionAnswer = {
      type: "matching",
      matches: { i1: "t1", i2: "t2", i3: "t2" }
    };
    const partial: QuestionAnswer = {
      type: "matching",
      matches: { i1: "t1", i2: "t2", i3: "t1" }
    };
    const incomplete: QuestionAnswer = {
      type: "matching",
      matches: { i1: "t1", i2: "t2" }
    };

    expect(isCorrectAnswer(question, exact)).toBe(true);
    expect(isCorrectAnswer(question, partial)).toBe(false);
    expect(isCorrectAnswer(question, incomplete)).toBe(false);
  });

  it("rejects an answer shape that does not match the question type", () => {
    const choice = makeChoiceQuestion("q1", "configuration");
    const matching = makeMatchingQuestion();

    expect(
      isCorrectAnswer(choice, {
        type: "matching",
        matches: { i1: "t1" }
      })
    ).toBe(false);
    expect(
      isCorrectAnswer(matching, {
        type: "choice",
        selectedOptionIds: ["a"]
      })
    ).toBe(false);
  });
});

describe("allocateDomainCounts", () => {
  it("allocates integer counts from blueprint weights", () => {
    expect(allocateDomainCounts(exam.domains, 20)).toEqual({
      configuration: 3,
      ingest: 4,
      govern: 7,
      insight: 4,
      csdm: 2
    });
  });

  it("always returns exactly the requested total", () => {
    const allocation = allocateDomainCounts(exam.domains, 75);
    expect(Object.values(allocation).reduce((sum, count) => sum + count, 0)).toBe(75);
  });
});

describe("selectMockQuestions", () => {
  it("respects the blueprint allocation when the bank is large enough", () => {
    const questions: Question[] = exam.domains.flatMap((domain) =>
      Array.from({ length: 20 }, (_, index) =>
        makeChoiceQuestion(`${domain.id}-${index}`, domain.id)
      )
    );

    const selected = selectMockQuestions(questions, exam, 20, () => 0.5);
    const counts = selected.reduce<Record<string, number>>((acc, question) => {
      acc[question.domainId] = (acc[question.domainId] ?? 0) + 1;
      return acc;
    }, {});

    expect(selected).toHaveLength(20);
    expect(new Set(selected.map((question) => question.id)).size).toBe(20);
    expect(counts).toEqual({
      configuration: 3,
      ingest: 4,
      govern: 7,
      insight: 4,
      csdm: 2
    });
  });

  it("can include matching questions without special-case selection logic", () => {
    const questions: Question[] = [
      makeMatchingQuestion(),
      makeChoiceQuestion("q2", "ingest"),
      makeChoiceQuestion("q3", "govern")
    ];

    const selected = selectMockQuestions(questions, exam, 20, () => 0.5);

    expect(selected).toHaveLength(3);
    expect(selected.some((question) => question.type === "matching")).toBe(true);
  });
});

describe("getWrongQuestionIds", () => {
  it("returns only questions whose latest attempt is wrong", () => {
    const progress: ProgressMap = {
      q1: {
        attempts: 2,
        correct: 1,
        lastCorrect: true,
        lastAnsweredAt: "2026-10-07T00:00:00.000Z"
      },
      q2: {
        attempts: 1,
        correct: 0,
        lastCorrect: false,
        lastAnsweredAt: "2026-10-07T00:01:00.000Z"
      }
    };

    expect(getWrongQuestionIds(progress)).toEqual(["q2"]);
  });
});
