const STORAGE_KEY = "six-audit-concept-v1";
const sections = [
  { id: "doc", title: "Dokumentacija" },
  { id: "clean", title: "Splošna urejenost in čistoča" },
  { id: "tools", title: "Čistilni pripomočki" },
  { id: "machines", title: "Stroji in viličarji" },
  { id: "storage", title: "Odlagalna mesta" },
  { id: "equipment", title: "Orodja in pripomočki" },
  { id: "measurement", title: "Merilna oprema" },
  { id: "eco", title: "Ekološka cona" },
  { id: "safety", title: "Splošna varnost" },
  { id: "outside", title: "Okolica stavbe" }
];

const elements = Object.fromEntries([
  "welcomeScreen", "auditScreen", "summaryScreen", "startForm", "resumeBox",
  "resumeText", "resumeButton", "auditMeta", "progressText", "progressBar",
  "sectionNav", "sectionCrumb", "categoryCrumb", "questionCounter",
  "questionCard", "previousButton", "nextButton", "summaryButton",
  "summaryMeta", "metricGrid", "sectionResults", "exportButton", "printButton",
  "backToAuditButton", "newAuditButton", "leaveButton", "saveStatus"
].map((id) => [id, document.getElementById(id)]));

let questions = [];
let state = null;
let currentIndex = 0;
let saveMessageTimer = 0;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function blankAnswer() {
  return { choice: null, comment: "", action: "", owner: "", dueDate: "", notes: "", photos: [] };
}

function readSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Osnutka ni bilo mogoče prebrati iz brskalnika.", error);
    return null;
  }
}

function persistState() {
  if (!state) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    elements.saveStatus.textContent = "Osnutek shranjen v tem brskalniku";
    elements.resumeText.textContent = `${state.meta.company} · ${state.meta.ted} · ${state.meta.date}`;
    elements.resumeBox.hidden = false;
  } catch (error) {
    elements.saveStatus.textContent = "Lokalno shranjevanje ni uspelo";
    console.error("Osnutka ni bilo mogoče shraniti v brskalnik.", error);
    window.alert("Brskalnik ni mogel shraniti osnutka. Morda je prostora za fotografije premalo. Odstrani nekaj slik in poskusi znova.");
    return;
  }
  window.clearTimeout(saveMessageTimer);
  saveMessageTimer = window.setTimeout(() => {
    elements.saveStatus.textContent = "Osnutek je shranjen lokalno";
  }, 1200);
}

function ensureAnswer(questionId) {
  if (!state.answers[questionId]) state.answers[questionId] = blankAnswer();
  return state.answers[questionId];
}

function answeredCount() {
  return questions.filter((question) => state.answers[question.id]?.choice !== null
    && state.answers[question.id]?.choice !== undefined).length;
}

