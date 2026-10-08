import "./styles.css";
import {
  getWrongQuestionIds,
  isCorrectAnswer,
  selectMockQuestions,
  selectRandomQuestions
} from "./domain/examEngine";
import type {
  ChoiceQuestion,
  ExamDefinition,
  MatchingQuestion,
  ProgressMap,
  Question
} from "./domain/types";
import {
  loadProgress,
  recordAttempt
} from "./storage/progress";
import { enableAutoUpdate } from "./update/appUpdate";
import { fetchJson } from "./update/fetchJson";

interface ExamRegistry {
  exams: string[];
}

interface Session {
  mode: string;
  questions: Question[];
  index: number;
  correctCount: number;
  answered: boolean;
  selectedOptionIds: string[];
  matchingSelections: Record<string, string>;
  activeMatchingItemId: string | null;
  currentCorrect: boolean | null;
}

const app = document.querySelector<HTMLDivElement>("#app")!;

let examDefinitions: ExamDefinition[] = [];
let exam: ExamDefinition | null = null;
let questions: Question[] = [];
let progress: ProgressMap = {};
let session: Session | null = null;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char] ?? char
  );
}

function accuracy(correct: number, attempts: number): string {
  return attempts === 0 ? "—" : `${Math.round((correct / attempts) * 100)}%`;
}

function renderHome(): void {
  if (!exam) {
    return;
  }

  const wrongIds = new Set(getWrongQuestionIds(progress));
  const wrongCount = questions.filter((question) => wrongIds.has(question.id)).length;
  const progressEntries = Object.values(progress);
  const attempts = progressEntries.reduce((sum, item) => sum + item.attempts, 0);
  const correct = progressEntries.reduce((sum, item) => sum + item.correct, 0);
  const studied = progressEntries.length;

  const examOptions = examDefinitions
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}" ${item.id === exam?.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`
    )
    .join("");

  const domainCards = exam.domains
    .map((domain) => {
      const domainQuestionIds = new Set(
        questions
          .filter((question) => question.domainId === domain.id)
          .map((question) => question.id)
      );
      const entries = Object.entries(progress)
        .filter(([questionId]) => domainQuestionIds.has(questionId))
        .map(([, item]) => item);
      const domainAttempts = entries.reduce((sum, item) => sum + item.attempts, 0);
      const domainCorrect = entries.reduce((sum, item) => sum + item.correct, 0);
      const bankCount = domainQuestionIds.size;

      return `
        <button class="domain-card" data-action="domain" data-domain="${escapeHtml(domain.id)}">
          <span class="domain-title">${escapeHtml(domain.name)}</span>
          <span class="domain-meta">出題比率 ${domain.weight}% · ${bankCount}問</span>
          <span class="domain-score">正答率 ${accuracy(domainCorrect, domainAttempts)}</span>
        </button>
      `;
    })
    .join("");

  app.innerHTML = `
    <section class="shell">
      <header class="hero">
        <div>
          <p class="eyebrow">ServiceNow Exam Trainer</p>
          <h1>${escapeHtml(exam.name)}</h1>
          <p class="subtle">本試験 ${exam.questionCount}問 / ${exam.durationMinutes}分 · 問題バンク ${questions.length}問</p>
          <p class="data-version">問題データ v${exam.contentVersion} · ${escapeHtml(exam.updatedAt)}</p>
        </div>
        <label class="exam-picker">
          <span>試験</span>
          <select id="exam-select">${examOptions}</select>
        </label>
      </header>

      <section class="stats-grid" aria-label="学習状況">
        <article class="stat">
          <span class="stat-value">${studied}/${questions.length}</span>
          <span class="stat-label">学習済み</span>
        </article>
        <article class="stat">
          <span class="stat-value">${accuracy(correct, attempts)}</span>
          <span class="stat-label">累計正答率</span>
        </article>
        <article class="stat">
          <span class="stat-value">${wrongCount}</span>
          <span class="stat-label">要復習</span>
        </article>
      </section>

      <section class="actions">
        <button class="primary" data-action="random">ランダム10問</button>
        <button class="secondary" data-action="mock">模擬試験（${Math.min(exam.questionCount, questions.length)}問）</button>
        <button class="secondary" data-action="wrong" ${wrongCount === 0 ? "disabled" : ""}>間違えた問題を復習</button>
      </section>

      <section>
        <div class="section-heading">
          <h2>分野別演習</h2>
          <span>Blueprint準拠</span>
        </div>
        <div class="domain-grid">${domainCards}</div>
      </section>

      <footer>
        問題は学習用の独自作成です。公式試験問題の転載ではありません。
      </footer>
    </section>
  `;
}

