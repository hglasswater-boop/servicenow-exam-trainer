import type { ExamDefinition, Question } from "./types";

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function isOfficialServiceNowUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname;
    return (
      hostname === "servicenow.com" ||
      hostname === "www.servicenow.com" ||
      hostname === "nowlearning.servicenow.com" ||
      hostname === "learning.servicenow.com" ||
      hostname === "developer.servicenow.com"
    );
  } catch {
    return false;
  }
}

export function validateQuestionBank(
  exam: ExamDefinition,
  questions: readonly Question[]
): string[] {
  const errors: string[] = [];
  const domainIds = new Set(exam.domains.map((domain) => domain.id));
  const questionIds = new Set<string>();

  for (const question of questions) {
    if (questionIds.has(question.id)) {
      errors.push(`Duplicate question id: ${question.id}`);
    }
    questionIds.add(question.id);

    if (isBlank(question.id)) {
      errors.push("Question id must not be blank");
    }

    if (!domainIds.has(question.domainId)) {
      errors.push(`${question.id}: unknown domain ${question.domainId}`);
    }

    if (isBlank(question.prompt)) {
      errors.push(`${question.id}: prompt must not be blank`);
    }

    if (isBlank(question.explanation)) {
      errors.push(`${question.id}: explanation must not be blank`);
    }

    if (isBlank(question.objective)) {
      errors.push(`${question.id}: objective must not be blank`);
    }

    if (typeof question.scenario !== "boolean") {
      errors.push(`${question.id}: scenario must be a boolean`);
    }

    if (isBlank(question.sourceUrl)) {
      errors.push(`${question.id}: sourceUrl must not be blank`);
    } else if (!isOfficialServiceNowUrl(question.sourceUrl)) {
      errors.push(`${question.id}: sourceUrl must be an official ServiceNow URL`);
    }

    if (question.type === "matching") {
      if (question.matchingItems.length < 1) {
        errors.push(`${question.id}: matching question must have at least one item`);
      }
      if (question.matchingTargets.length < 2) {
        errors.push(`${question.id}: matching question must have at least two targets`);
      }

      const itemIds = new Set<string>();
      for (const item of question.matchingItems) {
        if (itemIds.has(item.id)) {
          errors.push(`${question.id}: duplicate matching item id ${item.id}`);
        }
        itemIds.add(item.id);
        if (isBlank(item.id) || isBlank(item.label)) {
          errors.push(`${question.id}: matching item id and label must not be blank`);
        }
      }

      const targetIds = new Set<string>();
      for (const target of question.matchingTargets) {
        if (targetIds.has(target.id)) {
          errors.push(`${question.id}: duplicate matching target id ${target.id}`);
        }
        targetIds.add(target.id);
        if (isBlank(target.id) || isBlank(target.label)) {
          errors.push(`${question.id}: matching target id and label must not be blank`);
        }
      }

      for (const item of question.matchingItems) {
        if (!targetIds.has(item.correctTargetId)) {
          errors.push(
            `${question.id}: matching target ${item.correctTargetId} does not exist`
          );
        }
      }

      continue;
    }

    if (question.options.length < 2) {
      errors.push(`${question.id}: must have at least two options`);
    }

    const optionIds = new Set<string>();
    for (const option of question.options) {
      if (optionIds.has(option.id)) {
        errors.push(`${question.id}: duplicate option id ${option.id}`);
      }
      optionIds.add(option.id);

      if (isBlank(option.id) || isBlank(option.label)) {
        errors.push(`${question.id}: option id and label must not be blank`);
      }
    }

    for (const correctId of question.correctOptionIds) {
      if (!optionIds.has(correctId)) {
        errors.push(`${question.id}: correct option ${correctId} does not exist`);
      }
    }

    if (question.type === "single" && question.correctOptionIds.length !== 1) {
      errors.push(
        `${question.id}: single question must have exactly one correct option`
      );
    }

    if (question.type === "multiple" && question.correctOptionIds.length < 2) {
      errors.push(
        `${question.id}: multiple question must have at least two correct options`
      );
    }
  }

  return errors;
}
