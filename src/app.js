(() => {
  const STORAGE_KEY = "examaws.practice.progress.v2";
  const letters = ["A", "B", "C", "D", "E", "F"];

  const state = {
    catalog: null,
    roadmaps: {},
    questionCache: {},
    view: "home",
    selectedRoadmapId: null,
    selectedExamId: null,
    selectedDomainId: null,
    mode: "practice",
    questionCount: 10,
    shuffleQuestions: true,
    shuffleOptions: true,
    onlyMistakes: false,
    session: null,
    progress: loadProgress()
  };

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
      el.setup.innerHTML = `<div class="feedback incorrect"><h2>Error cargando datos</h2><p>${escapeHtml(error.message)}</p><p>Si abriste el archivo directamente, usa un servidor local: <code>python -m http.server 8000</code>.</p></div>`;
      console.error(error);
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo cargar ${url}: ${response.status}`);
    return response.json();
  }

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { questions: {}, sessions: [] };
    } catch (_) {
      return { questions: {}, sessions: [] };
    }
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  }

  function getExam(examId = state.selectedExamId) {
    return state.catalog.exams.find(exam => exam.id === examId) || state.catalog.exams[0];
  }

  function getRoadmap(roadmapId = state.selectedRoadmapId) {
    return state.roadmaps[roadmapId];
  }

  function ensureDomainSelection() {
    const exam = getExam();
    if (!exam?.domains?.some(domain => domain.id === state.selectedDomainId)) {
      state.selectedDomainId = exam?.domains?.[0]?.id || null;
    }
  }

  function getDomain() {
    ensureDomainSelection();
    return getExam().domains.find(domain => domain.id === state.selectedDomainId);
  }

  async function getQuestionsForDomain(domain = getDomain()) {
    if (!domain?.dataUrl) return [];
    if (!state.questionCache[domain.dataUrl]) {
      state.questionCache[domain.dataUrl] = await fetchJson(domain.dataUrl);
    }
    return state.questionCache[domain.dataUrl];
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function formatPercent(value) {
    return `${Math.round(value * 100)}%`;
  }

  function questionStats(questionId) {
    return state.progress.questions[questionId] || { attempts: 0, correct: 0, wrong: 0, lastCorrect: null };
  }

  function roadmapExams(roadmapId = state.selectedRoadmapId) {
    return state.catalog.exams.filter(exam => exam.roadmapIds?.includes(roadmapId));
  }

  function examAvailableQuestions(exam) {
    return exam.domains.reduce((sum, domain) => sum + (domain.questionCount || 0), 0);
  }

  function renderShell(viewHtml) {
    el.results.classList.add("hidden");
    el.quiz.classList.add("hidden");
    el.setup.classList.remove("hidden");
    el.setup.innerHTML = viewHtml;
  }

  function renderHome() {
    state.view = "home";
    const roadmapCards = state.catalog.roadmaps.map(roadmapRef => {
      const roadmap = getRoadmap(roadmapRef.id);
      const exams = roadmapExams(roadmapRef.id);
      const totalQuestions = exams.reduce((sum, exam) => sum + examAvailableQuestions(exam), 0);
      return `
        <article class="roadmap-card" data-roadmap-id="${roadmapRef.id}">
          <div class="roadmap-icon">${roadmapRef.id.includes("ai") ? "🤖" : "🏗️"}</div>
          <div>
            <h2>${escapeHtml(roadmapRef.title)}</h2>
            <p>${escapeHtml(roadmapRef.description)}</p>
            <p class="small">${exams.length} certificaciones · ${totalQuestions} preguntas cargadas</p>
          </div>
        </article>`;
    }).join("");

    renderShell(`
      <section class="hero-card">
        <p class="eyebrow">Menú inicial</p>
        <h2>Elige tu roadmap AWS</h2>
        <p>La estructura ahora usa catálogo y bancos de preguntas en JSON para crecer por certificación, dominio y ruta de aprendizaje.</p>
      </section>
      <div class="roadmap-grid">${roadmapCards}</div>
    `);

    document.querySelectorAll(".roadmap-card").forEach(card => {
      card.addEventListener("click", () => {
        state.selectedRoadmapId = card.dataset.roadmapId;
        renderRoadmap();
      });
    });
  }

  function renderRoadmap() {
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
              <span class="badge aws">${escapeHtml(step.code)}</span>
              <h3>${escapeHtml(step.title)}</h3>
              <span class="badge ${available ? "" : "empty"}">${available ? `${examAvailableQuestions(exam)} preguntas` : "Pendiente"}</span>
            </div>
            <p>${escapeHtml(step.goal)}</p>
            ${exam ? `<button class="btn ${available ? "btn-primary" : "btn-light"}" data-exam-id="${exam.id}">${available ? "Practicar" : "Preparar estructura"}</button>` : ""}
          </div>
        </article>`;
    }).join("");

    const examOptions = exams.map(exam => `<option value="${exam.id}">${escapeHtml(exam.code)} · ${escapeHtml(exam.title)}</option>`).join("");

    renderShell(`
      <button id="homeBtn" class="btn btn-light" type="button">← Menú inicial</button>
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
    `);

    document.getElementById("homeBtn").addEventListener("click", renderHome);
    document.querySelectorAll("button[data-exam-id]").forEach(button => button.addEventListener("click", () => openExam(button.dataset.examId)));
    document.getElementById("openExamBtn").addEventListener("click", () => openExam(document.getElementById("examQuickSelect").value));
  }

  async function openExam(examId) {
    state.selectedExamId = examId;
    const exam = getExam();
    state.selectedDomainId = exam.domains.find(domain => domain.questionCount > 0)?.id || exam.domains[0]?.id || null;
    await renderSetup();
  }

  async function renderSetup() {
    state.view = "exam";
    const exam = getExam();
    ensureDomainSelection();
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
        <article class="domain-card ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}" data-domain-id="${domain.id}">
          <div class="domain-meta">
            <strong>${escapeHtml(domain.title)}</strong>
            <span>${domain.kind === "practice-exam" ? "Simulador" : `${domain.weight}%`}</span>
          </div>
          <p class="small">${questions.length ? `${questions.length} preguntas · ${answered} practicadas · ${correct} dominadas` : "Pendiente de cargar banco JSON"}</p>
          <div class="progress-shell" aria-label="Progreso del dominio"><div class="progress-bar" style="width:${questions.length ? (answered / questions.length) * 100 : 0}%"></div></div>
        </article>`;
    }).join("");

    const mistakeCount = selectedQuestions.filter(q => questionStats(q.id).lastCorrect === false).length;
    const totalAnswered = selectedQuestions.filter(q => questionStats(q.id).attempts > 0).length;
    const totalCorrect = selectedQuestions.filter(q => questionStats(q.id).lastCorrect === true).length;
    const selectedDomain = getDomain();
    if (selectedDomain.kind === "practice-exam" && state.mode !== "practice" && state.mode !== "exam") {
      state.mode = "exam";
    }
    const modeOptions = selectedDomain.kind === "practice-exam"
      ? `<option value="practice" ${state.mode === "practice" ? "selected" : ""}>Prueba: feedback inmediato</option><option value="exam" ${state.mode === "exam" ? "selected" : ""}>Examen: simulación sin feedback hasta el final</option>`
      : `<option value="practice" ${state.mode === "practice" ? "selected" : ""}>Práctica: feedback inmediato</option><option value="exam" ${state.mode === "exam" ? "selected" : ""}>Examen: feedback al final y temporizador</option><option value="review" ${state.mode === "review" ? "selected" : ""}>Revisión: prioriza errores</option>`;

    renderShell(`
      <button id="backRoadmapBtn" class="btn btn-light" type="button">← Roadmap</button>
      <div class="setup-grid">
        <div>
          <div class="exam-card">
            <div class="exam-title">
              <span class="badge aws">${escapeHtml(exam.code)}</span>
              <h2>${escapeHtml(exam.title)}</h2>
              <span class="badge">${escapeHtml(exam.level || "")}</span>
            </div>
            <p>${escapeHtml(exam.description)}</p>
            <p class="small">Puntaje objetivo: <strong>${exam.passingScore}%</strong> · Duración oficial aproximada: <strong>${exam.examDurationMinutes} min</strong></p>
          </div>

          <h3 style="margin-top:22px">Dominios / bancos disponibles</h3>
          <div class="domain-list">${domainsHtml}</div>
        </div>

        <aside class="controls">
          <div class="stat-card">
            <span>${getDomain().kind === "practice-exam" ? "Banco seleccionado" : "Dominio seleccionado"}</span>
            <strong>${selectedQuestions.length}</strong>
            <p class="small">preguntas disponibles · ${mistakeCount} para revisión de errores</p>
          </div>
          <div class="stat-card">
            <span>Avance del dominio</span>
            <strong>${selectedQuestions.length ? formatPercent(totalAnswered / selectedQuestions.length) : "0%"}</strong>
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

          <label class="check-row"><input id="shuffleQuestions" type="checkbox" ${state.shuffleQuestions ? "checked" : ""}/> Aleatorizar preguntas</label>
          <label class="check-row"><input id="shuffleOptions" type="checkbox" ${state.shuffleOptions ? "checked" : ""}/> Aleatorizar opciones</label>
          <label class="check-row"><input id="onlyMistakes" type="checkbox" ${state.onlyMistakes ? "checked" : ""}/> Practicar solo errores</label>

          <button id="startBtn" class="btn btn-primary" ${selectedQuestions.length ? "" : "disabled"}>Iniciar entrenamiento</button>
          <p class="small">Atajos: <span class="kbd">1-4</span> responder · <span class="kbd">Enter</span> comprobar/siguiente.</p>
        </aside>
      </div>`);

    document.getElementById("backRoadmapBtn").addEventListener("click", renderRoadmap);
    document.querySelectorAll(".domain-card").forEach(card => {
      card.addEventListener("click", async () => {
        const domainId = card.dataset.domainId;
        if (!(domainQuestions[domainId] || []).length) return;
        state.selectedDomainId = domainId;
        if (domain.kind === "practice-exam") {
          state.mode = "exam";
          state.questionCount = (domainQuestions[domainId] || []).length;
        }
        await renderSetup();
      });
    });

    document.getElementById("modeSelect").addEventListener("change", async e => { state.mode = e.target.value; await renderSetup(); });
    document.getElementById("questionCount").addEventListener("change", e => { state.questionCount = Math.max(1, parseInt(e.target.value, 10) || 1); });
    document.getElementById("shuffleQuestions").addEventListener("change", e => { state.shuffleQuestions = e.target.checked; });
    document.getElementById("shuffleOptions").addEventListener("change", e => { state.shuffleOptions = e.target.checked; });
    document.getElementById("onlyMistakes").addEventListener("change", e => { state.onlyMistakes = e.target.checked; });
    document.getElementById("startBtn").addEventListener("click", startSession);
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

    el.setup.classList.add("hidden");
    el.results.classList.add("hidden");
    el.quiz.classList.remove("hidden");
    renderQuiz();
    if (state.mode === "exam") startTimer();
  }

  function startTimer() {
    clearInterval(state.session.timerId);
    state.session.timerId = setInterval(() => {
      state.session.timeRemaining -= 1;
      const timer = document.getElementById("timer");
      if (timer) timer.textContent = formatTime(state.session.timeRemaining);
      if (state.session.timeRemaining <= 0) finishSession();
    }, 1000);
  }

  function formatTime(totalSeconds) {
    const safe = Math.max(0, totalSeconds);
    const min = Math.floor(safe / 60);
    const sec = safe % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function renderQuiz() {
    const session = state.session;
    const question = session.questions[session.current];
    const progress = ((session.current) / session.questions.length) * 100;
    const multi = question.mappedAnswers.length > 1;

    el.quiz.innerHTML = `
      <div class="quiz-top">
        <div class="quiz-meta">
          <span>${escapeHtml(session.domainTitle)} · ${session.mode.toUpperCase()}</span>
          <span>Pregunta ${session.current + 1} de ${session.questions.length}</span>
          ${session.mode === "exam" ? `<span class="timer">Tiempo: <strong id="timer">${formatTime(session.timeRemaining)}</strong></span>` : ""}
        </div>
        <div class="progress-shell"><div class="progress-bar" style="width:${progress}%"></div></div>
      </div>

      <article class="question-card">
        <div class="question-text">${escapeHtml(question.question)}</div>
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

    if (question.checked && session.mode !== "exam") renderFeedback(question);

    document.querySelectorAll("input[name='answer']").forEach(input => input.addEventListener("change", onSelectAnswer));
    const checkBtn = document.getElementById("checkBtn");
    if (checkBtn) checkBtn.addEventListener("click", checkCurrentAnswer);
    document.getElementById("nextBtn").addEventListener("click", () => {
      if (session.mode === "exam") saveExamAnswer();
      nextQuestion();
    });
    document.getElementById("quitBtn").addEventListener("click", () => {
      if (confirm("¿Salir de la sesión actual? No se guardará como intento completo.")) returnToSetup();
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
        <span><span class="option-letter">${letters[index]}.</span> ${escapeHtml(option.text)}</span>
      </label>`;
  }

  function onSelectAnswer() {
    const question = state.session.questions[state.session.current];
    const inputs = [...document.querySelectorAll("input[name='answer']:checked")];
    question.selected = inputs.map(input => parseInt(input.value, 10));
  }

  function isCorrect(question) {
    const selected = [...question.selected].sort((a, b) => a - b).join(",");
    const answer = [...question.mappedAnswers].sort((a, b) => a - b).join(",");
    return selected === answer;
  }

  function checkCurrentAnswer() {
    const question = state.session.questions[state.session.current];
    if (!question.selected.length) {
      alert("Selecciona una respuesta antes de comprobar.");
      return;
    }
    question.checked = true;
    question.correct = isCorrect(question);
    state.session.answers[state.session.current] = summarizeAnswer(question);
    updateQuestionProgress(question);
    renderQuiz();
  }

  function saveExamAnswer() {
    const question = state.session.questions[state.session.current];
    question.checked = true;
    question.correct = isCorrect(question);
    state.session.answers[state.session.current] = summarizeAnswer(question);
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
    const correctTexts = question.mappedAnswers.map(i => `<strong>${letters[i]}.</strong> ${escapeHtml(question.options[i].text)}`).join("<br>");
    feedback.innerHTML = `
      <div class="feedback ${question.correct ? "correct" : "incorrect"}">
        <h3>${question.correct ? "✅ Correcto" : "❌ Incorrecto"}</h3>
        <p><strong>Respuesta correcta:</strong><br>${correctTexts}</p>
        <p><strong>Explicación:</strong> ${escapeHtml(question.explanation || "Sin explicación registrada.")}</p>
        ${question.tags?.length ? `<p class="small">Tags: ${question.tags.map(escapeHtml).join(" · ")}</p>` : ""}
      </div>`;
  }

  function nextQuestion() {
    const session = state.session;
    if (session.current < session.questions.length - 1) {
      session.current += 1;
      renderQuiz();
    } else {
      finishSession();
    }
  }

  function finishSession() {
    const session = state.session;
    clearInterval(session.timerId);
    session.questions.forEach((question, index) => {
      if (!session.answers[index]) {
        question.checked = true;
        question.correct = false;
        session.answers[index] = summarizeAnswer(question);
      }
      if (session.mode === "exam") updateQuestionProgress(question);
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
    const session = state.session;
    const total = session.questions.length;
    const score = session.score;
    const percent = total ? score / total : 0;
    const wrong = session.answers.filter(a => !a.correct);
    const right = session.answers.filter(a => a.correct);
    const passing = getExam().passingScore / 100;

    el.quiz.classList.add("hidden");
    el.results.classList.remove("hidden");
    el.results.innerHTML = `
      <h2>${percent >= passing ? "🎉 Buen resultado" : "📚 Sigue entrenando"}</h2>
      <p class="small">${escapeHtml(session.domainTitle)} · Modo ${escapeHtml(session.mode)}</p>
      <div class="stats-grid">
        <div class="stat-card"><span>Puntaje</span><strong>${formatPercent(percent)}</strong></div>
        <div class="stat-card"><span>Correctas</span><strong>${score}/${total}</strong></div>
        <div class="stat-card"><span>Errores</span><strong>${wrong.length}</strong></div>
        <div class="stat-card"><span>Meta</span><strong>${getExam().passingScore}%</strong></div>
      </div>
      <div class="action-row">
        <button id="againBtn" class="btn btn-primary">Repetir configuración</button>
        <button id="mistakesBtn" class="btn btn-danger" ${wrong.length ? "" : "disabled"}>Practicar errores</button>
        <button id="homeBtn" class="btn btn-light">Volver al examen</button>
      </div>
      <h3 style="margin-top:24px">Revisión de respuestas</h3>
      <div class="review-list">
        ${[...wrong, ...right].map(renderReviewItem).join("")}
      </div>`;

    document.getElementById("againBtn").addEventListener("click", startSession);
    document.getElementById("mistakesBtn").addEventListener("click", () => { state.onlyMistakes = true; state.mode = "review"; startSession(); });
    document.getElementById("homeBtn").addEventListener("click", returnToSetup);
  }

  function renderReviewItem(answer, index) {
    return `
      <article class="review-item ${answer.correct ? "right" : "wrong"}">
        <p><strong>${index + 1}. ${escapeHtml(answer.question)}</strong></p>
        <p><strong>Tu respuesta:</strong> ${answer.selectedTexts.length ? answer.selectedTexts.map(escapeHtml).join("; ") : "Sin respuesta"}</p>
        <p><strong>Correcta:</strong> ${answer.correctTexts.map(escapeHtml).join("; ")}</p>
        <p class="small">${escapeHtml(answer.explanation || "")}</p>
      </article>`;
  }

  async function returnToSetup() {
    if (state.session?.timerId) clearInterval(state.session.timerId);
    state.session = null;
    el.quiz.classList.add("hidden");
    el.results.classList.add("hidden");
    el.setup.classList.remove("hidden");
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
        saveExamAnswer(); nextQuestion();
      } else if (!question.checked) checkCurrentAnswer();
      else nextQuestion();
    }
  }

  function bindGlobalEvents() {
    el.reset.addEventListener("click", async () => {
      if (!confirm("¿Seguro que quieres borrar todo el progreso local?")) return;
      state.progress = { questions: {}, sessions: [] };
      saveProgress();
      if (state.view === "exam") await renderSetup();
      else if (state.view === "roadmap") renderRoadmap();
      else renderHome();
    });
    document.addEventListener("keydown", onKeyDown);
  }

  init();
})();
