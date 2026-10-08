import type {
  DomainDefinition,
  ExamDefinition,
  ProgressMap,
  Question,
  QuestionAnswer
} from "./types";

export function isCorrectAnswer(
  question: Question,
  answer: QuestionAnswer
): boolean {
  if (question.type === "matching") {
    if (answer.type !== "matching") {
      return false;
    }

    if (Object.keys(answer.matches).length !== question.matchingItems.length) {
      return false;
    }

    return question.matchingItems.every(
      (item) => answer.matches[item.id] === item.correctTargetId
    );
  }

  if (answer.type !== "choice") {
    return false;
  }

  if (answer.selectedOptionIds.length !== question.correctOptionIds.length) {
    return false;
  }

  const selected = new Set(answer.selectedOptionIds);
  return question.correctOptionIds.every((id) => selected.has(id));
}

export function allocateDomainCounts(
  domains: readonly DomainDefinition[],
  total: number
): Record<string, number> {
  if (!Number.isInteger(total) || total < 0) {
    throw new Error("total must be a non-negative integer");
  }

  const totalWeight = domains.reduce((sum, domain) => sum + domain.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("domain weights must sum to a positive number");
  }

  const rows = domains.map((domain, index) => {
    const exact = (domain.weight / totalWeight) * total;
    const base = Math.floor(exact);
    return {
      id: domain.id,
      index,
      base,
      remainder: exact - base
    };
  });

  const remaining = total - rows.reduce((sum, row) => sum + row.base, 0);
  const byRemainder = [...rows].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index
  );

  const allocation = Object.fromEntries(
    rows.map((row) => [row.id, row.base])
  ) as Record<string, number>;

  for (let index = 0; index < remaining; index += 1) {
    const row = byRemainder[index % byRemainder.length];
    if (!row) {
      break;
    }
    allocation[row.id] = (allocation[row.id] ?? 0) + 1;
  }

  return allocation;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

export function selectRandomQuestions(
  questions: readonly Question[],
  count: number,
  random: () => number = Math.random
): Question[] {
  return shuffle(questions, random).slice(0, Math.max(0, count));
}

export function selectMockQuestions(
  questions: readonly Question[],
  exam: ExamDefinition,
  requestedCount: number = exam.questionCount,
  random: () => number = Math.random
): Question[] {
  const targetCount = Math.min(Math.max(0, requestedCount), questions.length);
  const allocation = allocateDomainCounts(exam.domains, targetCount);
  const selected: Question[] = [];
  const selectedIds = new Set<string>();

  for (const domain of exam.domains) {
    const domainQuestions = questions.filter(
      (question) => question.domainId === domain.id
    );
    const target = Math.min(
      allocation[domain.id] ?? 0,
      domainQuestions.length
    );

    for (const question of selectRandomQuestions(domainQuestions, target, random)) {
      selected.push(question);
      selectedIds.add(question.id);
    }
  }

  if (selected.length < targetCount) {
    const remaining = questions.filter(
      (question) => !selectedIds.has(question.id)
    );
    selected.push(
      ...selectRandomQuestions(
        remaining,
        targetCount - selected.length,
        random
      )
    );
  }

  return shuffle(selected, random);
}

export function getWrongQuestionIds(progress: ProgressMap): string[] {
  return Object.entries(progress)
    .filter(([, item]) => !item.lastCorrect)
    .map(([questionId]) => questionId);
}