function startSession(mode: string, selectedQuestions: Question[]): void {
  if (selectedQuestions.length === 0) {
    return;
  }

  session = {
    mode,
    questions: selectedQuestions,
    index: 0,
    correctCount: 0,
    answered: false,
    selectedOptionIds: [],
    matchingSelections: {},
    activeMatchingItemId: null,
    currentCorrect: null
  };
  renderQuestion();
}

function currentQuestion(): Question | null {
  return session?.questions[session.index] ?? null;
}

function renderChoiceOptions(
  question: ChoiceQuestion,
  activeSession: Session
): string {
  const inputType = question.type === "multiple" ? "checkbox" : "radio";

  return question.options
    .map((option) => {
      const selected = activeSession.selectedOptionIds.includes(option.id);
      const correct = question.correctOptionIds.includes(option.id);
      const statusClass = activeSession.answered
        ? correct
          ? " correct"
          : selected
            ? " wrong"
            : ""
        : "";

      return `
        <label class="option${statusClass}">
          <input
            type="${inputType}"
            name="answer"
            value="${escapeHtml(option.id)}"
            ${selected ? "checked" : ""}
            ${activeSession.answered ? "disabled" : ""}
          />
          <span>${escapeHtml(option.label)}</span>
        </label>
      `;
    })
    .join("");
}

function renderMatchingChip(
  question: MatchingQuestion,
  itemId: string,
  activeSession: Session
): string {
  const item = question.matchingItems.find((candidate) => candidate.id === itemId);
  if (!item) {
    return "";
  }

  const selectedTargetId = activeSession.matchingSelections[item.id];
  const active = activeSession.activeMatchingItemId === item.id;
  const answerClass = activeSession.answered
    ? selectedTargetId === item.correctTargetId
      ? " correct"
      : " wrong"
    : "";
  const correctTarget = question.matchingTargets.find(
    (target) => target.id === item.correctTargetId
  );

  return `
    <div
      class="match-chip${active ? " active" : ""}${answerClass}"
      data-action="match-item"
      data-match-item-id="${escapeHtml(item.id)}"
      draggable="${activeSession.answered ? "false" : "true"}"
      role="button"
      tabindex="${activeSession.answered ? "-1" : "0"}"
    >
      <span>${escapeHtml(item.label)}</span>
      ${
        !activeSession.answered && selectedTargetId
          ? `<button type="button" class="match-clear" data-action="match-clear" data-match-item-id="${escapeHtml(item.id)}" aria-label="配置を戻す">×</button>`
          : ""
      }
      ${
        activeSession.answered && selectedTargetId !== item.correctTargetId
          ? `<small>正解: ${escapeHtml(correctTarget?.label ?? item.correctTargetId)}</small>`
          : ""
      }
    </div>
  `;
}

