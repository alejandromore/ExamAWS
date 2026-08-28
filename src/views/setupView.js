import {
  state,
  getExam,
  getDomain,
  ensureDomainSelection,
  getQuestionsForDomain,
  questionStats
} from "../state.js";
import { escapeHtml, formatPercent } from "../utils/helpers.js";

export async function renderSetupView(container, { onGoBackRoadmap, onGoHome, onStartSession }) {
  state.view = "exam";
  const exam = getExam();
  ensureDomainSelection();
  const roadmapTitle = state.catalog.roadmaps.find(item => item.id === state.selectedRoadmapId)?.title || "Roadmap";

  // Load all domain questions in parallel
  const domainQuestions = {};
  await Promise.all(exam.domains.map(async domain => {
    domainQuestions[domain.id] = await getQuestionsForDomain(domain);
  }));

  const selectedQuestions = domainQuestions[state.selectedDomainId] || [];

  const domainsHtml = exam.domains.map(domain => {
    const questions = domainQuestions[domain.id] || [];
    const answered = questions.filter(q => questionStats(q.id).attempts > 0).length;
    const correct = questions.filter(q => questionStats(q.id).lastCorrect === true).length;
    const disabled = questions.length === 0;
    const selected = domain.id === state.selectedDomainId;

    return `
      <article 
        class="domain-card ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}" 
        data-domain-id="${domain.id}"
        role="button"
        tabindex="${disabled ? "-1" : "0"}"
        aria-pressed="${selected}"
      >
        <div class="domain-header">
          <div class="domain-title-wrapper">
            <span class="domain-radio-indicator ${selected ? "active" : ""}"></span>
            <strong>${escapeHtml(domain.title)}</strong>
          </div>
          <span class="domain-weight-badge">${domain.kind === "practice-exam" ? "Simulador" : `${domain.weight}%`}</span>
        </div>
        <div class="domain-meta">
          <span>${questions.length ? `${questions.length} preguntas · ${answered} practicadas · ${correct} dominadas` : "Sin preguntas cargadas"}</span>
        </div>
        <div class="progress-shell" aria-label="Progreso del dominio">
          <div class="progress-bar" style="width:${questions.length ? (answered / questions.length) * 100 : 0}%"></div>
        </div>
      </article>`;
  }).join("");

  const mistakeCount = selectedQuestions.filter(q => questionStats(q.id).lastCorrect === false).length;
  const totalAnswered = selectedQuestions.filter(q => questionStats(q.id).attempts > 0).length;
  const totalCorrect = selectedQuestions.filter(q => questionStats(q.id).lastCorrect === true).length;
  const selectedDomain = getDomain();

  if (selectedDomain?.kind === "practice-exam" && state.mode !== "practice" && state.mode !== "exam") {
    state.mode = "exam";
  }

  const modeOptions = selectedDomain?.kind === "practice-exam"
    ? `<option value="practice" ${state.mode === "practice" ? "selected" : ""}>Prueba: feedback inmediato</option><option value="exam" ${state.mode === "exam" ? "selected" : ""}>Examen: simulación con temporizador</option>`
    : `<option value="practice" ${state.mode === "practice" ? "selected" : ""}>Práctica: feedback inmediato</option><option value="exam" ${state.mode === "exam" ? "selected" : ""}>Examen: feedback al final y temporizador</option><option value="review" ${state.mode === "review" ? "selected" : ""}>Revisión: prioriza errores</option>`;

  container.innerHTML = `
    <nav class="breadcrumbs" aria-label="Navegación">
      <button id="homeBtn" class="crumb" type="button">Menú inicial</button>
      <span class="crumb-sep" aria-hidden="true">›</span>
      <button id="backRoadmapBtn" class="crumb" type="button">${escapeHtml(roadmapTitle)}</button>
      <span class="crumb-sep" aria-hidden="true">›</span>
      <span class="crumb current" aria-current="page">${escapeHtml(exam.code)}</span>
    </nav>
    <div class="setup-grid">
      <div class="main-setup-col">
        <div class="exam-card">
          <div class="exam-title">
            <span class="badge code">${escapeHtml(exam.code)}</span>
            <h2>${escapeHtml(exam.title)}</h2>
            <span class="badge">${escapeHtml(exam.level || "")}</span>
            ${exam.vendor ? `<span class="badge vendor-${escapeHtml(String(exam.vendor).toLowerCase())}">${escapeHtml(exam.vendor)}</span>` : ""}
          </div>
          <p class="exam-desc">${escapeHtml(exam.description)}</p>
          <p class="small">Puntaje objetivo: <strong>${exam.passingScore}%</strong> · Duración oficial aproximada: <strong>${exam.examDurationMinutes} min</strong></p>
        </div>

        <h3 class="section-subtitle">Dominios / bancos disponibles</h3>
        <div class="domain-list">${domainsHtml}</div>
      </div>

      <aside class="controls">
        <div class="stat-card highlight">
          <span class="stat-label">${selectedDomain?.kind === "practice-exam" ? "Banco seleccionado" : "Dominio seleccionado"}</span>
          <strong class="stat-value">${selectedQuestions.length}</strong>
          <p class="small">preguntas disponibles · ${mistakeCount} para revisión de errores</p>
        </div>
        <div class="stat-card">
          <span class="stat-label">Avance del dominio</span>
          <strong class="stat-value">${selectedQuestions.length ? formatPercent(totalAnswered / selectedQuestions.length) : "0%"}</strong>
          <p class="small">Dominadas: ${totalCorrect}/${selectedQuestions.length}</p>
        </div>

        <div class="control-group">
          <label for="modeSelect">Modo de entrenamiento</label>
          <select id="modeSelect">
            ${modeOptions}
          </select>
        </div>

        <div class="control-group">
          <label for="questionCount">Número de preguntas</label>
          <input id="questionCount" type="number" min="1" max="${Math.max(1, selectedQuestions.length)}" value="${Math.min(state.questionCount, Math.max(1, selectedQuestions.length))}" />
        </div>

        <div class="checkbox-group">
          <label class="check-row"><input id="shuffleQuestions" type="checkbox" ${state.shuffleQuestions ? "checked" : ""}/> Aleatorizar preguntas</label>
          <label class="check-row"><input id="shuffleOptions" type="checkbox" ${state.shuffleOptions ? "checked" : ""}/> Aleatorizar opciones</label>
          <label class="check-row"><input id="onlyMistakes" type="checkbox" ${state.onlyMistakes ? "checked" : ""}/> Practicar solo errores</label>
        </div>

        <button id="startBtn" class="btn btn-primary btn-large" ${selectedQuestions.length ? "" : "disabled"}>Iniciar entrenamiento</button>
        <p class="small shortcuts-hint">Atajos: <span class="kbd">1-4</span> responder · <span class="kbd">Enter</span> comprobar/siguiente.</p>
      </aside>
    </div>`;

  // Bind Event Listeners
  document.getElementById("backRoadmapBtn").addEventListener("click", onGoBackRoadmap);
  const homeBtn = document.getElementById("homeBtn");
  if (homeBtn && onGoHome) homeBtn.addEventListener("click", onGoHome);

  container.querySelectorAll(".domain-card").forEach(card => {
    const select = async () => {
      const domainId = card.dataset.domainId;
      const targetDomain = exam.domains.find(d => d.id === domainId);
      if (!targetDomain || !(domainQuestions[domainId] || []).length) return;

      state.selectedDomainId = domainId;
      if (targetDomain.kind === "practice-exam") {
        state.mode = "exam";
        state.questionCount = (domainQuestions[domainId] || []).length;
      }
      await renderSetupView(container, { onGoBackRoadmap, onGoHome, onStartSession });
    };
    card.addEventListener("click", select);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select();
      }
    });
  });

  document.getElementById("modeSelect").addEventListener("change", async e => {
    state.mode = e.target.value;
    await renderSetupView(container, { onGoBackRoadmap, onGoHome, onStartSession });
  });

  document.getElementById("questionCount").addEventListener("change", e => {
    state.questionCount = Math.max(1, parseInt(e.target.value, 10) || 1);
  });

  document.getElementById("shuffleQuestions").addEventListener("change", e => {
    state.shuffleQuestions = e.target.checked;
  });

  document.getElementById("shuffleOptions").addEventListener("change", e => {
    state.shuffleOptions = e.target.checked;
  });

  document.getElementById("onlyMistakes").addEventListener("change", e => {
    state.onlyMistakes = e.target.checked;
  });

  document.getElementById("startBtn").addEventListener("click", () => onStartSession());
}
