import {
  state,
  fetchJson,
  saveProgress,
  resetProgress,
  getExam,
  getRoadmap,
  getDomain,
  getQuestionsForDomain,
  questionStats,
  ensureDomainSelection,
  shuffle
} from "./state.js";
import { escapeHtml } from "./utils/helpers.js";
import { renderHomeView } from "./views/homeView.js";
import { renderRoadmapView } from "./views/roadmapView.js";
import { renderSetupView } from "./views/setupView.js";
import { renderQuizView, saveExamAnswer, nextQuestion } from "./views/quizView.js";
import { renderResultsView } from "./views/resultsView.js";

const el = {
  setup: document.getElementById("setupView"),
  quiz: document.getElementById("quizView"),
  results: document.getElementById("resultsView"),
  reset: document.getElementById("resetProgressBtn")
};

async function init() {
  try {
    state.catalog = await fetchJson("data/catalog.json");
    await Promise.all(state.catalog.roadmaps.map(async roadmapRef => {
      state.roadmaps[roadmapRef.id] = await fetchJson(roadmapRef.url);
    }));

    const firstRoadmap = state.catalog.roadmaps[0];
    state.selectedRoadmapId = firstRoadmap?.id || null;
    state.selectedExamId = state.catalog.exams[0]?.id || null;
    ensureDomainSelection();
    bindGlobalEvents();
    renderHome();
  } catch (error) {
    el.setup.innerHTML = `<div class="feedback incorrect"><h2>Error cargando datos</h2><p>${escapeHtml(error.message)}</p><p>Asegúrate de usar un servidor web local: <code>python -m http.server 8000</code>.</p></div>`;
    console.error(error);
  }
}

function showContainer(target) {
  el.setup.classList.add("hidden");
  el.quiz.classList.add("hidden");
  el.results.classList.add("hidden");
  target.classList.remove("hidden");
}

function renderHome() {
  showContainer(el.setup);
  renderHomeView(el.setup, {
    onSelectRoadmap: () => renderRoadmap()
  });
}

function renderRoadmap() {
  showContainer(el.setup);
  renderRoadmapView(el.setup, {
    onGoHome: () => renderHome(),
    onOpenExam: (examId) => openExam(examId)
  });
}

async function openExam(examId) {
  state.selectedExamId = examId;
  const exam = getExam();
  state.selectedDomainId = exam.domains.find(domain => domain.questionCount > 0)?.id || exam.domains[0]?.id || null;
  await renderSetup();
}

async function renderSetup() {
  showContainer(el.setup);
  await renderSetupView(el.setup, {
    onGoBackRoadmap: () => renderRoadmap(),
    onStartSession: () => startSession()
  });
}

function prepareQuestion(raw) {
  const answerIndexes = Array.isArray(raw.answer) ? raw.answer : [raw.answer];
  let options = raw.options.map((text, originalIndex) => ({ text, originalIndex }));
  if (state.shuffleOptions) options = shuffle(options);
  const mappedAnswers = options
    .map((option, index) => answerIndexes.includes(option.originalIndex) ? index : -1)
    .filter(index => index >= 0);
  return { ...raw, options, mappedAnswers, selected: [], checked: false, correct: null };
}

async function startSession() {
  const domain = getDomain();
  let pool = await getQuestionsForDomain(domain);
  if (state.onlyMistakes || state.mode === "review") {
    const mistakes = pool.filter(q => questionStats(q.id).lastCorrect === false);
    if (mistakes.length) pool = mistakes;
  }
  if (state.shuffleQuestions || state.mode === "review") pool = shuffle(pool);
  
  const countInput = document.getElementById("questionCount");
  state.questionCount = Math.min(parseInt(countInput?.value, 10) || state.questionCount, pool.length);
  const questions = pool.slice(0, state.questionCount).map(prepareQuestion);
  const secondsPerQuestion = state.mode === "exam" ? 90 : 0;

  state.session = {
    id: `s-${Date.now()}`,
    examId: state.selectedExamId,
    domainId: state.selectedDomainId,
    domainTitle: domain.title,
    mode: state.mode,
    questions,
    current: 0,
    answers: [],
    startedAt: new Date().toISOString(),
    timeRemaining: secondsPerQuestion * questions.length,
    timerId: null
  };

  showContainer(el.quiz);
  renderQuiz();
  if (state.mode === "exam") startTimer();
}

