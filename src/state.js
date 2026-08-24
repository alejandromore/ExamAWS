const STORAGE_KEY = "examaws.practice.progress.v2";

export const state = {
  catalog: null,
  roadmaps: {},
  questionCache: {},
  view: "home", // "home" | "roadmap" | "exam"
  selectedRoadmapId: null,
  selectedExamId: null,
  selectedDomainId: null,
  mode: "practice", // "practice" | "exam" | "review"
  questionCount: 10,
  shuffleQuestions: true,
  shuffleOptions: true,
  onlyMistakes: false,
  session: null,
  progress: loadProgress()
};

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { questions: {}, sessions: [] };
  } catch (_) {
    return { questions: {}, sessions: [] };
  }
}

export function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

export function resetProgress() {
  state.progress = { questions: {}, sessions: [] };
  saveProgress();
}

export function getExam(examId = state.selectedExamId) {
  if (!state.catalog?.exams) return null;
  return state.catalog.exams.find(exam => exam.id === examId) || state.catalog.exams[0];
}

export function getRoadmap(roadmapId = state.selectedRoadmapId) {
  return state.roadmaps[roadmapId];
}

export function ensureDomainSelection() {
  const exam = getExam();
  if (!exam) return;
  if (!exam.domains?.some(domain => domain.id === state.selectedDomainId)) {
    state.selectedDomainId = exam.domains?.[0]?.id || null;
  }
}

export function getDomain() {
  ensureDomainSelection();
  const exam = getExam();
  if (!exam?.domains) return null;
  return exam.domains.find(domain => domain.id === state.selectedDomainId) || exam.domains[0];
}

export async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`No se pudo cargar ${url}: ${response.status}`);
  return response.json();
}

export async function getQuestionsForDomain(domain = getDomain()) {
  if (!domain?.dataUrl) return [];
  if (!state.questionCache[domain.dataUrl]) {
    state.questionCache[domain.dataUrl] = await fetchJson(domain.dataUrl);
  }
  return state.questionCache[domain.dataUrl];
}

export function questionStats(questionId) {
  return state.progress.questions[questionId] || { attempts: 0, correct: 0, wrong: 0, lastCorrect: null };
}

export function roadmapExams(roadmapId = state.selectedRoadmapId) {
  if (!state.catalog?.exams) return [];
  return state.catalog.exams.filter(exam => exam.roadmapIds?.includes(roadmapId));
}

export function examAvailableQuestions(exam) {
  if (!exam?.domains) return 0;
  return exam.domains.reduce((sum, domain) => sum + (domain.questionCount || 0), 0);
}
