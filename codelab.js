import { tracks, placementQuestions } from './codelab-curriculum.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  GoogleAuthProvider, browserLocalPersistence, createUserWithEmailAndPassword,
  getAuth, getRedirectResult, onAuthStateChanged, sendPasswordResetEmail,
  setPersistence, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const $ = (id) => document.getElementById(id);
const firebaseConfig = {
  apiKey: 'AIzaSyC_FrApgE4TYfrBnq4urrWac9oiLavecMg',
  authDomain: 'world-69.firebaseapp.com',
  projectId: 'world-69'
};
const firebaseApp = initializeApp(firebaseConfig, 'World69CodeLab');
const auth = getAuth(firebaseApp);
auth.languageCode = 'pt';
const appReady = setPersistence(auth, browserLocalPersistence).catch(() => {});

const initialState = () => ({ version: 1, profile: null, completed: [], drafts: {}, diagnosticScore: null, recommendedTrack: 'logic' });
let state = initialState();
let currentUser = null;
let selectedAvatar = '🦊';
let selectedTrack = 'logic';
let activeLesson = null;
let currentHint = 0;
let toastTimer = 0;
let authReadyResolve;
const authReady = new Promise((resolve) => { authReadyResolve = resolve; });

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

function storageKey() { return currentUser ? `student:${currentUser.uid}` : 'guest'; }