function openScreen(name) {
  elements.welcomeScreen.hidden = name !== "welcome";
  elements.auditScreen.hidden = name !== "audit";
  elements.summaryScreen.hidden = name !== "summary";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderMeta() {
  const meta = state.meta;
  elements.auditMeta.innerHTML = `<strong>${escapeHtml(meta.company)}</strong><br>${escapeHtml(meta.oe)} · ${escapeHtml(meta.ted)}<br>${escapeHtml(meta.date)} · ${escapeHtml(meta.auditor)}`;
}

function renderProgress() {
  const count = answeredCount();
  elements.progressText.textContent = `${count} / ${questions.length}`;
  elements.progressBar.style.width = `${questions.length ? count / questions.length * 100 : 0}%`;
  elements.sectionNav.querySelectorAll(".section-link").forEach((button) => {
    const section = sections.find((item) => item.id === button.dataset.section);
    const sectionQuestions = questions.filter((question) => question.section === section.id);
    const done = sectionQuestions.filter((question) => state.answers[question.id]?.choice !== null
      && state.answers[question.id]?.choice !== undefined).length;
    button.querySelector(".section-count").textContent = `${done}/${sectionQuestions.length}`;
    button.classList.toggle("active", questions[currentIndex]?.section === section.id);
    button.setAttribute("aria-current", questions[currentIndex]?.section === section.id ? "step" : "false");
  });
}

function renderSectionNavigation() {
  elements.sectionNav.innerHTML = sections.map((section, index) => {
    const count = questions.filter((question) => question.section === section.id).length;
    return `<button class="section-link" type="button" data-section="${section.id}">
      <span class="section-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="section-name">${escapeHtml(section.title)}</span>
      <span class="section-count">0/${count}</span>
    </button>`;
  }).join("");
  elements.sectionNav.querySelectorAll(".section-link").forEach((button) => {
    button.addEventListener("click", () => {
      const index = questions.findIndex((question) => question.section === button.dataset.section);
      if (index >= 0) setQuestion(index);
    });
  });
}

function renderQuestion() {
  const question = questions[currentIndex];
  if (!question) return;
  const answer = ensureAnswer(question.id);
  const checked = (choice) => answer.choice === choice ? "checked" : "";
  const photoMarkup = answer.photos.map((photo, index) => `
    <div class="photo-item">
      <img src="${photo.data}" alt="Fotografija ${index + 1}">
      <button class="photo-remove" type="button" data-remove-photo="${index}" aria-label="Odstrani fotografijo ${index + 1}">×</button>
    </div>`).join("");

  elements.sectionCrumb.textContent = question.sectionTitle;
  elements.categoryCrumb.textContent = question.category || "Vprašanje";
  elements.questionCounter.textContent = `Vprašanje ${currentIndex + 1} od ${questions.length}`;
  elements.questionCard.innerHTML = `
    <div class="question-heading">
      <span class="question-number">${String(currentIndex + 1).padStart(2, "0")}</span>
      <h2 class="question-title">${escapeHtml(question.question)}</h2>
    </div>
    <div class="question-category">${escapeHtml(question.category || question.sectionTitle)}</div>
    <div class="answer-label">Oceni stanje</div>
    <div class="answer-options" role="radiogroup" aria-label="Odgovor">
      <label class="answer-option yes"><input type="radio" name="answer" value="yes" ${checked("yes")}><span>DA <small>· skladno</small></span></label>
      <label class="answer-option no"><input type="radio" name="answer" value="no" ${checked("no")}><span>NE <small>· odstopanje</small></span></label>
    </div>
    <div class="field-grid">
      <label class="full-width">Komentar / ugotovitev<textarea data-field="comment" placeholder="Kaj si opazil pri presoji?">${escapeHtml(answer.comment)}</textarea></label>
      <label class="full-width">Korektivni ukrep<textarea data-field="action" placeholder="Kaj je treba urediti?">${escapeHtml(answer.action)}</textarea></label>
      <label>Odgovorna oseba<input data-field="owner" value="${escapeHtml(answer.owner)}" placeholder="Ime in priimek"></label>
      <label>Rok izvedbe<input data-field="dueDate" type="date" value="${escapeHtml(answer.dueDate)}"></label>
      <label class="full-width">Dodatne opombe<textarea data-field="notes" placeholder="Dodatne informacije">${escapeHtml(answer.notes)}</textarea></label>
      <div class="full-width">
        <div class="photo-area">
          <span class="photo-help">Dodaj fotografijo z naprave ali odpri kamero.<br>Slike so shranjene lokalno za ta prikaz.</span>
          <label class="button button-secondary photo-button" for="photoInput">＋ Fotografija</label>
          <input class="photo-input" id="photoInput" type="file" accept="image/*" capture="environment" multiple>
        </div>
        <div class="photo-list">${photoMarkup}</div>
      </div>
    </div>`;

  elements.questionCard.querySelectorAll('input[name="answer"]').forEach((input) => {
    input.addEventListener("change", () => updateAnswer("choice", input.value));
  });
  elements.questionCard.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", () => updateAnswer(input.dataset.field, input.value));
  });
  elements.questionCard.querySelector("#photoInput").addEventListener("change", handlePhotoUpload);
  elements.questionCard.querySelectorAll("[data-remove-photo]").forEach((button) => {
    button.addEventListener("click", () => {
      answer.photos.splice(Number(button.dataset.removePhoto), 1);
      persistState();
      renderQuestion();
    });
  });
  elements.previousButton.disabled = currentIndex === 0;
  elements.nextButton.innerHTML = currentIndex === questions.length - 1
    ? 'Zaključi pregled <span aria-hidden="true">→</span>'
    : 'Naprej <span aria-hidden="true">→</span>';
  renderProgress();
}