function renderMatchingBoard(
  question: MatchingQuestion,
  activeSession: Session
): string {
  const unassigned = question.matchingItems.filter(
    (item) => !activeSession.matchingSelections[item.id]
  );

  const targets = question.matchingTargets
    .map((target) => {
      const assigned = question.matchingItems.filter(
        (item) => activeSession.matchingSelections[item.id] === target.id
      );
      return `
        <div
          class="match-target"
          data-action="match-target"
          data-target-id="${escapeHtml(target.id)}"
          role="button"
          tabindex="${activeSession.answered ? "-1" : "0"}"
        >
          <strong>${escapeHtml(target.label)}</strong>
          <div class="match-target-items">
            ${
              assigned.length > 0
                ? assigned
                    .map((item) =>
                      renderMatchingChip(question, item.id, activeSession)
                    )
                    .join("")
                : '<span class="match-empty">ここに配置</span>'
            }
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="matching-board">
      <section class="match-pool">
        <div class="match-heading">
          <strong>項目</strong>
          <span>ドラッグ、または項目→対応先の順にタップ</span>
        </div>
        <div class="match-items">
          ${
            unassigned.length > 0
              ? unassigned
                  .map((item) =>
                    renderMatchingChip(question, item.id, activeSession)
                  )
                  .join("")
              : '<span class="match-empty">すべて配置済み</span>'
          }
        </div>
      </section>
      <section class="match-target-list" aria-label="対応先">
        ${targets}
      </section>
    </div>
  `;
}

function questionTypeLabel(question: Question): string {
  if (question.type === "matching") {
    return "マッチング";
  }
  return question.type === "multiple" ? "複数選択" : "単一選択";
}

function renderQuestion(): void {
  const question = currentQuestion();
  const activeSession = session;
  if (!exam || !activeSession || !question) {
    return;
  }

  const domain = exam.domains.find((item) => item.id === question.domainId);
  const answerBody =
    question.type === "matching"
      ? renderMatchingBoard(question, activeSession)
      : `<div class="options">${renderChoiceOptions(question, activeSession)}</div>`;

  const result = activeSession.answered
    ? `
      <aside class="feedback ${activeSession.currentCorrect ? "success" : "failure"}">
        <strong>${activeSession.currentCorrect ? "正解" : "不正解"}</strong>
        <p>${escapeHtml(question.explanation)}</p>
        <div class="evidence">
          <span>Blueprint論点: ${escapeHtml(question.objective)}</span>
          <a href="${escapeHtml(question.sourceUrl)}" target="_blank" rel="noopener noreferrer">ServiceNow公式根拠 ↗</a>
        </div>
      </aside>
    `
    : "";

  app.innerHTML = `
    <section class="shell quiz-shell">
      <header class="quiz-header">
        <button class="text-button" data-action="home">← 終了</button>
        <div>
          <span>${escapeHtml(activeSession.mode)}</span>
          <strong>${activeSession.index + 1} / ${activeSession.questions.length}</strong>
        </div>
      </header>

      <div class="progress-track" aria-hidden="true">
        <div style="width: ${((activeSession.index + 1) / activeSession.questions.length) * 100}%"></div>
      </div>

      <article class="question-card">
        <div class="question-meta">
          <span>${escapeHtml(domain?.name ?? question.domainId)}</span>
          <span>${questionTypeLabel(question)}</span>
        </div>
        <h1>${escapeHtml(question.prompt)}</h1>
        ${answerBody}
        <p id="answer-error" class="answer-error" role="alert"></p>
        ${result}
      </article>

      <div class="quiz-actions">
        ${
          activeSession.answered
            ? `<button class="primary" data-action="next">${activeSession.index + 1 === activeSession.questions.length ? "結果を見る" : "次の問題"}</button>`
            : '<button class="primary" data-action="submit">回答する</button>'
        }
      </div>
    </section>
  `;
}

function assignMatchingItem(itemId: string, targetId: string): void {
  const question = currentQuestion();
  if (
    !session ||
    session.answered ||
    !question ||
    question.type !== "matching" ||
    !question.matchingItems.some((item) => item.id === itemId) ||
    !question.matchingTargets.some((target) => target.id === targetId)
  ) {
    return;
  }

  session.matchingSelections = {
    ...session.matchingSelections,
    [itemId]: targetId
  };
  session.activeMatchingItemId = null;
  renderQuestion();
}

function clearMatchingItem(itemId: string): void {
  if (!session || session.answered) {
    return;
  }

  const next = { ...session.matchingSelections };
  delete next[itemId];
  session.matchingSelections = next;
  if (session.activeMatchingItemId === itemId) {
    session.activeMatchingItemId = null;
  }
  renderQuestion();
}

function submitAnswer(): void {
  const question = currentQuestion();
  if (!exam || !session || !question || session.answered) {
    return;
  }

  let correct: boolean;

  if (question.type === "matching") {
    if (
      Object.keys(session.matchingSelections).length !==
      question.matchingItems.length
    ) {
      const error = app.querySelector<HTMLElement>("#answer-error");
      if (error) {
        error.textContent = "すべての項目を対応先へ配置してください。";
      }
      return;
    }

    correct = isCorrectAnswer(question, {
      type: "matching",
      matches: session.matchingSelections
    });
  } else {
    const selected = [
      ...app.querySelectorAll<HTMLInputElement>('input[name="answer"]:checked')
    ].map((input) => input.value);

    if (selected.length === 0) {
      const error = app.querySelector<HTMLElement>("#answer-error");
      if (error) {
        error.textContent = "選択肢を選んでください。";
      }
      return;
    }

    session.selectedOptionIds = selected;
    correct = isCorrectAnswer(question, {
      type: "choice",
      selectedOptionIds: selected
    });
  }

  progress = recordAttempt(exam.id, question.id, correct);
  session.answered = true;
  session.currentCorrect = correct;
  session.activeMatchingItemId = null;

  if (correct) {
    session.correctCount += 1;
  }

  renderQuestion();
}

function nextQuestion(): void {
  if (!session || !session.answered) {
    return;
  }

  if (session.index + 1 >= session.questions.length) {
    renderResult();
    return;
  }

  session.index += 1;
  session.answered = false;
  session.selectedOptionIds = [];
  session.matchingSelections = {};
  session.activeMatchingItemId = null;
  session.currentCorrect = null;
  renderQuestion();
}

function renderResult(): void {
  if (!session) {
    return;
  }

  const percent = Math.round((session.correctCount / session.questions.length) * 100);

  app.innerHTML = `
    <section class="shell result-shell">
      <p class="eyebrow">${escapeHtml(session.mode)}</p>
      <h1>結果</h1>
      <div class="result-score">${percent}%</div>
      <p class="result-detail">${session.correctCount} / ${session.questions.length} 問正解</p>
      <button class="primary" data-action="home">ホームへ戻る</button>
    </section>
  `;
}

async function switchExam(examId: string): Promise<void> {
  const definition = examDefinitions.find((item) => item.id === examId);
  if (!definition) {
    return;
  }

  exam = definition;
  questions = await fetchJson<Question[]>(`./exams/${exam.id}/questions.json`);
  progress = loadProgress(exam.id);
  session = null;
  renderHome();
}

app.addEventListener("click", (event) => {
  const element = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!element || !exam) {
    return;
  }

  const action = element.dataset.action;

  if (action === "match-item") {
    if (!session || session.answered) {
      return;
    }
    const itemId = element.dataset.matchItemId;
    if (!itemId) {
      return;
    }
    session.activeMatchingItemId =
      session.activeMatchingItemId === itemId ? null : itemId;
    renderQuestion();
    return;
  }

  if (action === "match-target") {
    if (!session || session.answered || !session.activeMatchingItemId) {
      return;
    }
    const targetId = element.dataset.targetId;
    if (targetId) {
      assignMatchingItem(session.activeMatchingItemId, targetId);
    }
    return;
  }

  if (action === "match-clear") {
    const itemId = element.dataset.matchItemId;
    if (itemId) {
      clearMatchingItem(itemId);
    }
    return;
  }

  if (action === "home") {
    session = null;
    renderHome();
    return;
  }

  if (action === "random") {
    startSession(
      "ランダム演習",
      selectRandomQuestions(questions, Math.min(10, questions.length))
    );
    return;
  }

  if (action === "mock") {
    startSession(
      "模擬試験",
      selectMockQuestions(questions, exam, exam.questionCount)
    );
    return;
  }

  if (action === "wrong") {
    const wrongIds = new Set(getWrongQuestionIds(progress));
    startSession(
      "誤答復習",
      selectRandomQuestions(
        questions.filter((question) => wrongIds.has(question.id)),
        questions.length
      )
    );
    return;
  }

  if (action === "domain") {
    const domainId = element.dataset.domain;
    if (!domainId) {
      return;
    }
    const domainName =
      exam.domains.find((domain) => domain.id === domainId)?.name ?? domainId;
    startSession(
      `${domainName} 演習`,
      selectRandomQuestions(
        questions.filter((question) => question.domainId === domainId),
        10
      )
    );
    return;
  }

  if (action === "submit") {
    submitAnswer();
    return;
  }

  if (action === "next") {
    nextQuestion();
  }
});

app.addEventListener("dragstart", (event) => {
  const target = event.target as HTMLElement;
  const chip = target.closest<HTMLElement>("[data-match-item-id]");
  if (!chip || !session || session.answered || !event.dataTransfer) {
    return;
  }

  const itemId = chip.dataset.matchItemId;
  if (!itemId) {
    return;
  }

  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", itemId);
});

app.addEventListener("dragover", (event) => {
  const target = event.target as HTMLElement;
  if (target.closest("[data-target-id]")) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }
});