function startTimer() {
  clearInterval(state.session.timerId);
  state.session.timerId = setInterval(() => {
    state.session.timeRemaining -= 1;
    const timer = document.getElementById("timer");
    if (timer) {
      const safe = Math.max(0, state.session.timeRemaining);
      const min = Math.floor(safe / 60);
      const sec = safe % 60;
      timer.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }
    if (state.session.timeRemaining <= 0) finishSession();
  }, 1000);
}

function renderQuiz() {
  renderQuizView(el.quiz, {
    onFinish: () => finishSession(),
    onQuit: () => returnToSetup()
  });
}

function finishSession() {
  const session = state.session;
  if (!session) return;
  clearInterval(session.timerId);
  
  session.questions.forEach((question, index) => {
    if (!session.answers[index]) {
      question.checked = true;
      question.correct = false;
      session.answers[index] = {
        id: question.id,
        question: question.question,
        selectedTexts: question.selected.map(i => question.options[i]?.text).filter(Boolean),
        correctTexts: question.mappedAnswers.map(i => question.options[i]?.text).filter(Boolean),
        correct: question.correct,
        explanation: question.explanation,
        tags: question.tags || []
      };
    }
    if (session.mode === "exam") {
      const stats = questionStats(question.id);
      stats.attempts += 1;
      stats.lastCorrect = question.correct;
      stats.lastAttemptAt = new Date().toISOString();
      if (question.correct) stats.correct += 1;
      else stats.wrong += 1;
      state.progress.questions[question.id] = stats;
    }
  });

  session.finishedAt = new Date().toISOString();
  session.score = session.answers.filter(a => a.correct).length;
  state.progress.sessions.unshift({
    id: session.id,
    examId: session.examId,
    domainId: session.domainId,
    mode: session.mode,
    score: session.score,
    total: session.questions.length,
    finishedAt: session.finishedAt
  });
  state.progress.sessions = state.progress.sessions.slice(0, 25);
  saveProgress();
  renderResults();
}

function renderResults() {
  showContainer(el.results);
  renderResultsView(el.results, {
    onRepeat: () => startSession(),
    onPracticeMistakes: () => {
      state.onlyMistakes = true;
      state.mode = "review";
      startSession();
    },
    onReturnToSetup: () => returnToSetup()
  });
}

async function returnToSetup() {
  if (state.session?.timerId) clearInterval(state.session.timerId);
  state.session = null;
  await renderSetup();
}

function onKeyDown(event) {
  if (!state.session || el.quiz.classList.contains("hidden")) return;
  const question = state.session.questions[state.session.current];
  if (["1", "2", "3", "4", "5", "6"].includes(event.key) && !question.checked) {
    const idx = parseInt(event.key, 10) - 1;
    const input = document.querySelector(`input[name='answer'][value='${idx}']`);
    if (input) {
      if (input.type === "radio") {
        input.checked = true;
      } else {
        input.checked = !input.checked;
      }
      input.dispatchEvent(new Event("change"));
      renderQuiz();
    }
  }
  if (event.key === "Enter") {
    event.preventDefault();
    if (state.session.mode === "exam") {
      saveExamAnswer();
      nextQuestion(el.quiz, () => finishSession());
    } else if (!question.checked) {
      const checkBtn = document.getElementById("checkBtn");
      if (checkBtn && !checkBtn.disabled) checkBtn.click();
    } else {
      nextQuestion(el.quiz, () => finishSession());
    }
  }
}

function bindGlobalEvents() {
  el.reset.addEventListener("click", async () => {
    if (!confirm("¿Seguro que quieres borrar todo el progreso local?")) return;
    resetProgress();
    if (state.view === "exam") await renderSetup();
    else if (state.view === "roadmap") renderRoadmap();
    else renderHome();
  });
  document.addEventListener("keydown", onKeyDown);
}

init();