function updateAnswer(field, value) {
  const question = questions[currentIndex];
  ensureAnswer(question.id)[field] = value;
  persistState();
  renderProgress();
}

function setQuestion(index) {
  currentIndex = Math.max(0, Math.min(index, questions.length - 1));
  renderQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Datoteke ni bilo mogoče prebrati."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Izbrana datoteka ni veljavna slika."));
      image.onload = () => {
        const maxSize = 1000;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Brskalnik ne omogoča obdelave fotografije."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.68));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handlePhotoUpload(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  const answer = ensureAnswer(questions[currentIndex].id);
  try {
    for (const file of files) {
      if (!file.type.startsWith("image/")) throw new Error("Izberi slikovno datoteko.");
      answer.photos.push({ name: file.name, data: await compressImage(file) });
    }
    persistState();
    renderQuestion();
  } catch (error) {
    window.alert(error.message);
  }
}

function startAudit(meta) {
  state = { meta, answers: {}, status: "in-progress", updatedAt: new Date().toISOString() };
  currentIndex = 0;
  persistState();
  renderMeta();
  renderSectionNavigation();
  renderQuestion();
  openScreen("audit");
}

function renderSummary() {
  const total = questions.length;
  const answered = answeredCount();
  const yesCount = questions.filter((question) => state.answers[question.id]?.choice === "yes").length;
  const noCount = questions.filter((question) => state.answers[question.id]?.choice === "no").length;
  const openActions = questions.filter((question) => {
    const answer = state.answers[question.id];
    return answer?.choice === "no" && answer.action.trim();
  }).length;
  const percentage = answered ? Math.round((yesCount / answered) * 100) : 0;
  const metrics = [
    { label: "Odgovorjena vprašanja", value: `${answered}/${total}`, note: "vprašanj v predlogi" },
    { label: "Odgovori DA", value: yesCount, note: "skladno po izbiri uporabnika" },
    { label: "Odstopanja NE", value: noCount, note: "izbran odgovor NE" },
    { label: "Vpisani ukrepi", value: openActions, note: "pri odgovorih NE" },
    { label: "Demo skladnost", value: `${percentage}%`, note: "poenostavljen prikaz" }
  ];
  elements.summaryMeta.textContent = `${state.meta.company} · ${state.meta.oe} · ${state.meta.ted} · ${state.meta.date} · ${state.meta.auditor}`;
  elements.metricGrid.innerHTML = metrics.map((metric) => `
    <div class="metric-card"><div class="metric-label">${escapeHtml(metric.label)}</div>
    <div class="metric-value">${escapeHtml(metric.value)}</div><div class="metric-note">${escapeHtml(metric.note)}</div></div>`).join("");
  elements.sectionResults.innerHTML = sections.map((section) => {
    const sectionQuestions = questions.filter((question) => question.section === section.id);
    const sectionYes = sectionQuestions.filter((question) => state.answers[question.id]?.choice === "yes").length;
    const sectionNo = sectionQuestions.filter((question) => state.answers[question.id]?.choice === "no").length;
    const sectionAnswered = sectionYes + sectionNo;
    const ratio = sectionAnswered ? Math.round(sectionYes / sectionAnswered * 100) : 0;
    return `<div class="result-row"><span class="result-name">${escapeHtml(section.title)}</span>
      <span class="result-count">${sectionAnswered}/${sectionQuestions.length} · ${sectionNo} NE</span>
      <span class="result-track"><span style="width:${ratio}%"></span></span></div>`;
  }).join("");
}

