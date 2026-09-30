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
  javascript: {
    label: 'JAVASCRIPT',
    steps: [
      { title: 'O que é uma instrução?', copy: 'Começamos pelo mais pequeno: uma instrução diz ao computador uma coisa concreta para fazer.', code: ['const mensagem = "Olá!";', 'console.log(mensagem);'], focus: 1, focusLabel: 'executar uma mensagem', explanation: 'console.log pede ao navegador para mostrar o valor entre parênteses. Primeiro guardamos a mensagem; depois mostramos essa mensagem.' },
      { title: 'Guardar informação', copy: 'Uma variável é uma caixa com nome. O nome ajuda-nos a encontrar o valor mais tarde.', code: ['let pontos = 10;', 'pontos = pontos + 5;', 'console.log(pontos);'], focus: 1, focusLabel: 'atualizar o valor', explanation: 'let cria uma variável. A segunda linha lê os pontos antigos, soma 5 e guarda o novo resultado na mesma caixa.' },
      { title: 'Tomar decisões', copy: 'O programa pode escolher um caminho. A palavra if significa “se isto for verdade”.', code: ['const idade = 18;', 'if (idade >= 18) {', '  console.log("Pode entrar");', '}'], focus: 1, focusLabel: 'condição', explanation: 'A condição entre parênteses é uma pergunta. Se a resposta for verdadeira, o bloco entre chavetas é executado.' },
      { title: 'Repetir sem copiar', copy: 'Um ciclo repete uma ação. Assim o computador faz o trabalho várias vezes por nós.', code: ['for (let i = 0; i < 3; i++) {', '  console.log("Olá", i);', '}'], focus: 0, focusLabel: 'repetição', explanation: 'O for começa em zero, continua enquanto i for menor que 3 e aumenta i no fim de cada volta.' },
      { title: 'Juntar as ideias', copy: 'Agora já consegues guardar dados, tomar decisões e repetir ações. É assim que pequenos programas crescem.', code: ['const nomes = ["Ana", "Kito", "Lia"];', 'for (const nome of nomes) {', '  console.log("Olá, " + nome);', '}'], focus: 1, focusLabel: 'percorrer dados', explanation: 'A lista guarda vários nomes. O for...of visita cada nome, um de cada vez, e usa-o na saudação.' }
    ]
  },
  python: {
    label: 'PYTHON',
    steps: [
      { title: 'Dar uma ordem', copy: 'Em Python, começamos com instruções simples e muito legíveis.', code: ['mensagem = "Olá!"', 'print(mensagem)'], focus: 1, focusLabel: 'mostrar no ecrã', explanation: 'print mostra um valor. A variável mensagem guarda o texto para podermos reutilizá-lo.' },
      { title: 'Guardar e alterar', copy: 'Uma variável é um nome ligado a um valor. Podemos atualizar esse valor quando algo muda.', code: ['pontos = 10', 'pontos = pontos + 5', 'print(pontos)'], focus: 1, focusLabel: 'atualizar dados', explanation: 'Python lê a linha da direita primeiro: pega nos pontos atuais, soma 5 e guarda o resultado.' },
      { title: 'Escolher um caminho', copy: 'if permite que o programa tome uma decisão com base numa condição.', code: ['idade = 18', 'if idade >= 18:', '    print("Pode entrar")'], focus: 1, focusLabel: 'decisão', explanation: 'Os dois pontos abrem o bloco. A indentação mostra ao Python quais linhas pertencem à decisão.' },
      { title: 'Repetir uma ação', copy: 'for visita os itens de uma sequência, um de cada vez.', code: ['for numero in range(3):', '    print("Volta", numero)'], focus: 0, focusLabel: 'ciclo', explanation: 'range(3) fornece três valores. O bloco indentado corre uma vez para cada valor.' },
      { title: 'Organizar com funções', copy: 'Uma função dá um nome a uma tarefa para podermos chamá-la quando for preciso.', code: ['def saudar(nome):', '    return "Olá, " + nome', '', 'print(saudar("Kito"))'], focus: 0, focusLabel: 'função', explanation: 'def cria uma função. O parâmetro nome recebe um valor e return devolve o resultado para quem chamou.' }
    ]
  },
  cpp: {
    label: 'C++',
    steps: [
      { title: 'Ler um programa', copy: 'Em C++, começamos por perceber a ordem das instruções que o computador vai executar.', code: ['int pontos = 10;', 'cout << pontos << endl;'], focus: 1, focusLabel: 'saída', explanation: 'cout envia informação para o terminal. endl termina a linha, como carregar no Enter.' },
      { title: 'Tipos de dados', copy: 'O tipo int diz que vamos guardar um número inteiro.', code: ['int pontos = 10;', 'int bonus = 5;', 'cout << pontos + bonus << endl;'], focus: 0, focusLabel: 'tipo inteiro', explanation: 'Declarar o tipo ajuda o compilador a saber que operações são permitidas para este valor.' },
      { title: 'Uma decisão', copy: 'if abre um caminho que só é executado quando a condição é verdadeira.', code: ['int idade = 18;', 'if (idade >= 18) {', '    cout << "Pode entrar" << endl;', '}'], focus: 1, focusLabel: 'condição', explanation: 'As chavetas agrupam as instruções da decisão. A comparação verifica se idade é maior ou igual a 18.' },
      { title: 'Uma repetição', copy: 'for descreve um início, uma condição e uma mudança para cada volta.', code: ['for (int i = 0; i < 3; i++) {', '    cout << i << endl;', '}'], focus: 0, focusLabel: 'ciclo for', explanation: 'i começa em zero, o ciclo continua enquanto i for menor que 3 e i++ aumenta o contador.' },
      { title: 'Pensar em funções', copy: 'Uma função transforma uma ideia numa peça que podemos reutilizar.', code: ['int somar(int a, int b) {', '    return a + b;', '}', 'cout << somar(2, 3) << endl;'], focus: 0, focusLabel: 'função', explanation: 'A função recebe dois inteiros e devolve a soma. Depois chamamos somar com os valores que queremos.' }
    ]
  },
  logic: {
    label: 'LÓGICA',
    steps: [
      { title: 'Decompor um problema', copy: 'Antes de escrever código, transforma uma tarefa grande em passos pequenos.', code: ['1. Receber os dados', '2. Transformar os dados', '3. Mostrar o resultado'], focus: 0, focusLabel: 'entrada', explanation: 'Quase todo programa tem entrada, transformação e saída. Esta sequência dá-nos um mapa para pensar.' },
      { title: 'Comparar', copy: 'Uma condição é uma pergunta que pode ser verdadeira ou falsa.', code: ['idade >= 18  →  verdadeiro', 'idade < 18   →  falso'], focus: 0, focusLabel: 'comparação', explanation: 'Os símbolos >, < e = ajudam o programa a comparar valores e escolher o caminho certo.' },
      { title: 'Escolher', copy: 'Quando uma resposta é verdadeira, seguimos um caminho; quando é falsa, seguimos outro.', code: ['SE chuva', '  levar guarda-chuva', 'SENÃO', '  sair sem guarda-chuva'], focus: 0, focusLabel: 'decisão', explanation: 'Escrever a decisão em linguagem humana antes do código evita que a sintaxe esconda a ideia.' },
      { title: 'Repetir', copy: 'Quando uma ação se repete, procuramos o padrão e descrevemos quando parar.', code: ['enquanto ainda houver itens:', '  pegar no próximo item', '  tratar o item'], focus: 0, focusLabel: 'repetição', explanation: 'Um ciclo precisa de uma condição de paragem. Sem ela, o programa pode continuar para sempre.' },
      { title: 'Criar um algoritmo', copy: 'Agora junta os passos numa receita que outra pessoa conseguiria seguir.', code: ['receber nome', 'se nome estiver vazio:', '  pedir nome novamente', 'senão:', '  mostrar saudação'], focus: 1, focusLabel: 'regra', explanation: 'Um algoritmo claro pode ser traduzido para JavaScript, Python, C++ ou outra linguagem. Primeiro vem o raciocínio.' }
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
  $('teacher-close')?.addEventListener('click', closeTeacherClass);
  $('mrzinho-class-screen')?.addEventListener('click', (event) => { if (event.target === $('mrzinho-class-screen')) closeTeacherClass(); });
  document.querySelectorAll('[data-teacher-language]').forEach((button) => button.addEventListener('click', () => startTeacherLesson(button.dataset.teacherLanguage)));
  $('teacher-back-picker')?.addEventListener('click', () => { $('teacher-picker').hidden = false; $('teacher-lesson').hidden = true; teacherAnimationId++; });
  $('teacher-not-understood')?.addEventListener('click', async () => { const step = teacherLessons[teacherLanguage].steps[teacherStepIndex]; assistantSay(`Vamos repetir. ${step.explanation}`, { speak: true }); await renderTeacherStep(false); $('teacher-understood-state').textContent = 'Sem problema. Repetimos devagar — mantém o foco na linha sublinhada.'; });
  $('teacher-understood')?.addEventListener('click', () => { const last = teacherLessons[teacherLanguage].steps.length - 1; if (teacherStepIndex >= last) { $('teacher-understood-state').textContent = 'Aula concluída. Podes escolher outra linguagem quando quiseres.'; assistantSay('Muito bem. Terminaste esta aula guiada. A seguir podemos praticar com uma missão.', { speak: true }); return; } teacherStepIndex += 1; renderTeacherStep(true); });
}

bindTeacherClass();
