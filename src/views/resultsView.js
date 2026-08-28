import { state, getExam } from "../state.js";
import { escapeHtml, formatPercent } from "../utils/helpers.js";
import { parseMarkdown } from "../utils/markdown.js";
import { renderTagBadges } from "../utils/tags.js";

export function renderResultsView(container, { onRepeat, onPracticeMistakes, onReturnToSetup, onGoBackRoadmap, onGoHome }) {
  const session = state.session;
  if (!session) return;

  const total = session.questions.length;
  const score = session.score;
  const percent = total ? score / total : 0;
  const wrong = session.answers.filter(a => !a.correct);
  const right = session.answers.filter(a => a.correct);
  const passing = (getExam()?.passingScore || 70) / 100;

  const roadmapTitle = state.catalog.roadmaps.find(item => item.id === state.selectedRoadmapId)?.title || "Roadmap";

  container.innerHTML = `
    <nav class="breadcrumbs" aria-label="Navegación">
      <button id="homeBtn" class="crumb" type="button">Menú inicial</button>
      <span class="crumb-sep" aria-hidden="true">›</span>
      <button id="roadmapBtn" class="crumb" type="button">${escapeHtml(roadmapTitle)}</button>
      <span class="crumb-sep" aria-hidden="true">›</span>
      <button id="examCrumbBtn" class="crumb" type="button">${escapeHtml(getExam()?.code || "Examen")}</button>
      <span class="crumb-sep" aria-hidden="true">›</span>
      <span class="crumb current" aria-current="page">Resultados</span>
    </nav>
    <div class="results-header ${percent >= passing ? "passed" : "failed"}">
      <h2>${percent >= passing ? "🎉 ¡Buen resultado! Examen Aprobado" : "📚 Sigue entrenando para alcanzar la meta"}</h2>
      <p class="small">${escapeHtml(session.domainTitle)} · Modo ${escapeHtml(session.mode.toUpperCase())}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><span>Puntaje Obtenido</span><strong>${formatPercent(percent)}</strong></div>
      <div class="stat-card"><span>Correctas</span><strong>${score}/${total}</strong></div>
      <div class="stat-card"><span>Errores</span><strong>${wrong.length}</strong></div>
      <div class="stat-card"><span>Meta de Aprobación</span><strong>${getExam()?.passingScore || 70}%</strong></div>
    </div>

    <div class="action-row">
      <button id="againBtn" class="btn btn-primary">Repetir configuración</button>
      <button id="mistakesBtn" class="btn btn-danger" ${wrong.length ? "" : "disabled"}>Practicar solo errores (${wrong.length})</button>
      <button id="returnSetupBtn" class="btn btn-light">Volver al dominio</button>
    </div>

    <h3 class="section-subtitle" style="margin-top:28px">Revisión detallada de respuestas</h3>
    <div class="review-list">
      ${[...wrong, ...right].map((answer, index) => renderReviewItem(answer, index)).join("")}
    </div>`;

  document.getElementById("againBtn").addEventListener("click", onRepeat);
  document.getElementById("mistakesBtn").addEventListener("click", onPracticeMistakes);
  document.getElementById("returnSetupBtn").addEventListener("click", onReturnToSetup);
  document.getElementById("examCrumbBtn").addEventListener("click", onReturnToSetup);
  if (onGoBackRoadmap) document.getElementById("roadmapBtn").addEventListener("click", onGoBackRoadmap);
  if (onGoHome) document.getElementById("homeBtn").addEventListener("click", onGoHome);
}

function renderReviewItem(answer, index) {
  const tagsHtml = renderTagBadges(answer.tags);

  return `
    <article class="review-item ${answer.correct ? "right" : "wrong"}">
      <div class="review-status">${answer.correct ? "✅ Correcta" : "❌ Incorrecta"}</div>
      <p class="review-question"><strong>${index + 1}. ${parseMarkdown(answer.question)}</strong></p>
      <p class="review-user-ans"><strong>Tu respuesta:</strong> ${answer.selectedTexts.length ? answer.selectedTexts.map(t => parseMarkdown(t)).join("; ") : "Sin respuesta"}</p>
      <p class="review-correct-ans"><strong>Respuesta correcta:</strong> ${answer.correctTexts.map(t => parseMarkdown(t)).join("; ")}</p>
      <div class="review-explanation">
        <strong>Explicación:</strong> ${parseMarkdown(answer.explanation || "Sin explicación registrada.")}
      </div>
      ${tagsHtml}
    </article>`;
}
