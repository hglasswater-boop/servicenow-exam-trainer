import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { allocateDomainCounts } from "../src/domain/examEngine";
import { validateQuestionBank } from "../src/domain/questionBank";
import type { ExamDefinition, Question } from "../src/domain/types";

type ProvenancedQuestion = Question & {
  objective: string;
  scenario: boolean;
  sourceUrl: string;
};

const exam = JSON.parse(
  readFileSync(resolve("public/exams/cis-df/exam.json"), "utf8")
) as ExamDefinition;

const questions = JSON.parse(
  readFileSync(resolve("public/exams/cis-df/questions.json"), "utf8")
) as ProvenancedQuestion[];

describe("CIS-DF question bank", () => {
  it("passes structural and provenance validation", () => {
    expect(validateQuestionBank(exam, questions)).toEqual([]);
  });

  it("contains exactly 100 questions", () => {
    expect(questions).toHaveLength(100);
  });

  it("matches the blueprint domain allocation exactly at 100 questions", () => {
    const expected = allocateDomainCounts(exam.domains, 100);
    const actual = questions.reduce<Record<string, number>>((counts, question) => {
      counts[question.domainId] = (counts[question.domainId] ?? 0) + 1;
      return counts;
    }, {});

    expect(expected).toEqual({
      configuration: 15,
      ingest: 19,
      govern: 35,
      insight: 20,
      csdm: 11
    });
    expect(actual).toEqual(expected);
  });

  it("keeps at least 60% of questions scenario-oriented", () => {
    const scenarioCount = questions.filter((question) => question.scenario).length;
    expect(scenarioCount / questions.length).toBeGreaterThanOrEqual(0.6);
  });

  it("includes single, multiple-select, and matching questions in every domain", () => {
    for (const domain of exam.domains) {
      const domainQuestions = questions.filter(
        (question) => question.domainId === domain.id
      );
      expect(domainQuestions.some((question) => question.type === "single"), domain.id).toBe(true);
      expect(domainQuestions.some((question) => question.type === "multiple"), domain.id).toBe(true);
      expect(domainQuestions.some((question) => question.type === "matching"), domain.id).toBe(true);
    }
  });

  it("covers all three official matching shapes", () => {
    const matching = questions.filter(
      (question): question is Extract<Question, { type: "matching" }> =>
        question.type === "matching"
    );

    expect(
      matching.some(
        (question) =>
          question.matchingItems.length === question.matchingTargets.length &&
          new Set(question.matchingItems.map((item) => item.correctTargetId)).size ===
            question.matchingItems.length
      )
    ).toBe(true);

    expect(
      matching.some(
        (question) =>
          question.matchingTargets.length > question.matchingItems.length
      )
    ).toBe(true);

    expect(
      matching.some(
        (question) =>
          new Set(question.matchingItems.map((item) => item.correctTargetId)).size <
          question.matchingItems.length
      )
    ).toBe(true);
  });

  it("maps every question to an objective and official source", () => {
    for (const question of questions) {
      expect(question.objective.trim().length, question.id).toBeGreaterThan(0);
      expect(question.sourceUrl.trim().length, question.id).toBeGreaterThan(0);
      const hostname = new URL(question.sourceUrl).hostname;
      expect(
        hostname === "servicenow.com" ||
          hostname === "www.servicenow.com" ||
          hostname === "nowlearning.servicenow.com" ||
          hostname === "learning.servicenow.com" ||
          hostname === "developer.servicenow.com",
        question.id
      ).toBe(true);
    }
  });

  it("declares the sourced content version and update date", () => {
    expect(exam.contentVersion).toBeGreaterThanOrEqual(4);
    expect(exam.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
