import { state, formatTime, questionStats, saveProgress } from "../state.js";
import { escapeHtml, letters } from "../utils/helpers.js";
import { parseMarkdown } from "../utils/markdown.js";
import { renderTagBadges } from "../utils/tags.js";

export function renderQuizView(container, { onFinish, onQuit }) {
  const session = state.session;
  if (!session) return;
  
  const question = session.questions[session.current];
  const progress = (session.current / session.questions.length) * 100;
  const multi = question.mappedAnswers.length > 1;

  container.innerHTML = `
    <div class="quiz-top">
      <div class="quiz-meta">
        <span class="quiz-domain-tag">${escapeHtml(session.domainTitle)} · <span class="badge-mode">${session.mode.toUpperCase()}</span></span>
        <span class="quiz-count">Pregunta <strong>${session.current + 1}</strong> de <strong>${session.questions.length}</strong></span>
        ${session.mode === "exam" ? `<span class="timer">Tiempo: <strong id="timer">${formatTime(session.timeRemaining)}</strong></span>` : ""}
      </div>
      <div class="progress-shell"><div class="progress-bar" style="width:${progress}%"></div></div>
    </div>

    <article class="question-card">
      ${multi ? `<div class="multi-hint">💡 Selección múltiple: elige más de una respuesta</div>` : ""}
      <div class="question-text">${parseMarkdown(question.question)}</div>
      <div class="options">
        ${question.options.map((option, index) => optionHtml(question, option, index, multi)).join("")}
      </div>
      <div id="feedback"></div>
      <div class="action-row">
        ${session.mode === "exam"
          ? `<button id="nextBtn" class="btn btn-primary">${session.current === session.questions.length - 1 ? "Finalizar examen" : "Guardar y continuar"}</button>`
          : `<button id="checkBtn" class="btn btn-primary" ${question.checked ? "disabled" : ""}>Comprobar</button><button id="nextBtn" class="btn btn-light" ${question.checked ? "" : "disabled"}>${session.current === session.questions.length - 1 ? "Ver resultados" : "Siguiente"}</button>`}
        <button id="quitBtn" class="btn btn-danger">Salir</button>
      </div>
    </article>`;

  if (question.checked && session.mode !== "exam") {
    renderFeedback(question);
  }

  // Event Listeners
  container.querySelectorAll("input[name='answer']").forEach(input => {
    input.addEventListener("change", () => onSelectAnswer(question));
  });

  const checkBtn = document.getElementById("checkBtn");
  if (checkBtn) {
    checkBtn.addEventListener("click", () => checkCurrentAnswer(container, onFinish));
  }

  document.getElementById("nextBtn").addEventListener("click", () => {
    if (session.mode === "exam") saveExamAnswer();
    nextQuestion(container, onFinish);
  });

  document.getElementById("quitBtn").addEventListener("click", () => {
    if (confirm("¿Salir de la sesión actual? No se guardará como intento completo.")) {
      onQuit();
    }
  });
}

function optionHtml(question, option, index, multi) {
  const checked = question.selected.includes(index) ? "checked" : "";
  let cls = "option";
  if (question.selected.includes(index)) cls += " selected";
  if (question.checked) {
    if (question.mappedAnswers.includes(index)) cls += " correct";
    else if (question.selected.includes(index)) cls += " incorrect";
  }

  return `
    <label class="${cls}">
      <input type="${multi ? "checkbox" : "radio"}" name="answer" value="${index}" ${checked} ${question.checked ? "disabled" : ""}/>
      <span class="option-content">
        <span class="option-letter">${letters[index]}.</span> 
        <span class="option-text">${parseMarkdown(option.text)}</span>
      </span>
    </label>`;
}

function onSelectAnswer(question) {
  const inputs = [...document.querySelectorAll("input[name='answer']:checked")];
  question.selected = inputs.map(input => parseInt(input.value, 10));
}

function isCorrect(question) {
  const selected = [...question.selected].sort((a, b) => a - b).join(",");
  const answer = [...question.mappedAnswers].sort((a, b) => a - b).join(",");
  return selected === answer;
}

function checkCurrentAnswer(container, onFinish) {
  const session = state.session;
  const question = session.questions[session.current];
  if (!question.selected.length) {
    alert("Selecciona una respuesta antes de comprobar.");
    return;
  }
  question.checked = true;
  question.correct = isCorrect(question);
  session.answers[session.current] = summarizeAnswer(question);
  updateQuestionProgress(question);
  renderQuizView(container, { onFinish });
}

export function saveExamAnswer() {
  const session = state.session;
  const question = session.questions[session.current];
  question.checked = true;
  question.correct = isCorrect(question);
  session.answers[session.current] = summarizeAnswer(question);
}

function summarizeAnswer(question) {
  return {
    id: question.id,
    question: question.question,
    selectedTexts: question.selected.map(i => question.options[i]?.text).filter(Boolean),
    correctTexts: question.mappedAnswers.map(i => question.options[i]?.text).filter(Boolean),
    correct: question.correct,
    explanation: question.explanation,
    tags: question.tags || []
  };
}

function updateQuestionProgress(question) {
  const stats = questionStats(question.id);
  stats.attempts += 1;
  stats.lastCorrect = question.correct;
  stats.lastAttemptAt = new Date().toISOString();
  if (question.correct) stats.correct += 1;
  else stats.wrong += 1;
  state.progress.questions[question.id] = stats;
  saveProgress();
}

function renderFeedback(question) {
  const feedback = document.getElementById("feedback");
  if (!feedback) return;

  const correctTexts = question.mappedAnswers.map(i => `<strong>${letters[i]}.</strong> ${parseMarkdown(question.options[i].text)}`).join("<br>");
  const tagsHtml = renderTagBadges(question.tags);

  feedback.innerHTML = `
    <div class="feedback ${question.correct ? "correct" : "incorrect"}">
      <div class="feedback-header">
        <span class="feedback-icon">${question.correct ? "✅" : "❌"}</span>
        <h3>${question.correct ? "¡Respuesta Correcta!" : "Respuesta Incorrecta"}</h3>
      </div>
      <p class="feedback-answer"><strong>Respuesta correcta:</strong><br>${correctTexts}</p>
      <p class="feedback-explanation"><strong>Explicación:</strong> ${parseMarkdown(question.explanation || "Sin explicación registrada.")}</p>
      ${tagsHtml}
    </div>`;
}

export function nextQuestion(container, onFinish) {
  const session = state.session;
  if (session.current < session.questions.length - 1) {
    session.current += 1;
    renderQuizView(container, { onFinish });
  } else {
    onFinish();
  }
}
