import { state, getRoadmap, roadmapExams, examAvailableQuestions } from "../state.js";
import { escapeHtml } from "../utils/helpers.js";

export function renderHomeView(container, { onSelectRoadmap }) {
  state.view = "home";
  
  const roadmapCards = state.catalog.roadmaps.map(roadmapRef => {
    const roadmap = getRoadmap(roadmapRef.id);
    const exams = roadmapExams(roadmapRef.id);
    const totalQuestions = exams.reduce((sum, exam) => sum + examAvailableQuestions(exam), 0);
    return `
      <article class="roadmap-card" data-roadmap-id="${roadmapRef.id}" role="button" tabindex="0">
        <div class="roadmap-icon">${escapeHtml(roadmapRef.icon || "📘")}</div>
        <div>
          <div class="exam-title">
            <h2>${escapeHtml(roadmapRef.title)}</h2>
            ${roadmapRef.vendor ? `<span class="badge vendor-${escapeHtml(String(roadmapRef.vendor).toLowerCase())}">${escapeHtml(roadmapRef.vendor)}</span>` : ""}
          </div>
          <p>${escapeHtml(roadmapRef.description)}</p>
          <p class="small">${exams.length} ${exams.length === 1 ? "certificación" : "certificaciones"} · ${totalQuestions} preguntas cargadas</p>
        </div>
      </article>`;
  }).join("");

  container.innerHTML = `
    <section class="hero-card">
      <p class="eyebrow">Menú inicial</p>
      <h2>Elige tu roadmap</h2>
      <p>Selecciona una ruta de aprendizaje para practicar exámenes por dominio y simulaciones de certificación.</p>
    </section>
    <div class="roadmap-grid">${roadmapCards}</div>
  `;

  container.querySelectorAll(".roadmap-card").forEach(card => {
    const open = () => {
      state.selectedRoadmapId = card.dataset.roadmapId;
      if (onSelectRoadmap) onSelectRoadmap();
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}
