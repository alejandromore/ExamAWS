import { state, getRoadmap, roadmapExams, examAvailableQuestions } from "../state.js";
import { escapeHtml } from "../utils/helpers.js";

export function renderRoadmapView(container, { onGoHome, onOpenExam }) {
  state.view = "roadmap";
  const roadmap = getRoadmap();
  const exams = roadmapExams();

  const steps = roadmap.steps.map(step => {
    const exam = state.catalog.exams.find(item => item.id === step.examId);
    const available = exam && examAvailableQuestions(exam) > 0;
    return `
      <article class="timeline-step ${available ? "available" : "planned"}">
        <div class="timeline-number">${step.order}</div>
        <div>
          <div class="exam-title">
            <span class="badge code">${escapeHtml(step.code)}</span>
            <h3>${escapeHtml(step.title)}</h3>
            <span class="badge ${available ? "" : "empty"}">${available ? `${examAvailableQuestions(exam)} preguntas` : "Pendiente"}</span>
          </div>
          <p>${escapeHtml(step.goal)}</p>
          ${exam ? `<button class="btn ${available ? "btn-primary" : "btn-light"}" data-exam-id="${exam.id}">${available ? "Practicar" : "Preparar estructura"}</button>` : ""}
        </div>
      </article>`;
  }).join("");

  const examOptions = exams.map(exam => `<option value="${exam.id}">${escapeHtml(exam.code)} · ${escapeHtml(exam.title)}</option>`).join("");

  container.innerHTML = `
    <nav class="breadcrumbs" aria-label="Navegación">
      <button id="homeBtn" class="crumb" type="button">Menú inicial</button>
      <span class="crumb-sep" aria-hidden="true">›</span>
      <span class="crumb current" aria-current="page">${escapeHtml(roadmap.title)}</span>
    </nav>
    <section class="hero-card">
      <p class="eyebrow">Roadmap</p>
      <h2>${escapeHtml(roadmap.title)}</h2>
      <p>${escapeHtml(roadmap.description)}</p>
    </section>
    <div class="timeline">${steps}</div>
    <aside class="quick-select card-lite">
      <label for="examQuickSelect">Ir directamente a una certificación</label>
      <div class="inline-form">
        <select id="examQuickSelect">${examOptions}</select>
        <button id="openExamBtn" class="btn btn-primary">Abrir</button>
      </div>
    </aside>
  `;

  document.getElementById("homeBtn").addEventListener("click", onGoHome);
  container.querySelectorAll("button[data-exam-id]").forEach(button => {
    button.addEventListener("click", () => onOpenExam(button.dataset.examId));
  });
  document.getElementById("openExamBtn").addEventListener("click", () => {
    onOpenExam(document.getElementById("examQuickSelect").value);
  });
}
