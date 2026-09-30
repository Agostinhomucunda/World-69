import { tracks, placementQuestions } from './codelab-curriculum.js';

const $ = (id) => document.getElementById(id);

const initialState = () => ({ version: 1, profile: null, completed: [], drafts: {}, diagnosticScore: null, recommendedTrack: 'logic' });
let state = initialState();
let selectedAvatar = '🦊';
let selectedTrack = 'logic';
let activeLesson = null;
let currentHint = 0;
let toastTimer = 0;
let lessonReady = false;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponível'));
    const request = indexedDB.open('world69-codelab', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('documents')) request.result.createObjectStore('documents');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível abrir o armazenamento local'));
  });
}

async function readStored(key) {
  try {
    const db = await openDatabase();
    const value = await new Promise((resolve, reject) => {
      const request = db.transaction('documents', 'readonly').objectStore('documents').get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (value) return value;
  } catch (_) { /* fallback below */ }
  try { return JSON.parse(localStorage.getItem(`w69-codelab:${key}`) || 'null'); } catch (_) { return null; }
}

async function writeStored(key, value) {
  let saved = false;
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('documents', 'readwrite');
      transaction.objectStore('documents').put(value, key);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('A gravação foi cancelada'));
    });
    db.close();
    saved = true;
  } catch (_) { /* fallback below */ }
  if (!saved) {
    try { localStorage.setItem(`w69-codelab:${key}`, JSON.stringify(value)); saved = true; } catch (_) { /* show status below */ }
  }
  return saved;
}

function storageKey() { return 'guest'; }

async function loadProgress() {
  const key = storageKey();
  const stored = await readStored(key);
  if (stored && typeof stored === 'object') {
    state = { ...initialState(), ...stored };
    state.completed = Array.isArray(state.completed) ? state.completed : [];
    state.drafts = state.drafts && typeof state.drafts === 'object' ? state.drafts : {};
  } else {
    state = initialState();
  }
  selectedAvatar = state.profile?.avatar || '🦊';
  reflectProfileFields();
  render();
}

async function saveProgress(showMessage = false) {
  state.updatedAt = new Date().toISOString();
  const saved = await writeStored(storageKey(), state);
  if (showMessage) showToast(saved ? 'Progresso guardado neste navegador.' : 'O navegador bloqueou o armazenamento. Tenta sair do modo privado.');
  return saved;
}

function showToast(message) {
  const el = $('lab-toast');
  el.textContent = message;
  el.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-visible'), 3000);
}

const voiceAvailable = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let voiceEnabled = localStorage.getItem('w69-codelab:mrzinho-voice') !== 'off';
let voicePreference = localStorage.getItem('w69-codelab:mrzinho-voice-name') || 'auto';
let lastMrzinhoText = '';
function availablePortugueseVoices() {
  if (!voiceAvailable) return [];
  return window.speechSynthesis.getVoices().filter((voice) => /^pt(?:-|$)/i.test(voice.lang));
}
function voiceScore(voice) {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = lang.startsWith('pt-pt') ? 40 : lang.startsWith('pt-br') ? 35 : 25;
  if (/natural|neural|premium|enhanced|google|microsoft|siri/.test(name)) score += 30;
  if (/male|femin|female/.test(name)) score += 2;
  if (/compact|espeak|default/.test(name)) score -= 8;
  return score;
}
function preferredVoice() {
  const voices = availablePortugueseVoices();
  if (!voices.length) return null;
  if (voicePreference !== 'auto') return voices.find((voice) => `${voice.name}|${voice.lang}` === voicePreference) || voices[0];
  return [...voices].sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}
function spokenMrzinhoText(text) {
  return text
    .replace(/\bMrzinho\b/gi, 'Misterzinho')
    .replace(/\bCodeLab\b/gi, 'Code Lab')
    .replace(/\bJavaScript\b/gi, 'Java Script')
    .replace(/\bPython\b/gi, 'Páiton')
    .replace(/\bC\+\+\b/g, 'C mais mais')
    .replace(/\bHTML\b/gi, 'H T M L')
    .replace(/\bCSS\b/gi, 'C S S')
    .replace(/\bDOM\b/gi, 'D O M')
    .replace(/\bAPI\b/gi, 'A P I')
    .replace(/\bURL\b/gi, 'U R L')
    .replace(/\bUI\b/gi, 'interface')
    .replace(/\s+/g, ' ')
    .trim();
}
function speakMrzinho(text = lastMrzinhoText) {
  if (!voiceAvailable || !voiceEnabled || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(spokenMrzinhoText(text));
  utterance.lang = preferredVoice()?.lang || 'pt-PT';
  utterance.rate = 0.88;
  utterance.pitch = 0.94;
  utterance.volume = 1;
  const voice = preferredVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}
function populateVoiceSelector() {
  const select = $('mrzinho-voice-select');
  if (!select || !voiceAvailable) return;
  const voices = availablePortugueseVoices();
  const options = [`<option value="auto">automática · melhor disponível</option>`, ...voices.map((voice) => {
    const value = `${voice.name}|${voice.lang}`;
    return `<option value="${escapeHtml(value)}">${escapeHtml(voice.name)} · ${escapeHtml(voice.lang)}</option>`;
  })];
  select.innerHTML = options.join('');
  select.value = voicePreference;
  if (select.value !== voicePreference) { voicePreference = 'auto'; select.value = 'auto'; }
}
function updateVoiceControl() {
  const button = $('mrzinho-voice');
  if (!button) return;
  button.setAttribute('aria-pressed', String(voiceEnabled));
  button.innerHTML = `<span>${voiceEnabled ? '●' : '○'}</span> ${voiceEnabled ? 'voz ativa' : 'voz pausada'}`;
  $('mrzinho')?.classList.toggle('voice-off', !voiceEnabled);
  populateVoiceSelector();
}
if (voiceAvailable) window.speechSynthesis.addEventListener('voiceschanged', populateVoiceSelector);
function assistantSay(text, { speak = true } = {}) {
  lastMrzinhoText = text;
  const message = $('mrzinho-message');
  if (message) message.textContent = text;
  $('mrzinho')?.classList.add('is-talking');
  window.clearTimeout(window.__mrzinhoTalkingTimer);
  window.__mrzinhoTalkingTimer = window.setTimeout(() => $('mrzinho')?.classList.remove('is-talking'), 1800);
  if (speak) speakMrzinho(text);
}

function currentLessonHelp() {
  if (!activeLesson) return 'Escolhe uma missão e eu explico o primeiro passo. Não precisas saber tudo antes de começar.';
  const language = activeLesson.language === 'python' ? 'Python' : activeLesson.language === 'javascript' ? 'JavaScript' : activeLesson.language === 'cpp' ? 'C++' : 'lógica';
  return `${activeLesson.title}: começa por identificar o que a missão pede, faz uma alteração pequena e executa. Em ${language}, a melhor estratégia é testar, observar a saída e ajustar sem pressa.`;
}

function buildLessonExplanation(lesson) {
  const language = lesson.language === 'python' ? 'Python' : lesson.language === 'javascript' ? 'JavaScript' : lesson.language === 'cpp' ? 'C++' : 'lógica de programação';
  const common = lesson.kind === 'choice' ? 'Erro comum: escolher depressa sem traduzir a regra para passos. Lê a pergunta como se estivesses a ensinar outra pessoa.' : `Erro comum: mudar muitas coisas ao mesmo tempo. Em ${language}, altera uma linha, executa e usa a saída como pista.`;
  return `<p>${escapeHtml(lesson.lesson)}</p><div class="explain-steps"><div><strong>Como pensar</strong><span>Divide o desafio em entrada, decisão e resultado. Pergunta: “o que já está pronto e o que falta eu completar?”</span></div><div><strong>Na prática</strong><span>${escapeHtml(lesson.objective)} O objetivo não é decorar: é reconhecer a ideia quando voltares a encontrá-la.</span></div><div class="explain-warning"><strong>O Mrzinho avisa</strong><span>${escapeHtml(common)}</span></div></div>`;
}

function lessonExample(lesson) {
  if (lesson.solution) return lesson.solution;
  if (lesson.language === 'cpp') return 'int pontos = 8;\ncout << pontos + 4 << endl;';
  if (lesson.language === 'python') return 'mensagem = "Olá!"\nprint(mensagem)';
  if (lesson.kind === 'choice') return '1. Ler a regra\n2. Identificar a condição\n3. Escolher o caminho correto';
  return 'console.log("Olá, futuro programador!");';
}

function highlightCode(source = '') {
  let html = escapeHtml(source);
  html = html.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|".*?"|'.*?')/g, '<span class="syntax-string">$1</span>');
  html = html.replace(/\b(var|let|const|if|else|for|in|true|false|def|return|int|print|cout|using|namespace)\b/g, '<span class="syntax-keyword">$1</span>');
  html = html.replace(/\b(console|log|range|endl)\b/g, '<span class="syntax-function">$1</span>');
  html = html.replace(/(\/\/.*|#.*)/g, '<span class="syntax-comment">$1</span>');
  return html;
}

function renderMrzinhoClass(lesson) {
  const example = $('lesson-class-example');
  const copy = $('lesson-class-copy');
  if (!example || !copy) return;
  const language = lesson.language === 'python' ? 'Python' : lesson.language === 'cpp' ? 'C++' : lesson.language === 'javascript' ? 'JavaScript' : 'lógica';
  copy.textContent = `Antes de resolver, vamos observar uma ideia em ${language}. Eu mostro um exemplo, explico cada parte e só depois passas ao quadro.`;
  example.innerHTML = `<span class="example-label">EXEMPLO DO PROFESSOR · ${language.toUpperCase()}</span><pre><code>${highlightCode(lessonExample(lesson))}</code></pre><p>${escapeHtml(lesson.lesson)}</p>`;
  example.hidden = false;
  $('lesson-ready-button').textContent = 'Já sei · Resolver agora →';
}

function reflectProfileFields() {
  $('profile-name').value = state.profile?.name || '';
  $('profile-goal').value = state.profile?.goal || 'games';
  selectedAvatar = state.profile?.avatar || '🦊';
  document.querySelectorAll('.avatar-option').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.avatar === selectedAvatar);
  });
}

function render() {
  const hasProfile = Boolean(state.profile);
  $('lab-path').hidden = hasProfile;
  $('dashboard').hidden = !hasProfile;
  $('lesson-workspace').hidden = true;
  $('onboarding-card').hidden = false;
  if (hasProfile) renderDashboard();
}

function renderDiagnostic() {
  $('diagnostic-list').innerHTML = placementQuestions.map((item, index) => `
    <fieldset class="diagnostic-question"><legend>${index + 1}. ${escapeHtml(item.question)}</legend>
      <div class="diagnostic-options">${item.options.map((option, optionIndex) => `
        <label class="diagnostic-option"><input type="radio" name="${escapeHtml(item.id)}" value="${optionIndex}"><span>${escapeHtml(option)}</span></label>`).join('')}
        <label class="diagnostic-option"><input type="radio" name="${escapeHtml(item.id)}" value="skip"><span>Ainda não sei</span></label>
      </div>
    </fieldset>`).join('');
}

function getTrack(trackId) { return tracks.find((track) => track.id === trackId) || tracks[0]; }
function countCompleted(track) { return track.lessons.filter((lesson) => state.completed.includes(lesson.id)).length; }
function totalCompleted() { return new Set(state.completed).size; }

function languageBadge(language, compact = false) {
  const config = {
    javascript: ['javascript', 'devicon-javascript-plain', 'JavaScript'],
    python: ['python', 'devicon-python-plain', 'Python'],
    cpp: ['cpp', 'devicon-cplusplus-plain', 'C++'],
    logic: ['logic', 'devicon-flowchart-plain', 'Lógica']
  }[language] || ['logic', 'devicon-git-plain', 'Lógica'];
  return `<span class="language-mark ${config[0]}" aria-label="${config[2]}"><i class="${config[1]}" aria-hidden="true"></i>${compact ? '' : `<span>${config[2]}</span>`}</span>`;
}

function trackLanguage(track) { return track.id === 'javascript' ? 'javascript' : track.id === 'python' ? 'python' : track.id === 'cpp' ? 'cpp' : 'logic'; }

function renderDashboard() {
  const name = state.profile?.name?.trim() || 'explorador';
  $('student-name').textContent = name;
  $('student-avatar').textContent = state.profile?.avatar || '🦊';
  $('completed-count').textContent = String(totalCompleted());
  $('xp-total').textContent = String(totalCompleted() * 25);
  $('progress-summary').textContent = `${totalCompleted()} ${totalCompleted() === 1 ? 'missão concluída' : 'missões concluídas'}`;
  const total = tracks.reduce((sum, track) => sum + track.lessons.length, 0);
  $('overall-progress').style.width = `${Math.min(100, Math.round(totalCompleted() / total * 100))}%`;
  const recommended = getTrack(state.recommendedTrack);
  $('recommendation-copy').textContent = state.diagnosticScore === null
    ? 'Escolhe uma trilha e começa pela missão que te chamar.'
    : `Pelo teu check-in, sugerimos começar por ${recommended.title}. Podes mudar de caminho quando quiseres.`;
  renderTracks();
  renderDailyMission();
  $('workspace-save').textContent = 'Guardar no navegador';
}

function renderTracks() {
  $('track-grid').innerHTML = tracks.map((track) => {
    const completed = countCompleted(track);
    const percent = Math.round(completed / track.lessons.length * 100);
    return `<article class="track-card">
      <div class="track-card-top"><span class="track-icon">${languageBadge(trackLanguage(track))}</span><span class="track-level">${escapeHtml(track.level)}</span></div>
      <h3>${escapeHtml(track.title)}</h3><span class="track-subtitle">${escapeHtml(track.subtitle)}</span>
      <p>${escapeHtml(track.description)}</p>
      <div class="track-card-bottom"><span>${completed}/${track.lessons.length} missões</span><strong>${percent}% · ${track.minutes} min</strong></div>
      <button class="track-open" type="button" data-track="${escapeHtml(track.id)}"><span>Explorar trilha</span><span>→</span></button>
    </article>`;
  }).join('');
}

function renderDailyMission() {
  const allLessons = tracks.flatMap((track) => track.lessons.map((lesson) => ({ ...lesson, trackId: track.id })));
  const available = allLessons.filter((lesson) => !state.completed.includes(lesson.id));
  const pool = available.length ? available : allLessons;
  const index = new Date().getDay() % pool.length;
  const mission = pool[index];
  $('daily-title').textContent = mission.title;
  $('daily-description').textContent = `${getTrack(mission.trackId).title} · ${mission.duration} min. Sem sequência obrigatória; continua à tua espera quando quiseres.`;
  $('daily-start').onclick = () => openLesson(mission.trackId, mission.id);
}