app.addEventListener("drop", (event) => {
  const target = event.target as HTMLElement;
  const zone = target.closest<HTMLElement>("[data-target-id]");
  if (!zone || !event.dataTransfer) {
    return;
  }

  event.preventDefault();
  const itemId = event.dataTransfer.getData("text/plain");
  const targetId = zone.dataset.targetId;
  if (itemId && targetId) {
    assignMatchingItem(itemId, targetId);
  }
});

app.addEventListener("change", (event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement && target.id === "exam-select") {
    void switchExam(target.value);
  }
});

async function bootstrap(): Promise<void> {
  const registry = await fetchJson<ExamRegistry>("./exams/index.json");
  examDefinitions = await Promise.all(
    registry.exams.map((examId) =>
      fetchJson<ExamDefinition>(`./exams/${examId}/exam.json`)
    )
  );

  const firstExam = examDefinitions[0];
  if (!firstExam) {
    throw new Error("No exams configured");
  }

  await switchExam(firstExam.id);

  if ("serviceWorker" in navigator) {
    void enableAutoUpdate(
      {
        register: (scriptUrl, options) =>
          navigator.serviceWorker.register(scriptUrl, options),
        addEventListener: (type, listener) =>
          navigator.serviceWorker.addEventListener(type, listener)
      },
      () => window.location.reload()
    ).catch((error: unknown) => {
      console.warn("Automatic update check failed", error);
    });
  }
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  app.innerHTML = `
    <section class="shell error-shell">
      <h1>読み込みに失敗しました</h1>
      <p>${escapeHtml(message)}</p>
    </section>
  `;
});