async function loadProgress() {
  const key = storageKey();
  const stored = await readStored(key);
  if (stored && typeof stored === 'object') {
    state = { ...initialState(), ...stored };
    state.completed = Array.isArray(state.completed) ? state.completed : [];
    state.drafts = state.drafts && typeof state.drafts === 'object' ? state.drafts : {};
  } else {
    state = initialState();
    if (currentUser) {
      const guest = await readStored('guest');
      if (guest && typeof guest === 'object' && (guest.profile || (guest.completed || []).length)) {
        state = { ...state, ...guest, completed: [...(guest.completed || [])], drafts: { ...(guest.drafts || {}) } };
        await writeStored(key, state);
      }
    }
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
  updateAuthControls();
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

function renderDashboard() {
  const name = state.profile?.name?.trim() || (currentUser?.displayName?.split(' ')[0]) || 'explorador';
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
  if (!currentUser) $('workspace-save').textContent = 'Guardar no navegador';
  else $('workspace-save').textContent = 'Guardado neste navegador';
}

function renderTracks() {
  $('track-grid').innerHTML = tracks.map((track) => {
    const completed = countCompleted(track);
    const percent = Math.round(completed / track.lessons.length * 100);
    return `<article class="track-card">
      <div class="track-card-top"><span class="track-icon" aria-hidden="true">${escapeHtml(track.icon)}</span><span class="track-level">${escapeHtml(track.level)}</span></div>
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
  $('lessons-title').textContent = track.title;
  $('lessons-intro').textContent = track.description;
  $('lesson-list').innerHTML = track.lessons.map((lesson, index) => {
    const complete = state.completed.includes(lesson.id);
    const kind = lesson.language === 'cpp' ? 'C++ · leitura guiada' : lesson.kind === 'choice' ? 'Lógica' : lesson.language === 'python' ? 'Python' : 'JavaScript';
    return `<article class="lesson-row ${complete ? 'is-complete' : ''}">
      <span class="lesson-number">${complete ? '✓' : String(index + 1).padStart(2, '0')}</span>
      <div><h3>${escapeHtml(lesson.title)}</h3><p>${escapeHtml(lesson.objective)} · ${kind}</p></div>
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
  $('dashboard').hidden = true;
  $('lesson-workspace').hidden = false;
  $('workspace-progress').textContent = `${track.title.toUpperCase()} · ${lesson.duration} MIN`;
  $('lesson-meta').textContent = `MISSÃO · ${lesson.duration} MIN · ${lesson.language === 'cpp' ? 'C++ GUIADO' : lesson.kind === 'choice' ? 'LÓGICA' : lesson.language.toUpperCase()}`;
  $('lesson-title').textContent = lesson.title;
  $('lesson-story').textContent = lesson.story;
  $('lesson-explanation').textContent = lesson.lesson;
  $('mission-objective').textContent = lesson.objective;
  $('mission-icon').textContent = track.icon;
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
  $('lesson-workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderChallenge(lesson) {
  const area = $('challenge-area');
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
    <label class="field-caption" for="code-editor">O TEU CÓDIGO</label>
    <textarea class="code-editor" id="code-editor" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Editor de código"></textarea>
    <div class="editor-toolbar"><span class="editor-language">${lesson.language.toUpperCase()} · execução isolada</span><button class="run-button" id="run-code" type="button"><span aria-hidden="true">▶</span> Executar e verificar</button></div>
    <pre class="code-output" id="code-output" aria-live="polite">A saída do teu programa aparece aqui.</pre>`;
  $('code-editor').value = typeof savedDraft === 'string' ? savedDraft : lesson.starter;
  let draftTimer = 0;
  $('code-editor').addEventListener('input', () => {
    state.drafts[lesson.id] = $('code-editor').value.slice(0, 5000);
    window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(() => saveProgress(), 350);
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
  } else {
    hintBox.textContent = 'Já viste todas as dicas. Experimenta resolver em passos pequenos — ou consulta uma solução para aprender com ela.';
    hintBox.hidden = false;
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

function friendlyAuthError(error) {
  const code = error?.code || '';
  if (code === 'auth/unauthorized-domain') return 'Este domínio ainda precisa de ser autorizado em Firebase Authentication → Settings → Authorized domains.';
  if (code === 'auth/operation-not-allowed') return 'Este método de entrada ainda não está ativo em Firebase Authentication → Sign-in method.';
  if (code === 'auth/popup-closed-by-user') return 'A janela de entrada foi fechada. Quando quiseres, tenta de novo.';
  if (code === 'auth/popup-blocked') return 'O navegador bloqueou a janela. Tenta novamente ou permite pop-ups para este site.';
  if (code === 'auth/email-already-in-use') return 'Este email já tem conta. Experimenta entrar em vez de criar conta.';
  if (code === 'auth/weak-password') return 'Escolhe uma senha com pelo menos 6 caracteres.';
  if (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') return 'Email ou senha não reconhecidos. Confere os dados ou pede para redefinir a senha.';
  if (code === 'auth/network-request-failed') return 'Sem ligação ao Firebase neste momento. Confere a Internet e tenta novamente.';
  return 'Não foi possível concluir a entrada agora. Tenta novamente ou confere a configuração de autenticação do Firebase.';
}

function updateAuthControls() {
  const openButton = $('open-auth');
  const userChip = $('user-chip');
  if (currentUser) {
    openButton.hidden = true;
    userChip.hidden = false;
    userChip.textContent = `${state.profile?.avatar || '●'} ${currentUser.displayName?.split(' ')[0] || currentUser.email?.split('@')[0] || 'Conta'} · sair`;
    userChip.title = `Conta autenticada: ${currentUser.email || currentUser.uid}. O progresso está guardado localmente neste navegador.`;
  } else {
    userChip.hidden = true;
    openButton.hidden = false;
  }
}

function openAuth() {
  $('auth-overlay').hidden = false;
  $('auth-message').textContent = '';
  $('auth-email').focus();
}

function closeAuth() { $('auth-overlay').hidden = true; }

async function setupAuth() {
  try { await getRedirectResult(auth); } catch (error) { $('auth-message').textContent = friendlyAuthError(error); }
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    await loadProgress();
    if (user && !$('auth-overlay').hidden) closeAuth();
    authReadyResolve();
  });
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
  $('open-auth').addEventListener('click', openAuth);
  $('close-auth').addEventListener('click', closeAuth);
  $('auth-overlay').addEventListener('click', (event) => { if (event.target === $('auth-overlay')) closeAuth(); });
  $('user-chip').addEventListener('click', async () => {
    if (currentUser) {
      await signOut(auth);
      showToast('Saíste da conta. O progresso deste navegador continua guardado.');
    }
  });
  $('google-signin').addEventListener('click', async () => {
    $('auth-message').textContent = 'A abrir o acesso Google seguro…';
    try {
      await appReady;
      const provider = new GoogleAuthProvider();
      if (window.matchMedia('(max-width: 700px)').matches) await signInWithRedirect(auth, provider);
      else await signInWithPopup(auth, provider);
    } catch (error) { $('auth-message').textContent = friendlyAuthError(error); }
  });
  $('student-auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    $('auth-message').textContent = 'A verificar…';
    try {
      await appReady;
      await signInWithEmailAndPassword(auth, $('auth-email').value.trim(), $('auth-password').value);
      closeAuth();
    } catch (error) { $('auth-message').textContent = friendlyAuthError(error); }
  });
  $('email-signup').addEventListener('click', async () => {
    if (!$('student-auth-form').reportValidity()) return;
    $('auth-message').textContent = 'A criar a tua conta segura…';
    try {
      await appReady;
      await createUserWithEmailAndPassword(auth, $('auth-email').value.trim(), $('auth-password').value);
      closeAuth();
      showToast('Conta criada. Bem-vindo ao CodeLab.');
    } catch (error) { $('auth-message').textContent = friendlyAuthError(error); }
  });
  $('reset-password').addEventListener('click', async () => {
    const email = $('auth-email').value.trim();
    if (!email) { $('auth-message').textContent = 'Escreve o teu email no campo acima e tenta outra vez.'; return; }
    try {
      await sendPasswordResetEmail(auth, email);
      $('auth-message').textContent = 'Se existir uma conta para esse email, o Firebase enviará instruções de recuperação.';
    } catch (error) { $('auth-message').textContent = friendlyAuthError(error); }
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('auth-overlay').hidden) closeAuth(); });
}

bindEvents();
setupAuth().catch((error) => {
  $('auth-message').textContent = friendlyAuthError(error);
  loadProgress().catch(() => render());
  authReadyResolve();
});

// Expose a small, read-only QA hook for browser validation; no account data is returned.
window.__world69CodelabReady = authReady.then(() => ({
  tracks: tracks.length,
  lessonCount: tracks.reduce((sum, track) => sum + track.lessons.length, 0),
  storage: 'indexeddb-with-localstorage-fallback',
  auth: Boolean(auth)
}));
