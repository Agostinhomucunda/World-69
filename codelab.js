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
let lastMrzinhoText = '';

function preferredVoice() {
  if (!voiceAvailable) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => /^pt-PT/i.test(voice.lang)) || voices.find((voice) => /^pt-BR/i.test(voice.lang)) || voices.find((voice) => /^pt/i.test(voice.lang)) || null;
}

function speakMrzinho(text = lastMrzinhoText) {
  if (!voiceAvailable || !voiceEnabled || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-PT';
  utterance.rate = 0.94;
  utterance.pitch = 1.04;
  const voice = preferredVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

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

function updateVoiceControl() {
  const button = $('mrzinho-voice');
  if (!button) return;
  button.setAttribute('aria-pressed', String(voiceEnabled));
  button.innerHTML = `<span>${voiceEnabled ? '●' : '○'}</span> ${voiceEnabled ? 'voz ativa' : 'voz pausada'}`;
  $('mrzinho')?.classList.toggle('voice-off', !voiceEnabled);
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
let teacherLanguage = null;
let teacherStepIndex = 0;
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
  step.code.forEach((line, index) => teacherRenderedLines.push(`<span class="teacher-code-line ${index === step.focus ? 'is-focus' : ''}">${highlightCode(line) || ' '}</span>`));
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
  $('teacher-understood-state').textContent = teacherStepIndex === lesson.steps.length - 1 ? 'Último passo desta aula.' : 'Quando estiver claro, avança no teu ritmo.';
  $('teacher-understood').innerHTML = teacherStepIndex === lesson.steps.length - 1 ? 'Terminei a aula <span>✓</span>' : 'Entendi <span>→</span>';
  $('teacher-code').setAttribute('aria-label', `Exemplo de código. Foco: ${step.focusLabel}`);
  await eraseTeacherCode(animationId);
  if (animationId !== teacherAnimationId) return;
  await writeTeacherCode(step, animationId);
  if (announce) assistantSay(`${step.title}. ${step.copy}`, { speak: true });
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

function startTeacherLesson(language) {
  teacherLanguage = language;
  teacherStepIndex = 0;
  $('teacher-picker').hidden = true;
  $('teacher-lesson').hidden = false;
  renderTeacherStep(true);
}

function bindTeacherClass() {
  $('mrzinho-class-button')?.addEventListener('click', openTeacherClass);
  $('teacher-hero-button')?.addEventListener('click', openTeacherClass);
  $('teacher-close')?.addEventListener('click', closeTeacherClass);
  $('mrzinho-class-screen')?.addEventListener('click', (event) => { if (event.target === $('mrzinho-class-screen')) closeTeacherClass(); });
  document.querySelectorAll('[data-teacher-language]').forEach((button) => button.addEventListener('click', () => startTeacherLesson(button.dataset.teacherLanguage)));
  $('teacher-back-picker')?.addEventListener('click', () => { $('teacher-picker').hidden = false; $('teacher-lesson').hidden = true; teacherAnimationId++; });
  $('teacher-not-understood')?.addEventListener('click', async () => { const step = teacherLessons[teacherLanguage].steps[teacherStepIndex]; assistantSay(`Vamos repetir. ${step.explanation}`, { speak: true }); await renderTeacherStep(false); $('teacher-understood-state').textContent = 'Sem problema. Repetimos devagar — mantém o foco na linha sublinhada.'; });
  $('teacher-understood')?.addEventListener('click', () => { const last = teacherLessons[teacherLanguage].steps.length - 1; if (teacherStepIndex >= last) { $('teacher-understood-state').textContent = 'Aula concluída. Podes escolher outra linguagem quando quiseres.'; assistantSay('Muito bem. Terminaste esta aula guiada. A seguir podemos praticar com uma missão.', { speak: true }); return; } teacherStepIndex += 1; renderTeacherStep(true); });
}

bindTeacherClass();
if (new URLSearchParams(window.location.search).get('teacher') === '1') window.setTimeout(openTeacherClass, 180);