function showSummary(complete = true) {
  if (complete) state.status = "completed-demo";
  state.updatedAt = new Date().toISOString();
  persistState();
  renderSummary();
  openScreen("summary");
}

function downloadDemo() {
  const record = {
    application: "6S presoja — koncept",
    notice: "Demonstracijski izvoz. Ni uradni zapis presoje; ocena ni izračunana po Excelovi formuli.",
    generatedAt: new Date().toISOString(),
    audit: state.meta,
    answers: questions.map((question) => ({
      section: question.sectionTitle,
      category: question.category,
      question: question.question,
      answer: state.answers[question.id] || blankAnswer()
    }))
  };
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `6s-demo-${state.meta.date || "presoja"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function openSavedAudit() {
  const saved = readSavedState();
  if (!saved || !saved.meta || !saved.answers) return;
  state = saved;
  const firstUnanswered = questions.findIndex((question) => state.answers[question.id]?.choice == null);
  currentIndex = firstUnanswered >= 0 ? firstUnanswered : 0;
  renderMeta();
  renderSectionNavigation();
  renderQuestion();
  openScreen("audit");
}

async function initialize() {
  try {
    const response = await fetch("./questions.json");
    if (!response.ok) throw new Error(`Vprašanj ni bilo mogoče naložiti (${response.status}).`);
    questions = await response.json();
    if (!Array.isArray(questions) || questions.length !== 191) {
      throw new Error(`Pričakovanih je 191 vprašanj; naloženih je ${questions.length}.`);
    }
  } catch (error) {
    document.querySelector(".shell").innerHTML = `<section class="panel" style="padding:24px">
      <h1>Vprašanj ni bilo mogoče naložiti</h1><p>${escapeHtml(error.message)}</p>
      <p>Odpri prototip prek spletnega strežnika ali GitHub Pages; neposredno odpiranje datoteke HTML ne omogoča nalaganja vprašanj.</p></section>`;
    console.error(error);
    return;
  }

  const dateInput = elements.startForm.elements.date;
  const now = new Date();
  dateInput.value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const saved = readSavedState();
  if (saved?.meta && saved?.answers) {
    elements.resumeText.textContent = `${saved.meta.company} · ${saved.meta.ted} · ${saved.meta.date}`;
    elements.resumeBox.hidden = false;
  }

  elements.startForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(elements.startForm);
    const meta = Object.fromEntries(formData.entries());
    if (readSavedState() && !window.confirm("Začnem novo demonstracijo? Shranjeni osnutek v tem brskalniku bo zamenjan.")) return;
    startAudit(meta);
  });
  elements.resumeButton.addEventListener("click", openSavedAudit);
  elements.previousButton.addEventListener("click", () => setQuestion(currentIndex - 1));
  elements.nextButton.addEventListener("click", () => {
    if (currentIndex === questions.length - 1) showSummary();
    else setQuestion(currentIndex + 1);
  });
  elements.summaryButton.addEventListener("click", () => showSummary(false));
  elements.leaveButton.addEventListener("click", () => openScreen("welcome"));
  elements.backToAuditButton.addEventListener("click", () => openScreen("audit"));
  elements.exportButton.addEventListener("click", downloadDemo);
  elements.printButton.addEventListener("click", () => window.print());
  elements.newAuditButton.addEventListener("click", () => {
    if (!window.confirm("Začneš novo demonstracijo? Trenutna bo izbrisana iz tega brskalnika.")) return;
    window.clearTimeout(saveMessageTimer);
    localStorage.removeItem(STORAGE_KEY);
    state = null;
    elements.resumeBox.hidden = true;
    elements.saveStatus.textContent = "Ni povezave z oblakom";
    openScreen("welcome");
  });
}

initialize();