function openTrack(trackId) {
  selectedTrack = trackId;
  const track = getTrack(trackId);
  $('lessons-panel').hidden = false;
  $('lessons-kicker').textContent = `TRILHA / ${track.level.toUpperCase()}`;
  $('lessons-title').textContent = `Escolhe uma missão de ${track.title}`;
  $('lessons-intro').textContent = track.description;
  $('lesson-list').innerHTML = track.lessons.map((lesson, index) => {
    const complete = state.completed.includes(lesson.id);
    const language = lesson.kind === 'choice' && !lesson.language ? 'logic' : lesson.language;
    const kind = lesson.language === 'cpp' ? 'C++ · leitura guiada' : lesson.kind === 'choice' ? 'Lógica' : lesson.language === 'python' ? 'Python' : 'JavaScript';
    return `<article class="lesson-row ${complete ? 'is-complete' : ''}">
      <span class="lesson-number">${complete ? '✓' : String(index + 1).padStart(2, '0')}</span>
      <div><h3>${escapeHtml(lesson.title)}</h3><p>${languageBadge(language, true)} <span>${escapeHtml(lesson.objective)} · ${kind}</span></p></div>
      <span class="lesson-time">${lesson.duration} MIN</span>
      <button class="lesson-open" type="button" data-lesson="${escapeHtml(lesson.id)}">${complete ? 'Rever' : 'Começar'}</button>
    </article>`;
  }).join('');
  document.querySelectorAll('[data-lesson]').forEach((button) => button.addEventListener('click', () => openLesson(trackId, button.dataset.lesson)));
  $('lessons-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openLesson(trackId, lessonId) {
  const track = getTrack(trackId);
  const lesson = track.lessons.find((item) => item.id === lessonId);
  if (!lesson) return;
  selectedTrack = trackId;
  activeLesson = { ...lesson, trackId };
  currentHint = 0;
  lessonReady = false;
  $('dashboard').hidden = true;
  $('lesson-workspace').hidden = false;
  $('workspace-progress').textContent = `${track.title.toUpperCase()} · ${lesson.duration} MIN`;
  $('lesson-meta').textContent = `MISSÃO · ${lesson.duration} MIN · ${lesson.language === 'cpp' ? 'C++ GUIADO' : lesson.kind === 'choice' ? 'LÓGICA' : lesson.language.toUpperCase()}`;
  $('lesson-title').textContent = lesson.title;
  $('lesson-story').textContent = lesson.story;
  $('lesson-explanation').innerHTML = buildLessonExplanation(lesson);
  renderMrzinhoClass(lesson);
  $('mission-objective').textContent = lesson.objective;
  $('mission-icon').innerHTML = languageBadge(lesson.kind === 'choice' ? 'logic' : lesson.language);
  $('mission-kind').textContent = lesson.language === 'cpp' ? 'DESAFIO C++ · LEITURA' : lesson.kind === 'choice' ? 'DESAFIO DE LÓGICA' : `PRÁTICA ${lesson.language.toUpperCase()}`;
  $('lesson-feedback').hidden = true;
  $('lesson-feedback').className = 'feedback-box';
  $('lesson-feedback').textContent = '';
  $('hint-content').hidden = true;
  $('hint-content').textContent = '';
  $('hint-button').textContent = `Dica 1 / ${lesson.hints.length}`;
  $('solution-button').textContent = 'Ver uma solução';
  $('complete-lesson').hidden = !state.completed.includes(lesson.id);
  $('complete-lesson').textContent = state.completed.includes(lesson.id) ? 'Missão já concluída ✓' : 'Missão concluída';
  $('complete-lesson').onclick = finishLesson;
  $('hint-button').onclick = revealHint;
  $('solution-button').onclick = revealSolution;
  renderChallenge(lesson);
  $('lesson-ready-button').onclick = () => { lessonReady = true; $('challenge-area').classList.remove('is-locked'); $('challenge-area').removeAttribute('aria-disabled'); $('lesson-ready-button').textContent = 'Vamos resolver ↓'; assistantSay('Muito bem. Agora é a tua vez: aplica o que acabámos de ver.', { speak: true }); $('challenge-area').scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  $('lesson-example-button').onclick = () => { $('lesson-class-example').hidden = false; assistantSay('Repara nesta parte do exemplo. Não precisas decorar: observa a ideia e depois tenta com as tuas palavras.', { speak: true }); };
  assistantSay(`Boa escolha. Primeiro temos uma mini-aula: vou explicar ${lesson.objective} e mostrar um exemplo.`, { speak: true });
  $('lesson-workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderChallenge(lesson) {
  const area = $('challenge-area');
  area.classList.add('is-locked');
  area.setAttribute('aria-disabled', 'true');
  if (lesson.kind === 'choice') {
    area.innerHTML = `<p class="challenge-prompt">${escapeHtml(lesson.prompt)}</p><div class="challenge-options">${lesson.options.map((option, index) => `
      <label class="challenge-option"><input type="radio" name="mission-answer" value="${index}"><span>${escapeHtml(option)}</span></label>`).join('')}
    </div><button class="button button-primary check-choice" id="check-choice" type="button">Verificar resposta <span>→</span></button>`;
    $('check-choice').addEventListener('click', () => {
      const selected = document.querySelector('input[name="mission-answer"]:checked');
      if (!selected) return showFeedback('Escolhe uma opção. Não há nota — é só uma forma de começar a pensar.', false);
      const correct = lesson.options[Number(selected.value)] === lesson.answer;
      showFeedback(correct ? lesson.success : 'Ainda não. Lê a ideia rápida, experimenta uma dica e tenta outra vez.', correct);
    });
    return;
  }

  const savedDraft = state.drafts?.[lesson.id];
  area.innerHTML = `<p class="challenge-prompt">${escapeHtml(lesson.prompt)}</p>
    <label class="field-caption" for="code-editor">O TEU CÓDIGO · AGORA ÉS TU</label>
    <div class="syntax-editor"><pre class="code-highlight" id="code-highlight" aria-hidden="true"></pre><textarea class="code-editor" id="code-editor" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Editor de código"></textarea></div>
    <div class="editor-toolbar"><span class="editor-language">${languageBadge(lesson.language, true)} execução isolada · Ctrl/Cmd + Enter</span><div><button class="text-button editor-reset" id="reset-code" type="button">Repor exemplo</button><button class="run-button" id="run-code" type="button"><span aria-hidden="true">▶</span> Executar e verificar</button></div></div>
    <pre class="code-output" id="code-output" aria-live="polite">A saída do teu programa aparece aqui.</pre>`;
  $('code-editor').value = typeof savedDraft === 'string' ? savedDraft : lesson.starter;
  updateCodeHighlight();
  let draftTimer = 0;
  $('code-editor').addEventListener('input', () => {
    state.drafts[lesson.id] = $('code-editor').value.slice(0, 5000);
    updateCodeHighlight();
    window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(() => saveProgress(), 350);
  });
  $('code-editor').addEventListener('scroll', () => { $('code-highlight').scrollTop = $('code-editor').scrollTop; $('code-highlight').scrollLeft = $('code-editor').scrollLeft; });
  $('code-editor').addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = event.target.selectionStart;
      const end = event.target.selectionEnd;
      event.target.setRangeText('  ', start, end, 'end');
      event.target.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      $('run-code').click();
    }
  });
  $('reset-code').addEventListener('click', () => {
    $('code-editor').value = lesson.starter;
    state.drafts[lesson.id] = lesson.starter;
    saveProgress();
    showOutput('Exemplo reposto. Agora experimenta mudar uma linha.');
    $('code-editor').focus();
  });
  $('run-code').addEventListener('click', () => {
    if (lesson.language === 'python') runPythonChallenge(lesson);
    else runJavaScriptChallenge(lesson);
  });
}

function showOutput(text, kind = '') {
  const output = $('code-output');
  output.textContent = text || '(sem saída)';
  output.classList.toggle('is-success', kind === 'success');
  output.classList.toggle('is-error', kind === 'error');
}

function normalizedOutput(value) { return String(value ?? '').replace(/\r/g, '').trim(); }

function outputMatches(lesson, output) {
  return normalizedOutput(output) === normalizedOutput(lesson.expected);
}

function runJavaScriptChallenge(lesson) {
  const button = $('run-code');
  const source = $('code-editor').value;
  if (!source.trim()) return showOutput('Escreve uma instrução antes de executar.', 'error');
  if (source.length > 5000) return showOutput('Este desafio aceita até 5.000 caracteres.', 'error');
  button.disabled = true;
  button.innerHTML = '<span aria-hidden="true">◌</span> A executar…';
  showOutput('A preparar o interpretador seguro…');
  let worker;
  let settled = false;
  const finish = (message, result = false, output = '') => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    worker?.terminate();
    button.disabled = false;
    button.innerHTML = '<span aria-hidden="true">▶</span> Executar e verificar';
    showOutput(message, result ? 'success' : (output ? '' : 'error'));
    if (result) showFeedback(lesson.success, true);
  };
  const timer = window.setTimeout(() => finish('O código demorou demasiado. Revê ciclos e condições e tenta outra vez.'), 3000);
  try {
    worker = new Worker(new URL('./codelab-runner.js', import.meta.url));
    worker.onmessage = ({ data }) => {
      if (data.runId !== 'student-run') return;
      if (data.type === 'error') return finish(data.message || 'Não foi possível executar o código.');
      const output = normalizedOutput(data.output);
      if (outputMatches(lesson, output)) finish(output || '(sem saída)', true, output);
      else finish(output || '(sem saída)', false, output);
      if (!outputMatches(lesson, output)) showFeedback('O programa executou, mas a saída ainda não corresponde ao objetivo. Experimenta uma dica e ajusta o código.', false);
    };
    worker.onerror = () => finish('O executor foi interrompido. Atualiza a página e tenta novamente.');
    worker.postMessage({ type: 'run', runId: 'student-run', source });
  } catch (_) {
    finish('O navegador não conseguiu iniciar o executor. Confere se o site está aberto por HTTPS.');
  }
}

function runPythonChallenge(lesson) {
  const button = $('run-code');
  const source = $('code-editor').value;
  if (!source.trim()) return showOutput('Escreve uma instrução antes de executar.', 'error');
  if (source.length > 5000) return showOutput('Este desafio aceita até 5.000 caracteres.', 'error');
  button.disabled = true;
  button.innerHTML = '<span aria-hidden="true">◌</span> A carregar Python…';
  showOutput('A primeira execução pode demorar um pouco enquanto o Python é carregado.');
  const frame = document.createElement('iframe');
  frame.title = 'Executor Python isolado';
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  Object.assign(frame.style, { position: 'fixed', left: '-10000px', bottom: '0', width: '1px', height: '1px', border: '0', opacity: '0', pointerEvents: 'none' });
  const nonce = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  let sent = false;
  let settled = false;
  const finish = (message, success = false, output = '') => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    window.removeEventListener('message', onMessage);
    frame.remove();
    button.disabled = false;
    button.innerHTML = '<span aria-hidden="true">▶</span> Executar e verificar';
    showOutput(message, success ? 'success' : (output ? '' : 'error'));
    if (success) showFeedback(lesson.success, true);
    else if (output) showFeedback('O programa correu, mas a saída ainda não corresponde ao objetivo. Experimenta uma dica.', false);
  };
  const onMessage = (event) => {
    if (event.source !== frame.contentWindow || !event.data || typeof event.data !== 'object') return;
    const data = event.data;
    if (data.type === 'ready' && !sent) {
      sent = true;
      button.innerHTML = '<span aria-hidden="true">◌</span> A executar Python…';
      frame.contentWindow.postMessage({ type: 'run', nonce, source }, '*');
      return;
    }
    if (data.type === 'boot-error') return finish(data.message || 'Não foi possível carregar Python.');
    if (data.nonce !== nonce) return;
    if (data.type === 'run-error') return finish(`Python: ${String(data.message || 'erro').slice(0, 500)}`);
    if (data.type === 'result') {
      const output = normalizedOutput(data.output);
      if (outputMatches(lesson, output)) finish(output || '(sem saída)', true, output);
      else finish(output || '(sem saída)', false, output);
    }
  };
  window.addEventListener('message', onMessage);
  const timer = window.setTimeout(() => finish('A execução demorou demasiado e foi terminada. Revê o código e tenta outra vez.'), 90000);
  frame.src = new URL('./codelab-python-sandbox.html', location.href).href;
  document.body.appendChild(frame);
}

function showFeedback(message, success) {
  const feedback = $('lesson-feedback');
  feedback.hidden = false;
  feedback.className = `feedback-box ${success ? 'is-success' : 'is-retry'}`;
  feedback.textContent = message;
  assistantSay(success ? `Muito bem! ${message}` : `Está tudo bem. ${message}`, { speak: true });
  if (success) {
    $('complete-lesson').hidden = false;
    $('complete-lesson').textContent = state.completed.includes(activeLesson.id) ? 'Missão já concluída ✓' : 'Guardar missão concluída · +25 XP';
  }
}

function revealHint() {
  if (!activeLesson) return;
  const hintBox = $('hint-content');
  if (currentHint < activeLesson.hints.length) {
    hintBox.textContent = activeLesson.hints[currentHint];
    currentHint += 1;
    $('hint-button').textContent = currentHint < activeLesson.hints.length ? `Dica ${currentHint + 1} / ${activeLesson.hints.length}` : 'Dicas usadas';
    hintBox.hidden = false;
    assistantSay(`Aqui vai uma pista: ${activeLesson.hints[currentHint - 1]}`, { speak: true });
  } else {
    hintBox.textContent = 'Já viste todas as dicas. Experimenta resolver em passos pequenos — ou consulta uma solução para aprender com ela.';
    hintBox.hidden = false;
    assistantSay(`Pensa em passos pequenos. ${hintBox.textContent}`, { speak: true });
  }
}

function revealSolution() {
  if (!activeLesson) return;
  const hintBox = $('hint-content');
  hintBox.replaceChildren();
  if (activeLesson.solution) {
    const label = document.createElement('span');
    label.textContent = 'Uma solução possível:';
    const code = document.createElement('pre');
    code.textContent = activeLesson.solution;
    hintBox.append(label, code);
  } else {
    hintBox.textContent = `Resposta sugerida: ${activeLesson.answer}`;
  }
  hintBox.hidden = false;
}

