import { describe, expect, it } from "vitest";
import { validateQuestionBank } from "./questionBank";
import type {
  ChoiceQuestion,
  ExamDefinition,
  MatchingQuestion,
  Question
} from "./types";

const exam: ExamDefinition = {
  id: "test",
  name: "Test",
  durationMinutes: 90,
  questionCount: 2,
  contentVersion: 1,
  updatedAt: "2026-10-07",
  domains: [
    { id: "a", name: "A", weight: 50 },
    { id: "b", name: "B", weight: 50 }
  ]
};

function choiceQuestion(overrides: Partial<ChoiceQuestion> = {}): ChoiceQuestion {
  return {
    id: "q1",
    domainId: "a",
    objective: "Blueprint objective",
    type: "single",
    scenario: true,
    prompt: "Question?",
    options: [
      { id: "x", label: "X" },
      { id: "y", label: "Y" }
    ],
    correctOptionIds: ["x"],
    explanation: "Explanation",
    tags: [],
    sourceUrl: "https://www.servicenow.com/docs/example",
    ...overrides
  };
}

function matchingQuestion(
  overrides: Partial<MatchingQuestion> = {}
): MatchingQuestion {
  return {
    id: "m1",
    domainId: "a",
    objective: "Matching objective",
    type: "matching",
    scenario: true,
    prompt: "Match.",
    matchingItems: [
      { id: "i1", label: "I1", correctTargetId: "t1" },
      { id: "i2", label: "I2", correctTargetId: "t2" },
      { id: "i3", label: "I3", correctTargetId: "t2" }
    ],
    matchingTargets: [
      { id: "t1", label: "T1" },
      { id: "t2", label: "T2" },
      { id: "unused", label: "Unused" }
    ],
    explanation: "Explanation",
    tags: [],
    sourceUrl: "https://www.servicenow.com/docs/example",
    ...overrides
  };
}

describe("validateQuestionBank", () => {
  it("accepts valid choice and matching questions", () => {
    expect(
      validateQuestionBank(exam, [choiceQuestion(), matchingQuestion()])
    ).toEqual([]);
  });

  it("detects duplicate question IDs", () => {
    const errors = validateQuestionBank(exam, [
      choiceQuestion(),
      choiceQuestion({ prompt: "Another" })
    ]);

    expect(errors).toContain("Duplicate question id: q1");
  });

  it("detects unknown domains and invalid choice references", () => {
    const errors = validateQuestionBank(exam, [
      choiceQuestion({
        domainId: "unknown",
        correctOptionIds: ["missing"]
      })
    ]);

    expect(errors).toContain("q1: unknown domain unknown");
    expect(errors).toContain("q1: correct option missing does not exist");
  });

  it("requires exactly one answer for single and multiple answers for multiple", () => {
    const singleErrors = validateQuestionBank(exam, [
      choiceQuestion({ correctOptionIds: ["x", "y"] })
    ]);
    const multipleErrors = validateQuestionBank(exam, [
      choiceQuestion({ type: "multiple", correctOptionIds: ["x"] })
    ]);

    expect(singleErrors).toContain("q1: single question must have exactly one correct option");
    expect(multipleErrors).toContain("q1: multiple question must have at least two correct options");
  });

  it("accepts unused matching targets and target reuse", () => {
    expect(validateQuestionBank(exam, [matchingQuestion()])).toEqual([]);
  });

  it("rejects duplicate matching IDs and missing target references", () => {
    const duplicateItems = matchingQuestion({
      matchingItems: [
        { id: "same", label: "A", correctTargetId: "t1" },
        { id: "same", label: "B", correctTargetId: "t2" }
      ]
    });
    const duplicateTargets = matchingQuestion({
      matchingTargets: [
        { id: "same", label: "A" },
        { id: "same", label: "B" }
      ]
    });
    const missingTarget = matchingQuestion({
      matchingItems: [
        { id: "i1", label: "I1", correctTargetId: "missing" }
      ]
    });

    expect(validateQuestionBank(exam, [duplicateItems])).toContain(
      "m1: duplicate matching item id same"
    );
    expect(validateQuestionBank(exam, [duplicateTargets])).toContain(
      "m1: duplicate matching target id same"
    );
    expect(validateQuestionBank(exam, [missingTarget])).toContain(
      "m1: matching target missing does not exist"
    );
  });

  it("requires non-empty matching items and targets", () => {
    expect(
      validateQuestionBank(exam, [matchingQuestion({ matchingItems: [] })])
    ).toContain("m1: matching question must have at least one item");
    expect(
      validateQuestionBank(exam, [matchingQuestion({ matchingTargets: [] })])
    ).toContain("m1: matching question must have at least two targets");
  });

  it("requires blueprint objective, scenario marker, and official source", () => {
    const blankObjective = validateQuestionBank(exam, [
      choiceQuestion({ objective: "" })
    ]);
    const missingScenario = validateQuestionBank(exam, [
      choiceQuestion({ scenario: undefined as unknown as boolean })
    ]);
    const blankSource = validateQuestionBank(exam, [
      choiceQuestion({ sourceUrl: "" })
    ]);
    const unofficialSource = validateQuestionBank(exam, [
      choiceQuestion({ sourceUrl: "https://example.com/cis-df" })
    ]);

    expect(blankObjective).toContain("q1: objective must not be blank");
    expect(missingScenario).toContain("q1: scenario must be a boolean");
    expect(blankSource).toContain("q1: sourceUrl must not be blank");
    expect(unofficialSource).toContain("q1: sourceUrl must be an official ServiceNow URL");
  });
});