async function finishLesson() {
  if (!activeLesson) return;
  if (!state.completed.includes(activeLesson.id)) {
    state.completed.push(activeLesson.id);
    await saveProgress();
    showToast('Missão guardada · +25 XP. Bom trabalho.');
  } else {
    showToast('Esta missão já está guardada no teu progresso.');
  }
  renderDashboard();
  $('lesson-workspace').hidden = true;
  $('dashboard').hidden = false;
  openTrack(selectedTrack);
  $('lessons-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bindEvents() {
  document.querySelectorAll('.avatar-option').forEach((button) => button.addEventListener('click', () => {
    selectedAvatar = button.dataset.avatar;
    document.querySelectorAll('.avatar-option').forEach((item) => item.classList.toggle('is-selected', item === button));
  }));

  $('to-diagnostic').addEventListener('click', () => {
    state.profile = { name: $('profile-name').value.trim().slice(0, 24), avatar: selectedAvatar, goal: $('profile-goal').value };
    $('setup-profile').hidden = true;
    $('setup-diagnostic').hidden = false;
    $('setup-progress').style.width = '100%';
    renderDiagnostic();
  });
  $('back-profile').addEventListener('click', () => {
    $('setup-diagnostic').hidden = true;
    $('setup-profile').hidden = false;
    $('setup-progress').style.width = '50%';
  });
  $('finish-setup').addEventListener('click', async () => {
    let score = 0;
    placementQuestions.forEach((question) => {
      const answer = document.querySelector(`input[name="${question.id}"]:checked`);
      if (answer && answer.value !== 'skip' && Number(answer.value) === question.answer) score += 1;
    });
    const goal = $('profile-goal').value;
    const trackByGoal = { web: 'javascript', games: 'javascript', automation: 'python', data: 'python', curious: 'logic' };
    state.profile = { name: $('profile-name').value.trim().slice(0, 24), avatar: selectedAvatar, goal, level: score <= 1 ? 'começo' : score <= 3 ? 'bases' : 'desafios' };
    state.diagnosticScore = score;
    state.recommendedTrack = score <= 1 ? 'logic' : trackByGoal[goal] || 'logic';
    await saveProgress();
    $('setup-profile').hidden = false;
    $('setup-diagnostic').hidden = true;
    $('setup-progress').style.width = '50%';
    render();
    $('dashboard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('O teu caminho está preparado. Podes mudar de trilha quando quiseres.');
    assistantSay(`Perfeito, ${state.profile.name || 'explorador'}! Já tenho um caminho para ti. Começa por uma missão curta e deixa a prática ensinar-te.`, { speak: true });
  });
  $('edit-profile').addEventListener('click', () => {
    reflectProfileFields();
    $('dashboard').hidden = true;
    $('lab-path').hidden = false;
    $('setup-profile').hidden = false;
    $('setup-diagnostic').hidden = true;
    $('setup-progress').style.width = '50%';
    $('to-diagnostic').textContent = 'Atualizar perfil →';
    $('lab-path').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('track-grid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-track]');
    if (button) openTrack(button.dataset.track);
  });
  $('back-tracks').addEventListener('click', () => {
    $('lessons-panel').hidden = true;
    $('track-grid').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('exit-lesson').addEventListener('click', () => {
    $('lesson-workspace').hidden = true;
    $('dashboard').hidden = false;
    renderDashboard();
    openTrack(selectedTrack);
  });
  $('workspace-save').addEventListener('click', () => saveProgress(true));
  $('mrzinho-toggle').addEventListener('click', () => {
    const widget = $('mrzinho');
    const open = widget.classList.toggle('is-collapsed') === false;
    $('mrzinho-toggle').setAttribute('aria-expanded', String(open));
  });
  $('mrzinho-speak').addEventListener('click', () => speakMrzinho());
  $('mrzinho-voice-select')?.addEventListener('change', (event) => { voicePreference = event.target.value || 'auto'; localStorage.setItem('w69-codelab:mrzinho-voice-name', voicePreference); assistantSay('Voz do Misterzinho atualizada. Ouve novamente para comparar o novo tom.', { speak: true }); });
  $('mrzinho-hint').addEventListener('click', () => {
    if (activeLesson) revealHint();
    else assistantSay('Ainda estamos a preparar o teu caminho. Diz-me o teu nome, escolhe um avatar e responde sem medo ao check-in.');
  });
  $('mrzinho-voice').addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    localStorage.setItem('w69-codelab:mrzinho-voice', voiceEnabled ? 'on' : 'off');
    if (!voiceEnabled && voiceAvailable) window.speechSynthesis.cancel();
    updateVoiceControl();
    assistantSay(voiceEnabled ? 'A minha voz está ativa. Vou falar quando houver uma pista importante.' : 'Voz pausada. Continuo aqui por texto sempre que precisares.', { speak: voiceEnabled });
  });
}


bindEvents();
updateVoiceControl();
loadProgress().catch(() => render());
window.setTimeout(() => assistantSay('Olá! Sou o Mrzinho. Não precisas chegar preparado: escolhe um pequeno passo e eu ajudo-te a continuar.', { speak: false }), 450);

// Read-only QA hook: the student area is intentionally local-only.
window.__world69CodelabReady = Promise.resolve({
  tracks: tracks.length,
  lessonCount: tracks.reduce((sum, track) => sum + track.lessons.length, 0),
  storage: 'indexeddb-with-localstorage-fallback',
  auth: false
});


function updateCodeHighlight() {
  const editor = $('code-editor');
  const highlight = $('code-highlight');
  if (editor && highlight) highlight.innerHTML = `${highlightCode(editor.value)}\n`;
}


const teacherLessons = {
  "javascript": {
    "label": "JAVASCRIPT",
    "steps": [
      {
        "title": "O mapa da linguagem",
        "copy": "Começamos pela sintaxe que todos os programas usam: valores, nomes e ações.",
        "code": [
          "const nome = \"Kito\";",
          "console.log(nome);"
        ],
        "focus": 1,
        "focusLabel": "mostrar um valor",
        "explanation": "const cria um nome que aponta para um valor; console.log torna o valor visível."
      },
      {
        "title": "Escolher entre const e let",
        "copy": "Usa const quando a ligação não muda e let quando precisas atualizar o valor.",
        "code": [
          "let pontos = 10;",
          "pontos += 5;",
          "console.log(pontos);"
        ],
        "focus": 1,
        "focusLabel": "atualizar uma variável",
        "explanation": "A variável continua a ser o mesmo nome, mas o valor passa de 10 para 15."
      },
      {
        "title": "Tipos e conversões",
        "copy": "Texto, número e booleano comportam-se de formas diferentes.",
        "code": [
          "const idadeTexto = \"18\";",
          "const idade = Number(idadeTexto);",
          "console.log(idade + 1);"
        ],
        "focus": 1,
        "focusLabel": "converter dados",
        "explanation": "Number transforma o texto em número para que a soma seja matemática, não concatenação."
      },
      {
        "title": "Comparar com segurança",
        "copy": "Uma condição responde a uma pergunta verdadeira ou falsa.",
        "code": [
          "const saldo = 20;",
          "if (saldo >= 10) {",
          "  console.log(\"Pode comprar\");",
          "}"
        ],
        "focus": 1,
        "focusLabel": "comparar valores",
        "explanation": ">= inclui o limite. O bloco só corre quando a comparação é verdadeira."
      },
      {
        "title": "Criar caminhos alternativos",
        "copy": "else trata o caso em que a primeira condição falha.",
        "code": [
          "if (saldo >= 10) {",
          "  console.log(\"Comprar\");",
          "} else {",
          "  console.log(\"Poupar\");",
          "}"
        ],
        "focus": 0,
        "focusLabel": "decidir",
        "explanation": "O programa tem agora dois caminhos e escolhe exatamente um deles."
      },
      {
        "title": "Repetir com for",
        "copy": "Um ciclo tem início, condição e atualização.",
        "code": [
          "for (let i = 1; i <= 3; i++) {",
          "  console.log(i);",
          "}"
        ],
        "focus": 0,
        "focusLabel": "controlar um ciclo",
        "explanation": "O contador começa em 1, repete até 3 e avança no fim de cada volta."
      },
      {
        "title": "Guardar listas",
        "copy": "Arrays guardam vários valores numa ordem.",
        "code": [
          "const cores = [\"verde\", \"azul\"];",
          "cores.push(\"amarelo\");",
          "console.log(cores[0]);"
        ],
        "focus": 1,
        "focusLabel": "alterar uma lista",
        "explanation": "push acrescenta ao fim; o índice zero aponta para o primeiro elemento."
      },
      {
        "title": "Transformar listas",
        "copy": "map cria uma nova lista aplicando uma função a cada item.",
        "code": [
          "const numeros = [1, 2, 3];",
          "const dobro = numeros.map(n => n * 2);",
          "console.log(dobro);"
        ],
        "focus": 1,
        "focusLabel": "mapear dados",
        "explanation": "A arrow function recebe cada n e devolve o valor transformado."
      },
      {
        "title": "Filtrar resultados",
        "copy": "filter conserva apenas os itens que passam numa regra.",
        "code": [
          "const idades = [12, 18, 25];",
          "const adultos = idades.filter(idade => idade >= 18);",
          "console.log(adultos);"
        ],
        "focus": 1,
        "focusLabel": "filtrar dados",
        "explanation": "A condição é testada em cada item e apenas os valores verdadeiros entram na nova lista."
      },
      {
        "title": "Objetos e propriedades",
        "copy": "Objetos agrupam dados com nomes que explicam o seu significado.",
        "code": [
          "const aluno = { nome: \"Kito\", xp: 40 };",
          "aluno.xp += 10;",
          "console.log(aluno.xp);"
        ],
        "focus": 1,
        "focusLabel": "atualizar uma propriedade",
        "explanation": "O ponto acede a uma propriedade; o objeto mantém nome e xp ligados."
      },
      {
        "title": "Funções reutilizáveis",
        "copy": "Uma função recebe parâmetros e devolve uma resposta.",
        "code": [
          "function somar(a, b) {",
          "  return a + b;",
          "}",
          "console.log(somar(2, 3));"
        ],
        "focus": 1,
        "focusLabel": "devolver um resultado",
        "explanation": "return termina a função e entrega a soma para quem chamou."
      },
      {
        "title": "Escopo e estado",
        "copy": "Um nome criado dentro de uma função não deve vazar para todo o programa.",
        "code": [
          "function criarMensagem(nome) {",
          "  const texto = \"Olá, \" + nome;",
          "  return texto;",
          "}"
        ],
        "focus": 1,
        "focusLabel": "proteger o escopo",
        "explanation": "texto só existe dentro da função, o que evita colisões acidentais."
      },
      {
        "title": "A página é um documento",
        "copy": "O DOM permite encontrar elementos reais da página.",
        "code": [
          "const titulo = document.querySelector(\"h1\");",
          "titulo.textContent = \"Aprender fazendo\";"
        ],
        "focus": 0,
        "focusLabel": "selecionar o DOM",
        "explanation": "querySelector devolve o primeiro elemento que corresponde ao seletor."
      },
      {
        "title": "Responder a eventos",
        "copy": "A interface torna-se interativa quando escuta ações do utilizador.",
        "code": [
          "botao.addEventListener(\"click\", () => {",
          "  mensagem.textContent = \"Clicaste!\";",
          "});"
        ],
        "focus": 0,
        "focusLabel": "escutar um clique",
        "explanation": "O callback só é chamado quando o evento acontece."
      },
      {
        "title": "Dados persistentes",
        "copy": "localStorage guarda pequenas preferências no dispositivo.",
        "code": [
          "localStorage.setItem(\"nome\", \"Kito\");",
          "const nome = localStorage.getItem(\"nome\");",
          "console.log(nome);"
        ],
        "focus": 1,
        "focusLabel": "guardar localmente",
        "explanation": "Os valores são strings e permanecem depois de fechar a página."
      },
      {
        "title": "Promessas e await",
        "copy": "Operações de rede terminam mais tarde, por isso o código precisa esperar.",
        "code": [
          "async function carregar() {",
          "  const resposta = await fetch(url);",
          "  return resposta.json();",
          "}"
        ],
        "focus": 1,
        "focusLabel": "aguardar dados",
        "explanation": "await pausa esta função até a Promise resolver, sem congelar a página inteira."
      },
      {
        "title": "Módulos e arquitetura",
        "copy": "Um projeto grande divide responsabilidades em ficheiros menores.",
        "code": [
          "export function formatar(valor) {",
          "  return valor.toFixed(2);",
          "}",
          "import { formatar } from \"./format.js\";"
        ],
        "focus": 0,
        "focusLabel": "reutilizar módulos",
        "explanation": "export publica uma função e import torna a dependência explícita."
      },
      {
        "title": "Projeto final: pensar como profissional",
        "copy": "Agora combina dados, funções, DOM, eventos e estados num pequeno produto.",
        "code": [
          "const tarefas = [];",
          "function adicionar(tarefa) { tarefas.push(tarefa); }",
          "botao.addEventListener(\"click\", () => adicionar(input.value));"
        ],
        "focus": 2,
        "focusLabel": "compor um sistema",
        "explanation": "Um produto nasce de peças pequenas: estado, regras, interface e eventos bem separados."
      }
    ]
  },
  "python": {
    "label": "PYTHON",
    "steps": [
      {
        "title": "O primeiro programa",
        "copy": "Python começa com instruções legíveis e valores simples.",
        "code": [
          "mensagem = \"Olá!\"",
          "print(mensagem)"
        ],
        "focus": 1,
        "focusLabel": "mostrar um valor",
        "explanation": "A variável guarda o texto e print apresenta-o."
      },
      {
        "title": "Tipos e conversões",
        "copy": "Uma entrada de teclado chega como texto e pode precisar de conversão.",
        "code": [
          "idade_texto = \"18\"",
          "idade = int(idade_texto)",
          "print(idade + 1)"
        ],
        "focus": 1,
        "focusLabel": "converter para inteiro",
        "explanation": "int converte texto num número inteiro quando o conteúdo é válido."
      },
      {
        "title": "Condições",
        "copy": "if escolhe um bloco quando uma expressão é verdadeira.",
        "code": [
          "pontos = 12",
          "if pontos >= 10:",
          "    print(\"Nível aberto\")"
        ],
        "focus": 1,
        "focusLabel": "testar uma regra",
        "explanation": "Os dois pontos e a indentação definem o corpo do if."
      },
      {
        "title": "Alternativas",
        "copy": "else cobre o caminho contrário.",
        "code": [
          "if pontos >= 10:",
          "    print(\"Avançar\")",
          "else:",
          "    print(\"Praticar\")"
        ],
        "focus": 0,
        "focusLabel": "criar dois caminhos",
        "explanation": "Apenas o bloco compatível com a condição será executado."
      },
      {
        "title": "Ciclos for",
        "copy": "for visita os valores de uma sequência.",
        "code": [
          "for numero in range(1, 4):",
          "    print(numero)"
        ],
        "focus": 0,
        "focusLabel": "repetir com limite",
        "explanation": "range(1, 4) fornece 1, 2 e 3; o último limite fica de fora."
      },
      {
        "title": "Ciclos while",
        "copy": "while repete enquanto a condição continuar verdadeira.",
        "code": [
          "tentativas = 0",
          "while tentativas < 3:",
          "    tentativas += 1"
        ],
        "focus": 1,
        "focusLabel": "controlar a paragem",
        "explanation": "Atualizar tentativas é essencial para o ciclo terminar."
      },
      {
        "title": "Listas",
        "copy": "Listas guardam uma coleção que pode mudar.",
        "code": [
          "tarefas = [\"estudar\", \"praticar\"]",
          "tarefas.append(\"rever\")",
          "print(tarefas[0])"
        ],
        "focus": 1,
        "focusLabel": "adicionar e indexar",
        "explanation": "append adiciona um item e o índice zero seleciona o primeiro."
      },
      {
        "title": "Dicionários",
        "copy": "Dicionários ligam chaves a valores.",
        "code": [
          "aluno = {\"nome\": \"Kito\", \"xp\": 40}",
          "aluno[\"xp\"] += 10",
          "print(aluno[\"xp\"])"
        ],
        "focus": 1,
        "focusLabel": "usar chave e valor",
        "explanation": "A chave xp identifica o valor que queremos atualizar."
      },
      {
        "title": "Funções",
        "copy": "Funções dão nome a tarefas e recebem dados.",
        "code": [
          "def dobro(numero):",
          "    return numero * 2",
          "print(dobro(4))"
        ],
        "focus": 1,
        "focusLabel": "devolver uma resposta",
        "explanation": "return envia o resultado da função para o código que a chamou."
      },
      {
        "title": "Exceções",
        "copy": "Entradas reais podem falhar e devem receber uma resposta útil.",
        "code": [
          "try:",
          "    idade = int(entrada)",
          "except ValueError:",
          "    print(\"Escreve um número\")"
        ],
        "focus": 2,
        "focusLabel": "tratar erro de entrada",
        "explanation": "except ValueError apanha apenas o erro esperado da conversão."
      },
      {
        "title": "Ficheiros",
        "copy": "with gere automaticamente a abertura e o fecho de um ficheiro.",
        "code": [
          "with open(\"notas.txt\", encoding=\"utf-8\") as arquivo:",
          "    texto = arquivo.read()",
          "print(texto)"
        ],
        "focus": 0,
        "focusLabel": "ler dados locais",
        "explanation": "O contexto with fecha o recurso mesmo se algo correr mal."
      },
      {
        "title": "List comprehensions",
        "copy": "Uma expressão pode criar uma lista transformada com filtro.",
        "code": [
          "pares = [n * 2 for n in range(4)]",
          "print(pares)"
        ],
        "focus": 0,
        "focusLabel": "transformar coleções",
        "explanation": "A expressão percorre n, calcula n*2 e guarda os resultados."
      },
      {
        "title": "Módulos",
        "copy": "Importar módulos permite reutilizar código e a biblioteca padrão.",
        "code": [
          "from math import sqrt",
          "raiz = sqrt(81)",
          "print(raiz)"
        ],
        "focus": 0,
        "focusLabel": "usar uma biblioteca",
        "explanation": "import torna uma ferramenta existente disponível no ficheiro atual."
      },
      {
        "title": "Classes",
        "copy": "Uma classe descreve dados e comportamentos de um tipo de objeto.",
        "code": [
          "class Jogador:",
          "    def __init__(self, nome):",
          "        self.nome = nome"
        ],
        "focus": 0,
        "focusLabel": "modelar objetos",
        "explanation": "self representa o objeto atual; __init__ prepara o seu estado inicial."
      },
      {
        "title": "Iteradores e geradores",
        "copy": "yield produz valores aos poucos, sem criar tudo de uma vez.",
        "code": [
          "def contar(n):",
          "    for i in range(n):",
          "        yield i"
        ],
        "focus": 2,
        "focusLabel": "produzir sob pedido",
        "explanation": "Um gerador pausa em yield e continua quando o próximo valor é pedido."
      },
      {
        "title": "Testar pequenas regras",
        "copy": "Testes automáticos verificam se uma função mantém o contrato.",
        "code": [
          "def somar(a, b):",
          "    return a + b",
          "assert somar(2, 3) == 5"
        ],
        "focus": 2,
        "focusLabel": "proteger comportamento",
        "explanation": "assert transforma uma expectativa em uma verificação executável."
      },
      {
        "title": "Projeto final: dados e automação",
        "copy": "Combina funções, listas, ficheiros e tratamento de erros num pequeno relatório.",
        "code": [
          "def total(valores):",
          "    return sum(valores)",
          "notas = [12, 15, 18]",
          "print(total(notas))"
        ],
        "focus": 0,
        "focusLabel": "compor uma solução",
        "explanation": "Programas úteis combinam dados, funções e respostas claras para falhas."
      }
    ]
  },
  "cpp": {
    "label": "C++",
    "steps": [
      {
        "title": "A forma de um programa",
        "copy": "Em C++, tipos e instruções dizem ao compilador como interpretar o código.",
        "code": [
          "int pontos = 10;",
          "cout << pontos << endl;"
        ],
        "focus": 1,
        "focusLabel": "produzir saída",
        "explanation": "cout envia o valor para a saída e endl termina a linha."
      },
      {
        "title": "Tipos primitivos",
        "copy": "Escolher o tipo evita ambiguidades.",
        "code": [
          "int idade = 18;",
          "double media = 16.5;",
          "bool aprovado = true;"
        ],
        "focus": 0,
        "focusLabel": "declarar tipos",
        "explanation": "int, double e bool representam categorias diferentes de valor."
      },
      {
        "title": "Condições",
        "copy": "if executa uma decisão quando a comparação é verdadeira.",
        "code": [
          "if (pontos >= 10) {",
          "  cout << \"Avançar\" << endl;",
          "}"
        ],
        "focus": 0,
        "focusLabel": "avaliar uma condição",
        "explanation": "As chavetas agrupam o bloco que depende da expressão."
      },
      {
        "title": "Ciclos",
        "copy": "for concentra início, condição e atualização.",
        "code": [
          "for (int i = 0; i < 3; i++) {",
          "  cout << i << endl;",
          "}"
        ],
        "focus": 0,
        "focusLabel": "repetir com contador",
        "explanation": "O ciclo termina quando i deixa de ser menor que 3."
      },
      {
        "title": "Arrays e índices",
        "copy": "Um array guarda valores do mesmo tipo numa sequência fixa.",
        "code": [
          "int notas[3] = {12, 15, 18};",
          "cout << notas[0] << endl;"
        ],
        "focus": 0,
        "focusLabel": "ler uma posição",
        "explanation": "O primeiro elemento tem índice zero."
      },
      {
        "title": "Strings",
        "copy": "Texto precisa de um tipo e de operações próprias.",
        "code": [
          "std::string nome = \"Kito\";",
          "cout << \"Olá, \" << nome << endl;"
        ],
        "focus": 0,
        "focusLabel": "combinar texto",
        "explanation": "std::string representa texto e pode ser enviado para cout."
      },
      {
        "title": "Funções",
        "copy": "Funções dividem o programa e tornam regras reutilizáveis.",
        "code": [
          "int somar(int a, int b) {",
          "  return a + b;",
          "}"
        ],
        "focus": 1,
        "focusLabel": "devolver um valor",
        "explanation": "A assinatura declara o tipo de retorno e os parâmetros."
      },
      {
        "title": "Referências",
        "copy": "Uma referência permite que a função trabalhe com o objeto original.",
        "code": [
          "void ganhar(int& pontos) {",
          "  pontos += 10;",
          "}"
        ],
        "focus": 0,
        "focusLabel": "alterar estado original",
        "explanation": "O & no parâmetro evita uma cópia e liga o nome ao valor original."
      },
      {
        "title": "Structs",
        "copy": "struct agrupa campos relacionados num novo tipo.",
        "code": [
          "struct Ponto {",
          "  double x;",
          "  double y;",
          "};"
        ],
        "focus": 0,
        "focusLabel": "modelar dados",
        "explanation": "Um Ponto reúne coordenadas com nomes claros."
      },
      {
        "title": "Classes e encapsulamento",
        "copy": "private protege o estado e public oferece operações seguras.",
        "code": [
          "class Conta {",
          "private:",
          "  double saldo;",
          "public:",
          "  void depositar(double valor);",
          "};"
        ],
        "focus": 1,
        "focusLabel": "proteger invariantes",
        "explanation": "Nem todo código deve alterar saldo diretamente; a classe controla a regra."
      },
      {
        "title": "Ponteiros",
        "copy": "Um ponteiro guarda um endereço e pode apontar para um valor.",
        "code": [
          "int pontos = 10;",
          "int* referencia = &pontos;",
          "cout << *referencia << endl;"
        ],
        "focus": 1,
        "focusLabel": "seguir um endereço",
        "explanation": "& obtém o endereço e * lê o valor guardado nele."
      },
      {
        "title": "Memória e RAII",
        "copy": "Objetos de biblioteca podem gerir recursos automaticamente.",
        "code": [
          "std::vector<int> notas;",
          "notas.push_back(18);",
          "cout << notas.size();"
        ],
        "focus": 0,
        "focusLabel": "usar recursos seguros",
        "explanation": "vector cresce conforme necessário e gere a sua memória."
      },
      {
        "title": "Templates",
        "copy": "Uma função genérica pode trabalhar com vários tipos.",
        "code": [
          "template <typename T>",
          "T maior(T a, T b) {",
          "  return a > b ? a : b;",
          "}"
        ],
        "focus": 0,
        "focusLabel": "generalizar código",
        "explanation": "T representa um tipo que será escolhido quando a função for usada."
      },
      {
        "title": "Algoritmos da biblioteca",
        "copy": "A biblioteca padrão oferece operações testadas para coleções.",
        "code": [
          "std::sort(notas.begin(), notas.end());",
          "cout << notas.front();"
        ],
        "focus": 0,
        "focusLabel": "reutilizar algoritmos",
        "explanation": "sort organiza a coleção; front lê o primeiro elemento."
      },
      {
        "title": "Erros e contratos",
        "copy": "Um programa robusto valida entradas e comunica falhas.",
        "code": [
          "if (valor < 0) {",
          "  throw std::invalid_argument(\"valor inválido\");",
          "}"
        ],
        "focus": 1,
        "focusLabel": "rejeitar estado inválido",
        "explanation": "Uma exceção informa ao chamador que o contrato não foi respeitado."
      },
      {
        "title": "Projeto final: desenhar um tipo",
        "copy": "Combina classe, métodos, coleção e validação num pequeno sistema.",
        "code": [
          "class Inventario {",
          "  std::vector<std::string> itens;",
          "public:",
          "  void adicionar(std::string item);",
          "};"
        ],
        "focus": 1,
        "focusLabel": "compor uma arquitetura",
        "explanation": "Separar dados e operações cria um sistema que pode crescer sem perder clareza."
      }
    ]
  },
  "logic": {
  "label": "LÓGICA",
  "steps": [
    {
      "title": "Pensar em passos",
      "copy": "Antes do código, transforma uma tarefa grande numa sequência concreta.",
      "code": [
        "1. Receber dados",
        "2. Transformar dados",
        "3. Mostrar resultado"
      ],
      "focus": 0,
      "focusLabel": "sequência",
      "explanation": "Entrada, processo e saída dão um mapa inicial para quase qualquer programa."
    },
    {
      "title": "Encontrar padrões",
      "copy": "Programar é reconhecer o que se repete e dar-lhe um nome.",
      "code": [
        "dados = [2, 4, 6]",
        "regra: somar 2",
        "próximo = 8"
      ],
      "focus": 1,
      "focusLabel": "padrão",
      "explanation": "Uma regra explícita permite prever o próximo passo sem adivinhar."
    },
    {
      "title": "Comparar valores",
      "copy": "Condições transformam perguntas em verdadeiro ou falso.",
      "code": [
        "idade >= 18  → verdadeiro",
        "idade < 18   → falso"
      ],
      "focus": 0,
      "focusLabel": "comparação",
      "explanation": "Operadores de comparação ajudam a escolher um caminho."
    },
    {
      "title": "Usar E e OU",
      "copy": "Regras podem exigir várias condições ao mesmo tempo.",
      "code": [
        "temBilhete E maiorDeIdade",
        "temBilhete OU conviteEspecial"
      ],
      "focus": 0,
      "focusLabel": "lógica booleana",
      "explanation": "E exige tudo; OU aceita pelo menos uma condição verdadeira."
    },
    {
      "title": "Escolher caminhos",
      "copy": "Uma decisão completa prevê também o que fazer quando a regra falha.",
      "code": [
        "SE saldo >= preço",
        "  comprar",
        "SENÃO",
        "  mostrar aviso"
      ],
      "focus": 0,
      "focusLabel": "decisão",
      "explanation": "Escrever os dois caminhos evita comportamentos indefinidos."
    },
    {
      "title": "Repetir com limite",
      "copy": "Todo ciclo precisa de uma condição de paragem.",
      "code": [
        "enquanto contador < 3:",
        "  mostrar contador",
        "  aumentar contador"
      ],
      "focus": 0,
      "focusLabel": "paragem",
      "explanation": "Atualizar o contador aproxima o algoritmo do fim."
    },
    {
      "title": "Trabalhar com listas",
      "copy": "Uma lista permite tratar muitos itens com a mesma regra.",
      "code": [
        "para cada tarefa na lista:",
        "  se tarefa concluída:",
        "    contar"
      ],
      "focus": 0,
      "focusLabel": "percorrer dados",
      "explanation": "O algoritmo visita cada elemento e toma uma decisão local."
    },
    {
      "title": "Escolher estruturas",
      "copy": "A forma de guardar dados influencia a solução.",
      "code": [
        "lista: [\"Ana\", \"Kito\"]",
        "mapa: {\"Ana\": 18}"
      ],
      "focus": 1,
      "focusLabel": "estrutura de dados",
      "explanation": "Lista representa sequência; mapa relaciona uma chave com um valor."
    },
    {
      "title": "Dividir em funções",
      "copy": "Uma função é uma pequena máquina com entrada e saída.",
      "code": [
        "função calcularTotal(itens):",
        "  somar preços",
        "  devolver total"
      ],
      "focus": 0,
      "focusLabel": "abstração",
      "explanation": "Dar um nome à tarefa torna o algoritmo reutilizável e testável."
    },
    {
      "title": "Modelar estados",
      "copy": "Uma aplicação muda de estado ao longo do tempo.",
      "code": [
        "estado = \"a jogar\"",
        "ação: terminar partida",
        "novo estado = \"terminado\""
      ],
      "focus": 1,
      "focusLabel": "estado",
      "explanation": "Pensar em estados e transições clarifica o que cada ação pode fazer."
    },
    {
      "title": "Detetar casos-limite",
      "copy": "Os casos vazios e os limites revelam erros escondidos.",
      "code": [
        "se lista está vazia:",
        "  mostrar \"sem resultados\"",
        "senão: procurar"
      ],
      "focus": 0,
      "focusLabel": "caso-limite",
      "explanation": "Um algoritmo robusto decide o que acontece quando não há dados."
    },
    {
      "title": "Depurar por hipóteses",
      "copy": "Um erro é uma pista, não uma sentença.",
      "code": [
        "observar entrada",
        "isolar passo",
        "testar hipótese",
        "corrigir e repetir"
      ],
      "focus": 1,
      "focusLabel": "depuração",
      "explanation": "Mudar uma coisa de cada vez ajuda a descobrir a causa."
    },
    {
      "title": "Pensar em custo",
      "copy": "Duas soluções corretas podem gastar trabalhos diferentes.",
      "code": [
        "procurar item:",
        "  verificar um a um",
        "índice: procurar diretamente"
      ],
      "focus": 1,
      "focusLabel": "eficiência",
      "explanation": "A estrutura certa pode reduzir o trabalho quando os dados crescem."
    },
    {
      "title": "Recursão e base",
      "copy": "Uma solução recursiva precisa de um caso simples que termina.",
      "code": [
        "resolver(n):",
        "  se n == 0: parar",
        "  senão: resolver(n - 1)"
      ],
      "focus": 1,
      "focusLabel": "recursão",
      "explanation": "O caso base impede que a solução continue para sempre."
    },
    {
      "title": "Escrever requisitos",
      "copy": "Antes de implementar, transforma desejos em comportamentos verificáveis.",
      "code": [
        "requisito: adicionar tarefa",
        "entrada: texto",
        "saída: tarefa na lista"
      ],
      "focus": 0,
      "focusLabel": "requisito",
      "explanation": "Um requisito claro diz o que entra, o que acontece e como observar o resultado."
    },
    {
      "title": "Testar exemplos",
      "copy": "Um exemplo pequeno pode confirmar uma regra.",
      "code": [
        "entrada: [2, 3]",
        "regra: somar",
        "esperado: 5"
      ],
      "focus": 2,
      "focusLabel": "teste",
      "explanation": "Testar entradas conhecidas protege a solução contra regressões."
    },
    {
      "title": "Projeto final: algoritmo completo",
      "copy": "Agora junta dados, decisões, ciclos, funções e testes num plano implementável.",
      "code": [
        "receber tarefas",
        "filtrar as concluídas",
        "ordenar por prioridade",
        "mostrar resumo"
      ],
      "focus": 1,
      "focusLabel": "composição",
      "explanation": "Um algoritmo completo é claro o bastante para ser traduzido para qualquer linguagem."
    }
  ]
}
};

const advancedTeacherSteps = {
  "javascript": [
    {
      "title": "Desestruturação",
      "copy": "Extrair valores de arrays e objetos torna o código mais expressivo.",
      "code": [
        "const aluno = { nome: \"Kito\", xp: 50 };\nconst { nome, xp } = aluno;"
      ],
      "focus": 0,
      "focusLabel": "extrair propriedades",
      "explanation": "Extrair valores de arrays e objetos torna o código mais expressivo. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Spread",
      "copy": "O operador spread cria cópias e combina coleções sem alterar a original.",
      "code": [
        "const base = [1, 2];\nconst completa = [...base, 3, 4];"
      ],
      "focus": 0,
      "focusLabel": "combinar arrays",
      "explanation": "O operador spread cria cópias e combina coleções sem alterar a original. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Rest",
      "copy": "Rest reúne argumentos variáveis numa coleção.",
      "code": [
        "function somar(...valores) {\n  return valores.reduce((a, b) => a + b, 0);\n}"
      ],
      "focus": 0,
      "focusLabel": "reunir argumentos",
      "explanation": "Rest reúne argumentos variáveis numa coleção. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Valores opcionais",
      "copy": "Optional chaining evita erros quando uma propriedade pode faltar.",
      "code": [
        "const cidade = utilizador?.morada?.cidade ?? \"desconhecida\";"
      ],
      "focus": 0,
      "focusLabel": "ler com segurança",
      "explanation": "Optional chaining evita erros quando uma propriedade pode faltar. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Closures",
      "copy": "Uma função pode lembrar o estado do lugar onde foi criada.",
      "code": [
        "function criarContador() {\n  let total = 0;\n  return () => ++total;\n}"
      ],
      "focus": 0,
      "focusLabel": "fechar sobre estado",
      "explanation": "Uma função pode lembrar o estado do lugar onde foi criada. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "this",
      "copy": "O contexto this depende de como uma função é chamada.",
      "code": [
        "const jogador = {\n  pontos: 10,\n  mostrar() { return this.pontos; }\n};"
      ],
      "focus": 0,
      "focusLabel": "entender contexto",
      "explanation": "O contexto this depende de como uma função é chamada. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Classes",
      "copy": "Classes organizam estado e comportamentos relacionados.",
      "code": [
        "class Pessoa {\n  constructor(nome) { this.nome = nome; }\n  saudar() { return `Olá, ${this.nome}`; }\n}"
      ],
      "focus": 0,
      "focusLabel": "modelar objetos",
      "explanation": "Classes organizam estado e comportamentos relacionados. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Herança",
      "copy": "Uma classe pode especializar o comportamento de outra.",
      "code": [
        "class Admin extends Pessoa {\n  podeGerir() { return true; }\n}"
      ],
      "focus": 0,
      "focusLabel": "especializar classes",
      "explanation": "Uma classe pode especializar o comportamento de outra. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Encapsulamento",
      "copy": "Campos privados protegem regras internas do objeto.",
      "code": [
        "class Carteira {\n  #saldo = 0;\n  depositar(valor) { this.#saldo += valor; }\n}"
      ],
      "focus": 0,
      "focusLabel": "proteger invariantes",
      "explanation": "Campos privados protegem regras internas do objeto. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Erros",
      "copy": "Exceções tornam falhas visíveis e tratáveis.",
      "code": [
        "try {\n  validarEntrada(dados);\n} catch (erro) {\n  console.error(erro.message);\n}"
      ],
      "focus": 0,
      "focusLabel": "tratar falhas",
      "explanation": "Exceções tornam falhas visíveis e tratáveis. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Erros próprios",
      "copy": "Erros com nomes claros ajudam quem mantém o sistema.",
      "code": [
        "class DadosInvalidos extends Error {}\nthrow new DadosInvalidos(\"Nome obrigatório\");"
      ],
      "focus": 0,
      "focusLabel": "comunicar contratos",
      "explanation": "Erros com nomes claros ajudam quem mantém o sistema. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "JSON",
      "copy": "JSON é um formato comum para trocar dados com APIs.",
      "code": [
        "const texto = JSON.stringify({ ativo: true });\nconst dados = JSON.parse(texto);"
      ],
      "focus": 0,
      "focusLabel": "serializar dados",
      "explanation": "JSON é um formato comum para trocar dados com APIs. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Fetch completo",
      "copy": "Uma chamada de rede deve verificar resposta e tratar falhas.",
      "code": [
        "async function obter() {\n  const resposta = await fetch(url);\n  if (!resposta.ok) throw new Error(\"Falha HTTP\");\n  return resposta.json();\n}"
      ],
      "focus": 0,
      "focusLabel": "validar resposta",
      "explanation": "Uma chamada de rede deve verificar resposta e tratar falhas. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Event loop",
      "copy": "JavaScript agenda tarefas assíncronas sem bloquear a interface.",
      "code": [
        "console.log(\"A\");\nsetTimeout(() => console.log(\"C\"));\nconsole.log(\"B\");"
      ],
      "focus": 0,
      "focusLabel": "ordenar tarefas",
      "explanation": "JavaScript agenda tarefas assíncronas sem bloquear a interface. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Debounce",
      "copy": "Debounce evita executar a mesma ação em excesso durante a digitação.",
      "code": [
        "const pesquisar = debounce(valor => buscar(valor), 250);\ninput.addEventListener(\"input\", e => pesquisar(e.target.value));"
      ],
      "focus": 0,
      "focusLabel": "controlar frequência",
      "explanation": "Debounce evita executar a mesma ação em excesso durante a digitação. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "AbortController",
      "copy": "Pedidos antigos podem ser cancelados quando uma nova pesquisa começa.",
      "code": [
        "const controller = new AbortController();\nfetch(url, { signal: controller.signal });\ncontroller.abort();"
      ],
      "focus": 0,
      "focusLabel": "cancelar pedidos",
      "explanation": "Pedidos antigos podem ser cancelados quando uma nova pesquisa começa. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Acessibilidade",
      "copy": "Interfaces devem funcionar com teclado e leitores de ecrã.",
      "code": [
        "botao.setAttribute(\"aria-label\", \"Guardar projeto\");\nbotao.addEventListener(\"keydown\", tratarTecla);"
      ],
      "focus": 0,
      "focusLabel": "tornar acessível",
      "explanation": "Interfaces devem funcionar com teclado e leitores de ecrã. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Formulários",
      "copy": "Validar no cliente melhora a experiência, mas não substitui validação segura.",
      "code": [
        "form.addEventListener(\"submit\", event => {\n  event.preventDefault();\n  if (!email.value.includes(\"@\")) mostrarErro();\n});"
      ],
      "focus": 0,
      "focusLabel": "validar entrada",
      "explanation": "Validar no cliente melhora a experiência, mas não substitui validação segura. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Segurança XSS",
      "copy": "Texto do utilizador não deve ser inserido como HTML sem sanitização.",
      "code": [
        "mensagem.textContent = textoDoUtilizador;\n// evita interpretar texto como marcação"
      ],
      "focus": 0,
      "focusLabel": "evitar XSS",
      "explanation": "Texto do utilizador não deve ser inserido como HTML sem sanitização. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Imutabilidade",
      "copy": "Criar novo estado previsível facilita a atualização da interface.",
      "code": [
        "const novoEstado = { ...estado, carregado: true };"
      ],
      "focus": 0,
      "focusLabel": "atualizar estado",
      "explanation": "Criar novo estado previsível facilita a atualização da interface. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Reducers",
      "copy": "Um reducer transforma estado e ação num novo estado.",
      "code": [
        "function reducer(estado, acao) {\n  if (acao.type === \"somar\") return { ...estado, total: estado.total + 1 };\n  return estado;\n}"
      ],
      "focus": 0,
      "focusLabel": "reduzir ações",
      "explanation": "Um reducer transforma estado e ação num novo estado. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Iteradores",
      "copy": "Iteradores definem como uma coleção fornece o próximo valor.",
      "code": [
        "const iterador = [10, 20][Symbol.iterator]();\nconsole.log(iterador.next().value);"
      ],
      "focus": 0,
      "focusLabel": "produzir valores",
      "explanation": "Iteradores definem como uma coleção fornece o próximo valor. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Geradores",
      "copy": "Geradores pausam em yield e continuam quando são pedidos.",
      "code": [
        "function* passos() {\n  yield \"início\";\n  yield \"fim\";\n}"
      ],
      "focus": 0,
      "focusLabel": "pausar execução",
      "explanation": "Geradores pausam em yield e continuam quando são pedidos. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Map e Set",
      "copy": "Map e Set resolvem relações e valores únicos com clareza.",
      "code": [
        "const vistos = new Set([\"a\", \"a\"]);\nconst nomes = new Map([[1, \"Ana\"]]);"
      ],
      "focus": 0,
      "focusLabel": "escolher coleções",
      "explanation": "Map e Set resolvem relações e valores únicos com clareza. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Web Components",
      "copy": "Componentes nativos podem encapsular marcação e comportamento.",
      "code": [
        "class Cartao extends HTMLElement {\n  connectedCallback() { this.textContent = \"Olá\"; }\n}\ncustomElements.define(\"x-cartao\", Cartao);"
      ],
      "focus": 0,
      "focusLabel": "criar componente",
      "explanation": "Componentes nativos podem encapsular marcação e comportamento. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Service Worker",
      "copy": "Um Service Worker pode tratar cache e funcionamento offline.",
      "code": [
        "self.addEventListener(\"fetch\", event => {\n  event.respondWith(caches.match(event.request));\n});"
      ],
      "focus": 0,
      "focusLabel": "interceptar pedidos",
      "explanation": "Um Service Worker pode tratar cache e funcionamento offline. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Performance",
      "copy": "Medir antes de otimizar evita soluções baseadas em suposições.",
      "code": [
        "performance.mark(\"inicio\");\nrenderizar();\nperformance.mark(\"fim\");"
      ],
      "focus": 0,
      "focusLabel": "medir desempenho",
      "explanation": "Medir antes de otimizar evita soluções baseadas em suposições. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Lazy loading",
      "copy": "Carregar recursos só quando necessários reduz o primeiro carregamento.",
      "code": [
        "const modulo = await import(\"./editor.js\");\nmodulo.abrir();"
      ],
      "focus": 0,
      "focusLabel": "carregar sob demanda",
      "explanation": "Carregar recursos só quando necessários reduz o primeiro carregamento. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Testes unitários",
      "copy": "Um teste pequeno fixa o comportamento de uma função.",
      "code": [
        "const resultado = somar(2, 3);\nconsole.assert(resultado === 5);"
      ],
      "focus": 0,
      "focusLabel": "verificar comportamento",
      "explanation": "Um teste pequeno fixa o comportamento de uma função. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Mocks",
      "copy": "Mocks isolam uma função de rede ou serviço externo durante o teste.",
      "code": [
        "const api = { listar: () => Promise.resolve([\"A\"]) };\nawait api.listar();"
      ],
      "focus": 0,
      "focusLabel": "isolar dependências",
      "explanation": "Mocks isolam uma função de rede ou serviço externo durante o teste. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Arquitetura",
      "copy": "Separar domínio, interface e infraestrutura reduz acoplamento.",
      "code": [
        "const estado = dominio.calcular(dados);\ninterface.render(estado);"
      ],
      "focus": 0,
      "focusLabel": "separar responsabilidades",
      "explanation": "Separar domínio, interface e infraestrutura reduz acoplamento. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Build e ambiente",
      "copy": "Configurações diferentes não devem ficar espalhadas pelo código.",
      "code": [
        "const ambiente = import.meta.env.MODE;\nconsole.log(`modo: ${ambiente}`);"
      ],
      "focus": 0,
      "focusLabel": "configurar ambiente",
      "explanation": "Configurações diferentes não devem ficar espalhadas pelo código. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Capstone JavaScript",
      "copy": "O projeto final combina dados, UI, rede, erros, testes e acessibilidade.",
      "code": [
        "async function iniciar() {\n  const dados = await obter();\n  renderizar(dados);\n}\niniciar().catch(mostrarErro);"
      ],
      "focus": 0,
      "focusLabel": "compor uma aplicação",
      "explanation": "O projeto final combina dados, UI, rede, erros, testes e acessibilidade. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    }
  ],
  "python": [
    {
      "title": "Tuplos",
      "copy": "Tuplos agrupam valores que não devem ser alterados.",
      "code": [
        "ponto = (10, 20)\nx, y = ponto"
      ],
      "focus": 0,
      "focusLabel": "desempacotar valores",
      "explanation": "Tuplos agrupam valores que não devem ser alterados. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Conjuntos",
      "copy": "Sets guardam valores únicos e permitem operações de conjunto.",
      "code": [
        "visitantes = {\"Ana\", \"Kito\", \"Ana\"}\nprint(visitantes)"
      ],
      "focus": 0,
      "focusLabel": "remover duplicados",
      "explanation": "Sets guardam valores únicos e permitem operações de conjunto. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Fatiamento",
      "copy": "Slicing seleciona partes de sequências sem ciclos manuais.",
      "code": [
        "nomes = [\"A\", \"B\", \"C\", \"D\"]\nprint(nomes[1:3])"
      ],
      "focus": 0,
      "focusLabel": "selecionar intervalo",
      "explanation": "Slicing seleciona partes de sequências sem ciclos manuais. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Desempacotamento",
      "copy": "O Python pode distribuir elementos por vários nomes.",
      "code": [
        "primeiro, *resto = [1, 2, 3, 4]\nprint(primeiro, resto)"
      ],
      "focus": 0,
      "focusLabel": "distribuir itens",
      "explanation": "O Python pode distribuir elementos por vários nomes. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Ordenação por chave",
      "copy": "sorted pode ordenar objetos segundo uma propriedade.",
      "code": [
        "alunos = [{\"nome\":\"A\", \"nota\":18}, {\"nome\":\"B\", \"nota\":12}]\nordenados = sorted(alunos, key=lambda a: a[\"nota\"], reverse=True)"
      ],
      "focus": 0,
      "focusLabel": "ordenar por regra",
      "explanation": "sorted pode ordenar objetos segundo uma propriedade. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Lambdas",
      "copy": "Lambdas são funções pequenas úteis em transformações locais.",
      "code": [
        "dobro = lambda n: n * 2\nprint(dobro(4))"
      ],
      "focus": 0,
      "focusLabel": "criar função curta",
      "explanation": "Lambdas são funções pequenas úteis em transformações locais. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Decoradores",
      "copy": "Decoradores envolvem funções para acrescentar comportamento.",
      "code": [
        "def registar(funcao):\n    def envolvida(*args):\n        print(\"a executar\")\n        return funcao(*args)\n    return envolvida"
      ],
      "focus": 0,
      "focusLabel": "envolver funções",
      "explanation": "Decoradores envolvem funções para acrescentar comportamento. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Dataclasses",
      "copy": "Dataclasses reduzem código repetitivo em objetos de dados.",
      "code": [
        "from dataclasses import dataclass\n@dataclass\nclass Aluno:\n    nome: str\n    nota: int"
      ],
      "focus": 0,
      "focusLabel": "declarar dados",
      "explanation": "Dataclasses reduzem código repetitivo em objetos de dados. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Type hints",
      "copy": "Anotações documentam tipos e ajudam ferramentas a encontrar erros.",
      "code": [
        "def media(valores: list[float]) -> float:\n    return sum(valores) / len(valores)"
      ],
      "focus": 0,
      "focusLabel": "explicitar tipos",
      "explanation": "Anotações documentam tipos e ajudam ferramentas a encontrar erros. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Protocolos",
      "copy": "Protocolos descrevem o comportamento necessário sem exigir herança.",
      "code": [
        "class PodeGuardar(Protocol):\n    def guardar(self, valor: str) -> None: ..."
      ],
      "focus": 0,
      "focusLabel": "definir contrato",
      "explanation": "Protocolos descrevem o comportamento necessário sem exigir herança. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Context managers",
      "copy": "Context managers garantem preparação e limpeza de recursos.",
      "code": [
        "with abrir_conexao() as conexao:\n    conexao.executar(consulta)"
      ],
      "focus": 0,
      "focusLabel": "gerir recursos",
      "explanation": "Context managers garantem preparação e limpeza de recursos. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Logging",
      "copy": "Logs estruturados ajudam a observar um programa em produção.",
      "code": [
        "import logging\nlogging.info(\"utilizador autenticado\", extra={\"uid\": uid})"
      ],
      "focus": 0,
      "focusLabel": "observar execução",
      "explanation": "Logs estruturados ajudam a observar um programa em produção. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Testes unitários",
      "copy": "Testes tornam uma regra executável e repetível.",
      "code": [
        "def test_soma():\n    assert somar(2, 3) == 5"
      ],
      "focus": 0,
      "focusLabel": "fixar comportamento",
      "explanation": "Testes tornam uma regra executável e repetível. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Fixtures",
      "copy": "Fixtures preparam dados consistentes para os testes.",
      "code": [
        "def test_total(client, dados_exemplo):\n    assert client.total(dados_exemplo) == 30"
      ],
      "focus": 0,
      "focusLabel": "preparar cenário",
      "explanation": "Fixtures preparam dados consistentes para os testes. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Ambientes virtuais",
      "copy": "Ambientes isolam dependências entre projetos.",
      "code": [
        "python -m venv .venv\npython -m pip install -r requirements.txt"
      ],
      "focus": 0,
      "focusLabel": "isolar dependências",
      "explanation": "Ambientes isolam dependências entre projetos. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Pacotes",
      "copy": "Um pacote bem organizado define módulos e uma API clara.",
      "code": [
        "app/\n  __init__.py\n  modelos.py\n  servicos.py"
      ],
      "focus": 0,
      "focusLabel": "organizar pacote",
      "explanation": "Um pacote bem organizado define módulos e uma API clara. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "JSON e APIs",
      "copy": "Bibliotecas de dados permitem trocar informação com serviços.",
      "code": [
        "import json\npayload = json.loads(resposta.text)\nprint(payload[\"nome\"])"
      ],
      "focus": 0,
      "focusLabel": "ler payload",
      "explanation": "Bibliotecas de dados permitem trocar informação com serviços. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "SQLite",
      "copy": "Uma base local organiza dados que precisam de consulta.",
      "code": [
        "with sqlite3.connect(\"app.db\") as db:\n    db.execute(\"CREATE TABLE IF NOT EXISTS tarefas (texto TEXT)\")"
      ],
      "focus": 0,
      "focusLabel": "persistir dados",
      "explanation": "Uma base local organiza dados que precisam de consulta. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Generators",
      "copy": "Geradores processam grandes sequências sem carregar tudo em memória.",
      "code": [
        "def linhas_validas(ficheiro):\n    for linha in ficheiro:\n        if linha.strip():\n            yield linha.strip()"
      ],
      "focus": 0,
      "focusLabel": "processar em fluxo",
      "explanation": "Geradores processam grandes sequências sem carregar tudo em memória. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Asyncio",
      "copy": "asyncio coordena tarefas que esperam por I/O.",
      "code": [
        "async def carregar_tudo(urls):\n    return await asyncio.gather(*(carregar(url) for url in urls))"
      ],
      "focus": 0,
      "focusLabel": "concorrer I/O",
      "explanation": "asyncio coordena tarefas que esperam por I/O. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Threads",
      "copy": "Threads podem esperar por operações bloqueantes, com cuidado sobre estado partilhado.",
      "code": [
        "with ThreadPoolExecutor() as pool:\n    resultados = list(pool.map baixar, urls)"
      ],
      "focus": 0,
      "focusLabel": "paralelizar espera",
      "explanation": "Threads podem esperar por operações bloqueantes, com cuidado sobre estado partilhado. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Multiprocessing",
      "copy": "Processos separados aproveitam vários núcleos para trabalho CPU-bound.",
      "code": [
        "with ProcessPoolExecutor() as pool:\n    resultados = list(pool.map(calcular, dados))"
      ],
      "focus": 0,
      "focusLabel": "usar vários núcleos",
      "explanation": "Processos separados aproveitam vários núcleos para trabalho CPU-bound. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Profiling",
      "copy": "Medir o tempo revela o verdadeiro ponto lento do programa.",
      "code": [
        "import cProfile\ncProfile.run(\"gerar_relatorio()\")"
      ],
      "focus": 0,
      "focusLabel": "medir gargalos",
      "explanation": "Medir o tempo revela o verdadeiro ponto lento do programa. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Segurança de entradas",
      "copy": "Nunca confies em dados externos nem construas SQL por concatenação.",
      "code": [
        "cursor.execute(\"SELECT * FROM users WHERE id = ?\", (user_id,))"
      ],
      "focus": 0,
      "focusLabel": "parametrizar consulta",
      "explanation": "Nunca confies em dados externos nem construas SQL por concatenação. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "HTTP robusto",
      "copy": "Clientes devem usar timeout, validação e tratamento de status.",
      "code": [
        "resposta = requests.get(url, timeout=10)\nresposta.raise_for_status()"
      ],
      "focus": 0,
      "focusLabel": "tratar rede",
      "explanation": "Clientes devem usar timeout, validação e tratamento de status. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Filas",
      "copy": "Filas desacoplam quem produz trabalho de quem o executa.",
      "code": [
        "fila.put(tarefa)\ntarefa = fila.get()\nfila.task_done()"
      ],
      "focus": 0,
      "focusLabel": "desacoplar trabalho",
      "explanation": "Filas desacoplam quem produz trabalho de quem o executa. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Padrão estratégia",
      "copy": "Estratégias permitem trocar um algoritmo sem alterar o fluxo principal.",
      "code": [
        "def calcular(preco, regra):\n    return regra(preco)"
      ],
      "focus": 0,
      "focusLabel": "trocar algoritmo",
      "explanation": "Estratégias permitem trocar um algoritmo sem alterar o fluxo principal. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Observabilidade",
      "copy": "Métricas, logs e traces mostram o caminho de uma operação.",
      "code": [
        "with tracer.start_as_current_span(\"checkout\"):\n    processar_pedido()"
      ],
      "focus": 0,
      "focusLabel": "seguir uma operação",
      "explanation": "Métricas, logs e traces mostram o caminho de uma operação. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Deploy",
      "copy": "Configuração por ambiente torna o programa portátil.",
      "code": [
        "import os\nDEBUG = os.getenv(\"DEBUG\", \"0\") == \"1\""
      ],
      "focus": 0,
      "focusLabel": "configurar deploy",
      "explanation": "Configuração por ambiente torna o programa portátil. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Performance de dados",
      "copy": "Escolher estruturas e evitar trabalho repetido melhora escalabilidade.",
      "code": [
        "indices = {item.id: item for item in itens}\nresultado = indices.get(alvo)"
      ],
      "focus": 0,
      "focusLabel": "indexar procura",
      "explanation": "Escolher estruturas e evitar trabalho repetido melhora escalabilidade. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Capstone Python",
      "copy": "O projeto final junta API, persistência, testes, logs e tratamento de erros.",
      "code": [
        "def executar():\n    try:\n        dados = carregar()\n        guardar(processar(dados))\n    except Exception:\n        logging.exception(\"falha no processamento\")"
      ],
      "focus": 0,
      "focusLabel": "compor serviço",
      "explanation": "O projeto final junta API, persistência, testes, logs e tratamento de erros. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    }
  ],
  "cpp": [
    {
      "title": "Const correctness",
      "copy": "const comunica que uma função não deve alterar um valor.",
      "code": [
        "void mostrar(const std::string& nome) {\n  std::cout << nome;\n}"
      ],
      "focus": 0,
      "focusLabel": "proteger leitura",
      "explanation": "const comunica que uma função não deve alterar um valor. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Vector",
      "copy": "vector cresce dinamicamente e é a coleção de uso geral.",
      "code": [
        "std::vector<int> pontos{10, 20};\npontos.push_back(30);"
      ],
      "focus": 0,
      "focusLabel": "gerir coleção",
      "explanation": "vector cresce dinamicamente e é a coleção de uso geral. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Iteradores",
      "copy": "Iteradores permitem percorrer coleções de forma uniforme.",
      "code": [
        "for (auto it = pontos.begin(); it != pontos.end(); ++it) {\n  std::cout << *it;\n}"
      ],
      "focus": 0,
      "focusLabel": "percorrer iteradores",
      "explanation": "Iteradores permitem percorrer coleções de forma uniforme. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Range for",
      "copy": "Range-based for torna a leitura de coleções mais clara.",
      "code": [
        "for (const auto& ponto : pontos) {\n  std::cout << ponto;\n}"
      ],
      "focus": 0,
      "focusLabel": "simplificar percurso",
      "explanation": "Range-based for torna a leitura de coleções mais clara. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Algoritmos",
      "copy": "A biblioteca padrão oferece algoritmos prontos e testados.",
      "code": [
        "std::sort(pontos.begin(), pontos.end());\nauto it = std::find(pontos.begin(), pontos.end(), 20);"
      ],
      "focus": 0,
      "focusLabel": "reutilizar algoritmo",
      "explanation": "A biblioteca padrão oferece algoritmos prontos e testados. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Lambdas",
      "copy": "Lambdas criam pequenas regras junto da chamada.",
      "code": [
        "std::sort(pontos.begin(), pontos.end(), [](int a, int b) {\n  return a > b;\n});"
      ],
      "focus": 0,
      "focusLabel": "definir comparação",
      "explanation": "Lambdas criam pequenas regras junto da chamada. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Smart pointers",
      "copy": "unique_ptr gere a propriedade de um objeto sem delete manual.",
      "code": [
        "auto jogador = std::make_unique<Jogador>(\"Kito\");"
      ],
      "focus": 0,
      "focusLabel": "gerir propriedade",
      "explanation": "unique_ptr gere a propriedade de um objeto sem delete manual. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Shared pointers",
      "copy": "shared_ptr partilha propriedade quando vários donos são necessários.",
      "code": [
        "auto recurso = std::make_shared<Recurso>();\nauto outro = recurso;"
      ],
      "focus": 0,
      "focusLabel": "partilhar recurso",
      "explanation": "shared_ptr partilha propriedade quando vários donos são necessários. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Move semantics",
      "copy": "Mover transfere recursos e evita cópias desnecessárias.",
      "code": [
        "std::vector<int> criar() {\n  return {1, 2, 3};\n}\nauto dados = criar();"
      ],
      "focus": 0,
      "focusLabel": "evitar cópias",
      "explanation": "Mover transfere recursos e evita cópias desnecessárias. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Rvalue references",
      "copy": "Referências rvalue permitem construir ou mover temporários.",
      "code": [
        "void guardar(std::string&& texto) {\n  valor = std::move(texto);\n}"
      ],
      "focus": 0,
      "focusLabel": "mover temporário",
      "explanation": "Referências rvalue permitem construir ou mover temporários. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "RAII",
      "copy": "A aquisição e libertação de recursos devem acompanhar o tempo de vida.",
      "code": [
        "std::lock_guard<std::mutex> bloqueio(mutex);\nprocessar();"
      ],
      "focus": 0,
      "focusLabel": "libertar automaticamente",
      "explanation": "A aquisição e libertação de recursos devem acompanhar o tempo de vida. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Namespaces",
      "copy": "Namespaces evitam colisões entre nomes de bibliotecas.",
      "code": [
        "namespace World69 {\n  struct Config {};\n}\nWorld69::Config config;"
      ],
      "focus": 0,
      "focusLabel": "organizar nomes",
      "explanation": "Namespaces evitam colisões entre nomes de bibliotecas. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Headers",
      "copy": "Headers expõem contratos; implementações ficam em fontes separadas.",
      "code": [
        "// conta.h\nclass Conta {\npublic: void depositar(double);\n};"
      ],
      "focus": 0,
      "focusLabel": "separar interface",
      "explanation": "Headers expõem contratos; implementações ficam em fontes separadas. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "CMake",
      "copy": "Um sistema de build descreve fontes e dependências de forma reproduzível.",
      "code": [
        "add_executable(app main.cpp conta.cpp)\ntarget_compile_features(app PRIVATE cxx_std_20)"
      ],
      "focus": 0,
      "focusLabel": "reproduzir build",
      "explanation": "Um sistema de build descreve fontes e dependências de forma reproduzível. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Exceções",
      "copy": "Exceções propagam falhas quando um contrato não pode ser cumprido.",
      "code": [
        "try { abrir(); }\ncatch (const std::runtime_error& erro) {\n  std::cerr << erro.what();\n}"
      ],
      "focus": 0,
      "focusLabel": "propagar falha",
      "explanation": "Exceções propagam falhas quando um contrato não pode ser cumprido. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Optional",
      "copy": "optional representa um resultado que pode não existir.",
      "code": [
        "std::optional<int> procurar(int id) {\n  if (!existe(id)) return std::nullopt;\n  return valor;\n}"
      ],
      "focus": 0,
      "focusLabel": "representar ausência",
      "explanation": "optional representa um resultado que pode não existir. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Variant",
      "copy": "variant representa uma de várias alternativas conhecidas.",
      "code": [
        "std::variant<int, std::string> resposta;\nresposta = \"ok\";"
      ],
      "focus": 0,
      "focusLabel": "modelar alternativas",
      "explanation": "variant representa uma de várias alternativas conhecidas. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Filesystem",
      "copy": "filesystem oferece operações portáveis sobre caminhos e ficheiros.",
      "code": [
        "for (const auto& entrada : std::filesystem::directory_iterator(\".\")) {\n  std::cout << entrada.path();\n}"
      ],
      "focus": 0,
      "focusLabel": "percorrer diretório",
      "explanation": "filesystem oferece operações portáveis sobre caminhos e ficheiros. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Serialização",
      "copy": "Dados podem ser convertidos para formato de armazenamento ou transporte.",
      "code": [
        "std::string linha = nome + \";\" + std::to_string(pontos);\nstd::cout << linha;"
      ],
      "focus": 0,
      "focusLabel": "formatar dados",
      "explanation": "Dados podem ser convertidos para formato de armazenamento ou transporte. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Testes C++",
      "copy": "Testes confirmam contratos e protegem refatorações.",
      "code": [
        "TEST(Soma, DoisValores) {\n  EXPECT_EQ(somar(2, 3), 5);\n}"
      ],
      "focus": 0,
      "focusLabel": "fixar contrato",
      "explanation": "Testes confirmam contratos e protegem refatorações. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Debugging",
      "copy": "Um debugger permite observar valores e fluxo sem adivinhar.",
      "code": [
        "breakpoint em: calcularTotal()\nobservar: subtotal, desconto"
      ],
      "focus": 0,
      "focusLabel": "inspecionar estado",
      "explanation": "Um debugger permite observar valores e fluxo sem adivinhar. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Complexidade",
      "copy": "A análise de custo ajuda a escolher entre procura linear e índice.",
      "code": [
        "for (const auto& item : itens) procurar(item);\n// custo cresce com o número de itens"
      ],
      "focus": 0,
      "focusLabel": "analisar custo",
      "explanation": "A análise de custo ajuda a escolher entre procura linear e índice. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Hash map",
      "copy": "unordered_map oferece procura média rápida por chave.",
      "code": [
        "std::unordered_map<int, std::string> nomes;\nnomes[7] = \"Kito\";"
      ],
      "focus": 0,
      "focusLabel": "indexar por chave",
      "explanation": "unordered_map oferece procura média rápida por chave. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Stack e queue",
      "copy": "Estruturas diferentes expressam ordens de processamento diferentes.",
      "code": [
        "std::stack<int> pilha;\nstd::queue<int> fila;"
      ],
      "focus": 0,
      "focusLabel": "escolher ordem",
      "explanation": "Estruturas diferentes expressam ordens de processamento diferentes. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Grafos",
      "copy": "Grafos modelam ligações entre entidades e podem ser percorridos.",
      "code": [
        "std::vector<std::vector<int>> grafo;\ngrafo[1].push_back(2);"
      ],
      "focus": 0,
      "focusLabel": "modelar ligações",
      "explanation": "Grafos modelam ligações entre entidades e podem ser percorridos. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Threads",
      "copy": "Threads executam trabalho concorrente, mas partilha exige coordenação.",
      "code": [
        "std::thread tarefa([] { processar(); });\ntarefa.join();"
      ],
      "focus": 0,
      "focusLabel": "executar concorrência",
      "explanation": "Threads executam trabalho concorrente, mas partilha exige coordenação. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Mutex",
      "copy": "Mutex protege uma região crítica contra acessos simultâneos.",
      "code": [
        "std::lock_guard<std::mutex> guarda(mutex);\ncontador++;"
      ],
      "focus": 0,
      "focusLabel": "proteger estado",
      "explanation": "Mutex protege uma região crítica contra acessos simultâneos. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Atomics",
      "copy": "Atomics permitem operações simples seguras entre threads.",
      "code": [
        "std::atomic<int> contador{0};\ncontador.fetch_add(1);"
      ],
      "focus": 0,
      "focusLabel": "coordenar contador",
      "explanation": "Atomics permitem operações simples seguras entre threads. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Future",
      "copy": "Future representa um resultado que ficará disponível depois.",
      "code": [
        "auto futuro = std::async(std::launch::async, calcular);\nint resultado = futuro.get();"
      ],
      "focus": 0,
      "focusLabel": "aguardar resultado",
      "explanation": "Future representa um resultado que ficará disponível depois. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Design factory",
      "copy": "Uma factory centraliza a criação de variantes de objetos.",
      "code": [
        "std::unique_ptr<Forma> criar(Tipo tipo) {\n  return std::make_unique<Quadrado>();\n}"
      ],
      "focus": 0,
      "focusLabel": "centralizar criação",
      "explanation": "Uma factory centraliza a criação de variantes de objetos. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Design observer",
      "copy": "Observer avisa interessados quando o estado muda.",
      "code": [
        "for (auto& observador : observadores) {\n  observador->atualizar(evento);\n}"
      ],
      "focus": 0,
      "focusLabel": "notificar mudanças",
      "explanation": "Observer avisa interessados quando o estado muda. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Performance",
      "copy": "Perfil e memória devem orientar otimizações concretas.",
      "code": [
        "// medir antes de mudar\nauto inicio = std::chrono::steady_clock::now();\nexecutar();"
      ],
      "focus": 0,
      "focusLabel": "medir execução",
      "explanation": "Perfil e memória devem orientar otimizações concretas. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Capstone C++",
      "copy": "O projeto final junta classes, coleções, RAII, testes e concorrência segura.",
      "code": [
        "class Servico {\n  std::vector<Tarefa> tarefas;\npublic:\n  void executar();\n};"
      ],
      "focus": 0,
      "focusLabel": "compor sistema",
      "explanation": "O projeto final junta classes, coleções, RAII, testes e concorrência segura. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    }
  ],
  "logic": [
    {
      "title": "Tabela verdade",
      "copy": "Tabelas verdade mostram o resultado de combinações booleanas.",
      "code": [
        "A E B:\nV,V → V\nV,F → F\nF,V → F\nF,F → F"
      ],
      "focus": 0,
      "focusLabel": "verificar combinação",
      "explanation": "Tabelas verdade mostram o resultado de combinações booleanas. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Invariantes",
      "copy": "Uma invariante é uma regra que deve continuar verdadeira.",
      "code": [
        "antes: saldo >= 0\nação: levantar valor\ndepois: saldo >= 0"
      ],
      "focus": 0,
      "focusLabel": "proteger invariante",
      "explanation": "Uma invariante é uma regra que deve continuar verdadeira. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Pré e pós-condições",
      "copy": "Contratos definem o que uma operação exige e garante.",
      "code": [
        "pré: lista ordenada\\> inserir item\npós: lista continua ordenada"
      ],
      "focus": 0,
      "focusLabel": "definir contrato",
      "explanation": "Contratos definem o que uma operação exige e garante. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Modularidade",
      "copy": "Módulos pequenos podem ser compreendidos e testados separadamente.",
      "code": [
        "entrada → módulo A → módulo B → saída"
      ],
      "focus": 0,
      "focusLabel": "dividir problema",
      "explanation": "Módulos pequenos podem ser compreendidos e testados separadamente. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Acoplamento",
      "copy": "Menos dependências diretas tornam alterações mais seguras.",
      "code": [
        "interface: guardar(dado)\nimplementação: memória ou ficheiro"
      ],
      "focus": 0,
      "focusLabel": "reduzir acoplamento",
      "explanation": "Menos dependências diretas tornam alterações mais seguras. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Coesão",
      "copy": "Cada módulo deve ter uma responsabilidade relacionada.",
      "code": [
        "módulo pagamentos:\n  calcular\n  validar\n  registar"
      ],
      "focus": 0,
      "focusLabel": "manter coesão",
      "explanation": "Cada módulo deve ter uma responsabilidade relacionada. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Busca linear",
      "copy": "Busca linear verifica itens até encontrar uma resposta.",
      "code": [
        "para cada item:\n  se item == alvo: devolver item"
      ],
      "focus": 0,
      "focusLabel": "procurar sequencialmente",
      "explanation": "Busca linear verifica itens até encontrar uma resposta. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Busca binária",
      "copy": "Busca binária exige dados ordenados e corta o intervalo ao meio.",
      "code": [
        "enquanto esquerda <= direita:\n  meio = (esquerda + direita) / 2"
      ],
      "focus": 0,
      "focusLabel": "dividir intervalo",
      "explanation": "Busca binária exige dados ordenados e corta o intervalo ao meio. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Ordenação",
      "copy": "Ordenar organiza dados segundo uma regra explícita.",
      "code": [
        "comparar vizinhos\ntrocar se estão fora de ordem\nrepetir até estabilizar"
      ],
      "focus": 0,
      "focusLabel": "ordenar dados",
      "explanation": "Ordenar organiza dados segundo uma regra explícita. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Pilha",
      "copy": "Stack segue LIFO: o último a entrar sai primeiro.",
      "code": [
        "empilhar(A)\nempilhar(B)\ndesempilhar() → B"
      ],
      "focus": 0,
      "focusLabel": "usar LIFO",
      "explanation": "Stack segue LIFO: o último a entrar sai primeiro. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Fila",
      "copy": "Queue segue FIFO: o primeiro a entrar sai primeiro.",
      "code": [
        "entrar(A)\nentrar(B)\nsair() → A"
      ],
      "focus": 0,
      "focusLabel": "usar FIFO",
      "explanation": "Queue segue FIFO: o primeiro a entrar sai primeiro. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Árvore",
      "copy": "Árvores organizam relações hierárquicas.",
      "code": [
        "raiz\n├── filho A\n└── filho B"
      ],
      "focus": 0,
      "focusLabel": "modelar hierarquia",
      "explanation": "Árvores organizam relações hierárquicas. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Grafo",
      "copy": "Grafos representam nós e ligações, como mapas ou redes sociais.",
      "code": [
        "A -- B\n|\nC"
      ],
      "focus": 0,
      "focusLabel": "representar rede",
      "explanation": "Grafos representam nós e ligações, como mapas ou redes sociais. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "BFS",
      "copy": "Busca em largura visita por camadas e usa uma fila.",
      "code": [
        "colocar início na fila\nvisitar vizinhos\ncontinuar por camadas"
      ],
      "focus": 0,
      "focusLabel": "explorar por camadas",
      "explanation": "Busca em largura visita por camadas e usa uma fila. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "DFS",
      "copy": "Busca em profundidade segue um caminho antes de voltar atrás.",
      "code": [
        "visitar nó\nseguir vizinho\nvoltar quando não houver saída"
      ],
      "focus": 0,
      "focusLabel": "explorar profundidade",
      "explanation": "Busca em profundidade segue um caminho antes de voltar atrás. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Caminho mínimo",
      "copy": "Pesos diferentes exigem comparar custos de caminhos.",
      "code": [
        "distância[A] = 0\nrelaxar arestas\nescolher menor custo"
      ],
      "focus": 0,
      "focusLabel": "calcular caminho",
      "explanation": "Pesos diferentes exigem comparar custos de caminhos. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Programação dinâmica",
      "copy": "Guardar subresultados evita repetir o mesmo trabalho.",
      "code": [
        "se solução[n] existe: usar\nsenão: calcular e guardar"
      ],
      "focus": 0,
      "focusLabel": "reutilizar subproblema",
      "explanation": "Guardar subresultados evita repetir o mesmo trabalho. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Greedy",
      "copy": "Algoritmo guloso escolhe o melhor passo local, quando a prova permite.",
      "code": [
        "escolher maior benefício agora\nmarcar recurso\ncontinuar"
      ],
      "focus": 0,
      "focusLabel": "escolher localmente",
      "explanation": "Algoritmo guloso escolhe o melhor passo local, quando a prova permite. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Backtracking",
      "copy": "Backtracking tenta, verifica e desfaz quando a escolha falha.",
      "code": [
        "escolher opção\nse inválida: desfazer\ntentar próxima"
      ],
      "focus": 0,
      "focusLabel": "voltar atrás",
      "explanation": "Backtracking tenta, verifica e desfaz quando a escolha falha. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Invariantes de ciclo",
      "copy": "Uma invariante explica o que é verdade em cada repetição.",
      "code": [
        "antes de cada volta: processados corretos\nprocessar próximo\nmanter regra"
      ],
      "focus": 0,
      "focusLabel": "provar ciclo",
      "explanation": "Uma invariante explica o que é verdade em cada repetição. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Complexidade O(1)",
      "copy": "Acesso direto não cresce com o tamanho da coleção.",
      "code": [
        "índice = 4\nvalor = lista[índice]"
      ],
      "focus": 0,
      "focusLabel": "acesso constante",
      "explanation": "Acesso direto não cresce com o tamanho da coleção. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Complexidade O(n)",
      "copy": "Percorrer todos os itens cresce proporcionalmente à entrada.",
      "code": [
        "para cada item em lista:\n  verificar(item)"
      ],
      "focus": 0,
      "focusLabel": "custo linear",
      "explanation": "Percorrer todos os itens cresce proporcionalmente à entrada. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Complexidade O(log n)",
      "copy": "Dividir o espaço em cada passo reduz rapidamente a procura.",
      "code": [
        "n = n / 2\nrepetir até encontrar"
      ],
      "focus": 0,
      "focusLabel": "custo logarítmico",
      "explanation": "Dividir o espaço em cada passo reduz rapidamente a procura. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Requisitos funcionais",
      "copy": "Requisitos funcionais descrevem ações que o sistema oferece.",
      "code": [
        "utilizador adiciona tarefa\nsistema guarda tarefa\nsistema mostra tarefa"
      ],
      "focus": 0,
      "focusLabel": "descrever comportamento",
      "explanation": "Requisitos funcionais descrevem ações que o sistema oferece. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Requisitos não funcionais",
      "copy": "Qualidade também inclui velocidade, segurança e acessibilidade.",
      "code": [
        "responder em menos de 1 segundo\nfuncionar com teclado"
      ],
      "focus": 0,
      "focusLabel": "definir qualidade",
      "explanation": "Qualidade também inclui velocidade, segurança e acessibilidade. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Modelar casos de uso",
      "copy": "Casos de uso ligam ator, objetivo e resultado.",
      "code": [
        "ator: aluno\nobjetivo: concluir missão\nresultado: progresso guardado"
      ],
      "focus": 0,
      "focusLabel": "mapear objetivo",
      "explanation": "Casos de uso ligam ator, objetivo e resultado. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Máquina de estados",
      "copy": "Estados tornam transições permitidas explícitas.",
      "code": [
        "rascunho --publicar--> publicado\npublicado --arquivar--> arquivado"
      ],
      "focus": 0,
      "focusLabel": "desenhar transição",
      "explanation": "Estados tornam transições permitidas explícitas. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "API",
      "copy": "Uma API define como dois componentes trocam mensagens.",
      "code": [
        "pedido: GET /tarefas\nresposta: 200 + lista"
      ],
      "focus": 0,
      "focusLabel": "definir contrato API",
      "explanation": "Uma API define como dois componentes trocam mensagens. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Segurança por camadas",
      "copy": "Validar, autorizar e registar são responsabilidades diferentes.",
      "code": [
        "entrada → validar\nutilizador → autorizar\nação → registar"
      ],
      "focus": 0,
      "focusLabel": "separar segurança",
      "explanation": "Validar, autorizar e registar são responsabilidades diferentes. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Testes de propriedades",
      "copy": "Testes de propriedades verificam regras para muitas entradas.",
      "code": [
        "para qualquer a,b:\nsomar(a,b) == somar(b,a)"
      ],
      "focus": 0,
      "focusLabel": "verificar propriedade",
      "explanation": "Testes de propriedades verificam regras para muitas entradas. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Integração contínua",
      "copy": "Executar testes a cada alteração encontra regressões cedo.",
      "code": [
        "commit → lint → testes → publicar"
      ],
      "focus": 0,
      "focusLabel": "automatizar verificação",
      "explanation": "Executar testes a cada alteração encontra regressões cedo. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Deploy reversível",
      "copy": "Uma publicação segura permite voltar à versão anterior.",
      "code": [
        "versão atual: v2\nse erro: voltar para v1"
      ],
      "focus": 0,
      "focusLabel": "planejar rollback",
      "explanation": "Uma publicação segura permite voltar à versão anterior. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    },
    {
      "title": "Capstone de lógica",
      "copy": "O projeto final combina requisitos, dados, algoritmos, segurança e testes.",
      "code": [
        "definir objetivo\nmodelar dados\nescolher algoritmo\ntestar e publicar"
      ],
      "focus": 0,
      "focusLabel": "compor solução",
      "explanation": "O projeto final combina requisitos, dados, algoritmos, segurança e testes. Observa a linha destacada e tenta explicar esta decisão com as tuas próprias palavras."
    }
  ]
};

advancedTeacherSteps.python.push(
  {
    "title": "Cache e invalidação",
    "copy": "Cache acelera leituras repetidas, mas precisa de uma regra clara para ficar atualizado.",
    "code": [
      "cache[chave] = valor",
      "se expirado(chave):",
      "  valor = carregar_novamente()"
    ],
    "focus": 0,
    "focusLabel": "controlar cache",
    "explanation": "Cache reduz trabalho repetido; expiração e invalidação evitam servir dados antigos."
  },
  {
    "title": "Capstone Python: serviço completo",
    "copy": "Este desafio final combina tipos, módulos, persistência, concorrência, testes e observabilidade.",
    "code": [
      "receber pedido",
      "validar e processar",
      "guardar resultado",
      "registar sucesso ou falha"
    ],
    "focus": 0,
    "focusLabel": "integrar arquitetura",
    "explanation": "Um programa avançado não é apenas sintaxe: é um conjunto de decisões testáveis, observáveis e seguras."
  }
);
advancedTeacherSteps.cpp.push(
  {
    "title": "Capstone C++: sistema completo",
    "copy": "O desafio final reúne modelação, RAII, coleções, erros, testes e concorrência segura.",
    "code": [
      "receber configuração",
      "criar serviço com RAII",
      "processar tarefas",
      "testar e medir"
    ],
    "focus": 0,
    "focusLabel": "integrar sistema",
    "explanation": "Um sistema C++ robusto combina desempenho com propriedade clara de recursos, contratos e testes."
  }
);
for (const [language, steps] of Object.entries(advancedTeacherSteps)) {
  const remaining = 50 - teacherLessons[language].steps.length;
  teacherLessons[language].steps.push(...steps.slice(0, remaining));
}
let teacherLanguage = null;
let teacherStepIndex = 0;
let teacherIntroPending = false;
let teacherRenderedLines = [];
let teacherAnimationId = 0;
const teacherWait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function eraseTeacherCode(animationId) {
  const code = $('teacher-code');
  while (teacherRenderedLines.length && animationId === teacherAnimationId) {
    teacherRenderedLines.pop();
    code.innerHTML = teacherRenderedLines.join('');
    await teacherWait(35);
  }
}

async function writeTeacherCode(step, animationId) {
  const code = $('teacher-code');
  teacherRenderedLines = [];
  const codeLines = step.code.flatMap((line) => String(line).split(/\r?\n/));
  codeLines.forEach((line, index) => teacherRenderedLines.push(`<span class="teacher-code-line ${index === step.focus ? 'is-focus' : ''}">${highlightCode(line) || ' '}</span>`));
  const lines = [...teacherRenderedLines];
  teacherRenderedLines = [];
  code.innerHTML = '';
  for (const line of lines) {
    if (animationId !== teacherAnimationId) return;
    teacherRenderedLines.push(line);
    code.innerHTML = teacherRenderedLines.join('');
    await teacherWait(70);
  }
}

async function renderTeacherStep(announce = true) {
  const lesson = teacherLessons[teacherLanguage];
  const step = lesson.steps[teacherStepIndex];
  const animationId = ++teacherAnimationId;
  $('teacher-progress').textContent = `PASSO ${teacherStepIndex + 1} / ${lesson.steps.length}`;
  $('teacher-language-label').textContent = lesson.label;
  $('teacher-focus-label').textContent = `FOCO: ${step.focusLabel.toUpperCase()}`;
  $('teacher-step-title').textContent = step.title;
  $('teacher-step-copy').textContent = step.copy;
  $('teacher-explanation').textContent = step.explanation;
  $('teacher-understood-state').textContent = teacherStepIndex === lesson.steps.length - 1 ? 'Último passo desta aula.' : 'Ouve a explicação do Mrzinho. Quando estiver claro, avança no teu ritmo.';
  $('teacher-understood').innerHTML = teacherStepIndex === lesson.steps.length - 1 ? 'Terminei a aula <span>✓</span>' : 'Entendi <span>→</span>';
  $('teacher-code').setAttribute('aria-label', `Exemplo de código. Foco: ${step.focusLabel}`);
  await eraseTeacherCode(animationId);
  if (animationId !== teacherAnimationId) return;
  await writeTeacherCode(step, animationId);
  if (announce) assistantSay(`${step.title}. ${step.copy} ${step.explanation}`, { speak: true });
}

function openTeacherClass() {
  $('mrzinho-class-screen').hidden = false;
  $('teacher-picker').hidden = false;
  $('teacher-lesson').hidden = true;
  document.body.classList.add('teacher-open');
  $('teacher-close').focus();
}

function closeTeacherClass() {
  $('mrzinho-class-screen').hidden = true;
  document.body.classList.remove('teacher-open');
  teacherAnimationId++;
}

function renderTeacherIntroduction() {
  const lesson = teacherLessons[teacherLanguage];
  const language = lesson.label;
  const intro = `Olá! Eu sou o Mrzinho. Nesta trilha de ${language}, vamos avançar do básico ao avançado, um conceito de cada vez. Eu vou mostrar código, explicar a linha principal e falar contigo antes de cada passo. Quando a ideia estiver clara, carrega em “Entendi” para começarmos. Podes pedir para repetir sempre que precisares.`;
  $('teacher-progress').textContent = `INTRODUÇÃO · ${lesson.steps.length} PASSOS`;
  $('teacher-language-label').textContent = language;
  $('teacher-focus-label').textContent = 'COMO VAI FUNCIONAR';
  $('teacher-step-title').textContent = 'Antes de começar';
  $('teacher-step-copy').textContent = `Vou acompanhar-te em ${lesson.steps.length} passos: fundamentos, prática, conceitos intermédios e temas avançados.`;
  $('teacher-explanation').textContent = 'Ouve a introdução, observa o formato e avança quando estiveres pronto. Cada passo tem código, explicação e voz do Mrzinho.';
  $('teacher-understood-state').textContent = 'Quando ouvires a introdução, carrega em “Entendi” para iniciar o passo 1.';
  $('teacher-understood').innerHTML = 'Entendi, começar a aula <span>→</span>';
  $('teacher-code').setAttribute('aria-label', `Introdução à trilha ${language}`);
  const introStep = { code: ['1. Ouvir a explicação', '2. Ver o código', '3. Experimentar e avançar'], focus: 0 };
  const animationId = ++teacherAnimationId;
  eraseTeacherCode(animationId).then(() => writeTeacherCode(introStep, animationId));
  assistantSay(intro, { speak: true });
}
function startTeacherLesson(language) {
  teacherLanguage = language;
  teacherStepIndex = 0;
  teacherIntroPending = true;
  voiceEnabled = true;
  localStorage.setItem('w69-codelab:mrzinho-voice', 'on');
  updateVoiceControl();
  $('teacher-picker').hidden = true;
  $('teacher-lesson').hidden = false;
  renderTeacherIntroduction();
}

function bindTeacherClass() {
  $('mrzinho-class-button')?.addEventListener('click', openTeacherClass);
  $('teacher-hero-button')?.addEventListener('click', openTeacherClass);
  $('teacher-close')?.addEventListener('click', closeTeacherClass);
  $('mrzinho-class-screen')?.addEventListener('click', (event) => { if (event.target === $('mrzinho-class-screen')) closeTeacherClass(); });
  document.querySelectorAll('[data-teacher-language]').forEach((button) => button.addEventListener('click', () => startTeacherLesson(button.dataset.teacherLanguage)));
  $('teacher-back-picker')?.addEventListener('click', () => { $('teacher-picker').hidden = false; $('teacher-lesson').hidden = true; teacherAnimationId++; });
  $('teacher-speak')?.addEventListener('click', () => speakMrzinho());
  $('teacher-not-understood')?.addEventListener('click', async () => { const step = teacherLessons[teacherLanguage].steps[teacherStepIndex]; assistantSay(`Vamos repetir. ${step.explanation}`, { speak: true }); await renderTeacherStep(false); $('teacher-understood-state').textContent = 'Sem problema. Repetimos devagar — mantém o foco na linha sublinhada.'; });
  $('teacher-understood')?.addEventListener('click', () => { if (teacherIntroPending) { teacherIntroPending = false; renderTeacherStep(true); return; } const last = teacherLessons[teacherLanguage].steps.length - 1; if (teacherStepIndex >= last) { $('teacher-understood-state').textContent = 'Aula concluída. Podes escolher outra linguagem quando quiseres.'; assistantSay('Muito bem. Terminaste esta aula guiada. A seguir podemos praticar com uma missão.', { speak: true }); return; } teacherStepIndex += 1; renderTeacherStep(true); });
}

bindTeacherClass();
if (new URLSearchParams(window.location.search).get('teacher') === '1') window.setTimeout(openTeacherClass, 180);
