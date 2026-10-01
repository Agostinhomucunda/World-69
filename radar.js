const DATA_URL = './radar.generated.json';
const DETAILS_URL = './radar-details.generated.json';
const METRICS_URL = new URL('api/radar-metrics', window.location.href).toString();
const PAGE_SIZE = 24;
const DEFAULT_COUNTRIES = ['Angola', 'Brasil', 'Portugal', 'Moçambique', 'África do Sul', 'Cabo Verde', 'Estados Unidos', 'Reino Unido', 'Canadá', 'Remoto/Global'];
const CATEGORY_LABELS = {
  programming: 'Programação', websites: 'Websites', applications: 'Aplicações', ai: 'IA', cybersecurity: 'Cibersegurança',
  design: 'Design', video: 'Vídeo', audio: 'Áudio', social: 'Redes sociais', teaching: 'Ensino / Tutoria', employment: 'Emprego',
  freelance: 'Freelance', internship: 'Estágio', projects: 'Projetos', remote: 'Remoto'
};
const TYPE_LABELS = {
  'open-source contribution': 'Contribuição open-source',
  'community post · unverified': 'Pista social · não verificada',
  'freelance/contract': 'Freelance / contrato',
  internship: 'Estágio', training: 'Ensino / formação', employment: 'Emprego'
};
const SOURCE_STATUS = {
  ok: 'Disponível', degraded: 'Parcial', unavailable: 'Indisponível', approval_required: 'Aprovação necessária',
  not_configured: 'Não configurada', credentials_required: 'Credenciais necessárias', terms_pending: 'Termos por validar',
  adapter_pending: 'Integração pendente'
};
const SYNONYMS = [
  [/\b(programador|programadora|programação|programacao|developer|programmer|coding)\b/i, ['developer', 'programmer', 'software engineer', 'programming', 'coding', 'programador']],
  [/\b(emprego|vaga|vagas|job|jobs|hiring|vacancy|vacancies|career)\b/i, ['job', 'jobs', 'hiring', 'vacancy', 'emprego', 'vaga', 'carreira']],
  [/\b(estágio|estagio|intern|internship|trainee)\b/i, ['intern', 'internship', 'trainee', 'estágio', 'estagio']],
  [/\b(freelance|freelancer|freelancing|independent)\b/i, ['freelance', 'freelancer', 'contractor', 'independent']],
  [/\b(designer|design|designer gráfico|designer grafico)\b/i, ['designer', 'design', 'graphic design', 'ui designer', 'ux designer']],
  [/\b(website|websites|site|sites|web)\b/i, ['website', 'web development', 'web developer', 'wordpress', 'front-end', 'frontend']],
  [/\b(ia|ai|inteligência artificial|inteligencia artificial)\b/i, ['artificial intelligence', 'machine learning', 'generative ai', 'ia', ' ai ']],
  [/\b(cibersegurança|ciberseguranca|cybersecurity|security)\b/i, ['cybersecurity', 'infosec', 'security engineer', 'pentest', 'cibersegurança']],
  [/\b(tutor|tutoria|professor|ensino|aula|teacher|teaching|training)\b/i, ['teacher', 'tutor', 'teaching', 'instructor', 'training', 'professor', 'tutoria']],
  [/\b(remoto|remote|global|worldwide)\b/i, ['remote', 'remoto', 'global', 'worldwide', 'anywhere']]
];

const els = {
  form: document.querySelector('#radar-filter-form'), search: document.querySelector('#radar-search'), country: document.querySelector('#radar-country'),
  category: document.querySelector('#radar-category'), period: document.querySelector('#radar-period'), sort: document.querySelector('#radar-sort'),
  feed: document.querySelector('#radar-feed'), count: document.querySelector('#radar-results-count'), note: document.querySelector('#radar-refresh-note'),
  updated: document.querySelector('#radar-updated-at'), total: document.querySelector('#radar-opportunity-count'), sourcesCount: document.querySelector('#radar-source-count'),
  sources: document.querySelector('#radar-source-list'), sortContext: document.querySelector('#radar-sort-context'), more: document.querySelector('#radar-load-more')
};

const state = { items: [], sources: [], coverageNotes: [], metrics: {}, metricsAvailable: false, page: 1, busy: false, quickCategory: 'all', observer: null, trackedThisPage: new Set() };
let descriptionsPromise = null;

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-PT').replace(/\s+/g, ' ').trim();
}

function expandedQueries(query) {
  const normalized = normalize(query);
  if (!normalized) return [];
  const terms = new Set([normalized]);
  for (const [pattern, additions] of SYNONYMS) {
    if (pattern.test(query)) additions.forEach((term) => terms.add(normalize(term)));
  }
  return [...terms].filter(Boolean);
}

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = safeDate(value);
  if (!date) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function formatRelativeDate(value) {
  const date = safeDate(value);
  if (!date) return 'Data não informada';
  const ageMinutes = Math.floor(Math.max(0, Date.now() - date.getTime()) / 60000);
  if (ageMinutes < 1) return 'agora';
  if (ageMinutes < 60) return `há ${ageMinutes} min`;
  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24) return ageHours === 1 ? 'há 1 hora' : `há ${ageHours} horas`;
  const ageDays = Math.floor(ageHours / 24);
  if (ageDays === 1) return 'ontem';
  if (ageDays < 7) return `há ${ageDays} dias`;
  return formatDate(date.toISOString());
}

function escapeId(value) {
  return String(value ?? '').slice(0, 128);
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return '';
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
}

function sourceLinkRel(sourceName) {
  return normalize(sourceName).includes('remote ok') ? 'noopener noreferrer' : 'nofollow noopener noreferrer';
}

function loadDescriptions() {
  if (!descriptionsPromise) {
    descriptionsPromise = fetch(DETAILS_URL, { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`details_${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!data || data.schemaVersion !== 1 || !data.descriptions || typeof data.descriptions !== 'object') throw new Error('details_schema_invalid');
        return data.descriptions;
      })
      .catch((error) => {
        descriptionsPromise = null;
        throw error;
      });
  }
  return descriptionsPromise;
}

function getVisitorId() {
  const key = 'world69:radar:visitor-v1';
  try {
    let id = localStorage.getItem(key);
    if (!id || !/^[A-Za-z0-9_-]{24,80}$/.test(id)) {
      const random = globalThis.crypto?.randomUUID?.().replaceAll('-', '') ?? `${Date.now()}${Math.random().toString(36).slice(2)}`;
      id = `w69r_${random}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return `w69r_${globalThis.crypto?.randomUUID?.().replaceAll('-', '') ?? Math.random().toString(36).slice(2)}`;
  }
}

function classifyType(item) {
  return TYPE_LABELS[item.type] || (item.type ? String(item.type) : 'Oportunidade');
}

function createEmpty(title, description, error = false) {
  const wrapper = document.createElement('div');
  wrapper.className = 'radar-empty-state';
  const mark = document.createElement('span');
  mark.className = error ? 'radar-empty-mark' : 'radar-empty-mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = error ? '!' : '⌕';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const text = document.createElement('p');
  text.textContent = description;
  wrapper.append(mark, heading, text);
  return wrapper;
}

function itemText(item) {
  return normalize([
    item.title, item.summary, item.description, item.company, item.project, item.country,
    ...(Array.isArray(item.categories) ? item.categories.map((category) => CATEGORY_LABELS[category] || category) : []),
    ...(Array.isArray(item.tags) ? item.tags : []), ...(Array.isArray(item.countries) ? item.countries : []), item.sourceName, item.type
  ].filter(Boolean).join(' '));
}

function itemRelevance(item, queryTerms, selectedCategory, selectedCountry) {
  const title = normalize(item.title);
  const searchable = itemText(item);
  let score = 0;
  for (const term of queryTerms) {
    if (title.includes(term)) score += term.length > 4 ? 8 : 5;
    else if (searchable.includes(term)) score += 2;
  }
  if (selectedCategory !== 'all' && item.categories?.includes(selectedCategory)) score += 2;
  const countryNames = Array.isArray(item.countries) ? item.countries : [item.country].filter(Boolean);
  if (selectedCountry !== 'all' && countryNames.some((name) => normalize(name) === normalize(selectedCountry))) score += 1;
  const published = safeDate(item.publishedAt);
  if (published) score += Math.max(0, 1 - (Date.now() - published.getTime()) / (30 * 86400000));
  return score;
}

function matchesFilters(item) {
  const query = els.search.value.trim();
  const queries = expandedQueries(query);
  const searchable = itemText(item);
  if (queries.length && !queries.some((term) => searchable.includes(term))) return false;
  const country = els.country.value;
  if (country !== 'all') {
    if (country === 'Remoto/Global') {
      if (!item.remote && normalize(item.country) !== normalize('Remoto/Global')) return false;
    } else {
      const countryNames = Array.isArray(item.countries) ? item.countries : [item.country].filter(Boolean);
      if (!countryNames.some((name) => normalize(name) === normalize(country))) return false;
    }
  }
  const category = state.quickCategory !== 'all' ? state.quickCategory : els.category.value;
  if (category !== 'all' && !(item.categories || []).includes(category)) return false;
  const period = els.period.value;
  if (period !== 'all') {
    const published = safeDate(item.publishedAt);
    if (!published) return false;
    const cutoff = Date.now() - Number(period) * 86400000;
    if (published.getTime() < cutoff) return false;
  }
  return true;
}

function getFilteredItems() {
  const result = state.items.filter(matchesFilters);
  const sort = els.sort.value;
  const queryTerms = expandedQueries(els.search.value.trim());
  const selectedCategory = state.quickCategory !== 'all' ? state.quickCategory : els.category.value;
  const selectedCountry = els.country.value;
  result.sort((a, b) => {
    if (sort === 'views' && state.metricsAvailable) {
      const aViews = state.metrics[escapeId(a.id)]?.views ?? 0;
      const bViews = state.metrics[escapeId(b.id)]?.views ?? 0;
      if (bViews !== aViews) return bViews - aViews;
    }
    if (sort === 'relevance') {
      const scoreDiff = itemRelevance(b, queryTerms, selectedCategory, selectedCountry) - itemRelevance(a, queryTerms, selectedCategory, selectedCountry);
      if (scoreDiff) return scoreDiff;
    }
    const aDate = safeDate(a.publishedAt)?.getTime() ?? 0;
    const bDate = safeDate(b.publishedAt)?.getTime() ?? 0;
    return bDate - aDate;
  });
  return result;
}

function createBadge(label, className = '') {
  const badge = document.createElement('span');
  badge.className = `radar-badge ${className}`.trim();
  badge.textContent = label;
  return badge;
}

function createSourceLinks(item) {
  const links = Array.isArray(item.sourceLinks) && item.sourceLinks.length ? item.sourceLinks : [{ name: item.sourceName || 'Fonte original', url: item.sourceUrl }];
  const valid = links.map((source) => ({ name: String(source.name || 'Fonte'), url: safeExternalUrl(source.url) })).filter((source) => source.url);
  const wrapper = document.createElement('div');
  wrapper.className = 'radar-source-caption';
  if (!valid.length) {
    wrapper.textContent = 'Origem não disponível';
    return wrapper;
  }
  const label = document.createElement('span');
  label.textContent = valid.length > 1 ? `Encontrada em ${valid.length} fontes · ` : 'Fonte: ';
  wrapper.append(label);
  const anchor = document.createElement('a');
  anchor.href = valid[0].url;
  anchor.target = '_blank';
  anchor.rel = sourceLinkRel(valid[0].name);
  anchor.textContent = valid[0].name;
  wrapper.append(anchor);
  if (valid.length > 1) {
    const details = document.createElement('details');
    details.className = 'radar-more-sources';
    const summary = document.createElement('summary');
    summary.textContent = 'Ver outras fontes';
    const list = document.createElement('ul');
    valid.slice(1).forEach((source) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = sourceLinkRel(source.name);
      link.textContent = source.name;
      li.append(link);
      list.append(li);
    });
    details.append(summary, list);
    wrapper.append(details);
  }
  return wrapper;
}

function createCard(item) {
  const article = document.createElement('article');
  article.className = 'radar-card';
  article.dataset.itemId = escapeId(item.id);

  const top = document.createElement('div');
  top.className = 'radar-card-top';
  const badges = document.createElement('div');
  badges.className = 'radar-card-badges';
  const categories = (Array.isArray(item.categories) ? item.categories : []).slice(0, 3);
  categories.forEach((category) => badges.append(createBadge(CATEGORY_LABELS[category] || String(category), 'radar-badge-category')));
  if (!categories.length) badges.append(createBadge(classifyType(item), 'radar-badge-category'));
  const social = item.trustLevel === 'social_unverified';
  if (social) badges.append(createBadge('Não verificada', 'radar-badge-social'));
  else if (item.status === 'UNKNOWN') badges.append(createBadge('Confirma na fonte'));
  const date = document.createElement('time');
  date.className = 'radar-card-date';
  date.textContent = formatRelativeDate(item.publishedAt);
  date.title = formatDate(item.publishedAt);
  const published = safeDate(item.publishedAt);
  if (published) date.dateTime = published.toISOString();
  top.append(badges, date);

  const heading = document.createElement('h3');
  heading.textContent = String(item.title || 'Oportunidade sem título');

  const meta = document.createElement('div');
  meta.className = 'radar-card-meta';
  const type = document.createElement('span');
  type.textContent = classifyType(item);
  meta.append(type);
  if (item.company) {
    const company = document.createElement('span');
    company.textContent = String(item.company);
    meta.append(company);
  } else if (item.project) {
    const project = document.createElement('span');
    project.textContent = `Projeto: ${String(item.project)}`;
    meta.append(project);
  }
  if (item.country && item.country !== 'Não informado') {
    const location = document.createElement('span');
    location.textContent = item.remote && item.country !== 'Remoto/Global' ? `${item.country} · remoto` : String(item.country);
    meta.append(location);
  }
  if (item.salary) {
    const salary = document.createElement('span');
    const label = document.createElement('b');
    label.textContent = String(item.salary);
    salary.append(label);
    meta.append(salary);
  }

  const summary = document.createElement('p');
  summary.className = 'radar-card-summary';
  summary.textContent = String(item.summary || 'A fonte não disponibiliza um resumo no feed. Consulta os detalhes na publicação original.');

  const content = [top, heading, meta, summary];
  if (item.hasDetails) {
    const details = document.createElement('details');
    const summaryLabel = document.createElement('summary');
    summaryLabel.textContent = 'Ver detalhes';
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Abre para carregar os detalhes da oportunidade.';
    details.addEventListener('toggle', async () => {
      if (!details.open || details.dataset.loaded === 'true' || details.dataset.loading === 'true') return;
      details.dataset.loading = 'true';
      paragraph.textContent = 'A carregar detalhes…';
      try {
        const descriptions = await loadDescriptions();
        paragraph.textContent = String(descriptions[escapeId(item.id)] || 'Sem detalhes adicionais; consulta a publicação original.');
        details.dataset.loaded = 'true';
      } catch {
        paragraph.textContent = 'Não foi possível carregar os detalhes. Consulta a publicação original.';
      } finally {
        delete details.dataset.loading;
      }
    });
    details.append(summaryLabel, paragraph);
    content.push(details);
  }

  const bottom = document.createElement('div');
  bottom.className = 'radar-card-bottom';
  bottom.append(createSourceLinks(item));
  if (state.metricsAvailable) {
    const count = state.metrics[escapeId(item.id)] || { views: 0, sourceClicks: 0 };
    const metrics = document.createElement('div');
    metrics.className = 'radar-card-metrics';
    const views = document.createElement('span');
    views.textContent = `◉ ${Number(count.views) || 0} visualizações`;
    const clicks = document.createElement('span');
    clicks.textContent = `↗ ${Number(count.sourceClicks) || 0} cliques na fonte`;
    metrics.append(views, clicks);
    bottom.append(metrics);
  }
  const originalUrl = safeExternalUrl(item.sourceUrl);
  const open = document.createElement('a');
  open.className = 'radar-open-source';
  open.href = originalUrl || '#';
  open.target = '_blank';
  open.rel = sourceLinkRel(item.sourceName || 'Fonte original');
  open.textContent = 'Ver na fonte';
  const arrow = document.createElement('span');
  arrow.textContent = '↗';
  open.append(arrow);
  if (!originalUrl) {
    open.removeAttribute('href');
    open.setAttribute('aria-disabled', 'true');
  } else {
    open.addEventListener('click', () => sendMetric('sourceClick', item.id));
  }
  bottom.append(open);
  content.push(bottom);
  article.append(...content);
  return article;
}

function updateQuickChips() {
  document.querySelectorAll('[data-quick-category]').forEach((button) => {
    const active = button.dataset.quickCategory === state.quickCategory;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function updateCountryOptions() {
  const discoveredCountries = state.items.flatMap((item) => Array.isArray(item.countries) ? item.countries.map((name) => String(name).trim()).filter(Boolean) : []);
  const available = new Set([...DEFAULT_COUNTRIES, ...discoveredCountries]);
  const current = els.country.value;
  const options = [...available].filter((value) => !['Todos os países', 'all'].includes(value)).sort((a, b) => {
    const ai = DEFAULT_COUNTRIES.indexOf(a);
    const bi = DEFAULT_COUNTRIES.indexOf(b);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    return a.localeCompare(b, 'pt-PT');
  });
  const first = els.country.querySelector('option[value="all"]');
  els.country.replaceChildren(first);
  for (const country of options) {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    els.country.append(option);
  }
  if ([...els.country.options].some((option) => option.value === current)) els.country.value = current;
}

function renderSourceList() {
  els.sources.replaceChildren();
  if (!state.sources.length) {
    els.sources.append(createEmpty('Estado de fontes ainda não publicado', 'As fontes aparecem quando a primeira sincronização conclui.'));
    return;
  }
  for (const source of state.sources) {
    const card = document.createElement('article');
    card.className = 'radar-source-card';
    const top = document.createElement('div');
    top.className = 'radar-source-card-top';
    const title = document.createElement('h3');
    title.textContent = String(source.name || source.id || 'Fonte');
    const badge = document.createElement('span');
    badge.className = 'radar-source-status';
    badge.dataset.status = String(source.status || 'unavailable');
    badge.textContent = SOURCE_STATUS[source.status] || 'Estado não confirmado';
    top.append(title, badge);
    const note = document.createElement('p');
    note.textContent = String(source.note || 'Fonte pública; confirma os detalhes no original.');
    const small = document.createElement('small');
    const lastSync = source.lastSyncAt ? `Última consulta: ${formatDate(source.lastSyncAt)}` : 'Ainda sem consulta confirmada';
    const cadence = Number(source.frequencyMinutes) > 0 ? ` · intervalo previsto ${source.frequencyMinutes} min` : '';
    small.textContent = `${lastSync}${cadence}`;
    card.append(top, note, small);
    els.sources.append(card);
  }
}

function renderCoverageNotes() {
  const container = document.querySelector('#radar-coverage-notes');
  if (!container) return;
  container.replaceChildren();
  const notes = state.coverageNotes.filter((note) => typeof note === 'string' && note.trim());
  container.hidden = notes.length === 0;
  for (const note of notes) {
    const paragraph = document.createElement('p');
    paragraph.textContent = note;
    container.append(paragraph);
  }
}

function render() {
  const filtered = getFilteredItems();
  const visibleCount = Math.min(filtered.length, state.page * PAGE_SIZE);
  const visible = filtered.slice(0, visibleCount);
  els.feed.replaceChildren();
  if (!state.items.length) {
    const active = state.sources.some((source) => source.status === 'ok');
    els.feed.append(createEmpty(
      active ? 'A primeira sincronização não encontrou itens' : 'A aguardar a primeira sincronização',
      active ? 'As fontes responderam, mas não devolveram oportunidades que possam ser apresentadas com origem verificável.' : 'As fontes ainda não concluíram uma recolha. Não mostramos anúncios de exemplo nem resultados inventados.'
    ));
  } else if (!filtered.length) {
    els.feed.append(createEmpty('Não encontrámos resultados com estes filtros', 'Experimenta outra palavra-chave, um país diferente ou um período mais amplo.'));
  } else {
    visible.forEach((item) => els.feed.append(createCard(item)));
    observeCards();
  }
  const noun = filtered.length === 1 ? 'oportunidade' : 'oportunidades';
  els.count.textContent = `${filtered.length.toLocaleString('pt-PT')} ${noun}${filtered.length !== state.items.length ? ` · ${state.items.length.toLocaleString('pt-PT')} no feed` : ''}`;
  els.more.hidden = visibleCount >= filtered.length || filtered.length === 0;
  els.sortContext.textContent = els.sort.value === 'views' ? 'MAIS VISUALIZADAS' : els.sort.value === 'relevance' ? 'MAIS RELEVANTES' : 'MAIS RECENTES';
  els.total.textContent = state.items.length.toLocaleString('pt-PT');
  els.sourcesCount.textContent = state.sources.filter((source) => source.status === 'ok').length.toLocaleString('pt-PT');
  if (!state.metricsAvailable && els.sort.value === 'views') els.sort.value = 'newest';
}

function observeCards() {
  if (!state.metricsAvailable || !('IntersectionObserver' in window)) return;
  if (state.observer) state.observer.disconnect();
  state.observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const id = entry.target.dataset.itemId;
      if (id && !state.trackedThisPage.has(id)) {
        state.trackedThisPage.add(id);
        sendMetric('view', id);
      }
      state.observer.unobserve(entry.target);
    }
  }, { threshold: 0.35 });
  document.querySelectorAll('.radar-card[data-item-id]').forEach((card) => state.observer.observe(card));
}

function sendMetric(action, itemId) {
  if (!state.metricsAvailable || !itemId) return;
  const body = JSON.stringify({ action, itemId: escapeId(itemId), visitorId: getVisitorId() });
  try {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon?.(METRICS_URL, blob)) return;
  } catch {
    // Fall back to a same-origin keepalive fetch below.
  }
  fetch(METRICS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true, credentials: 'same-origin' }).catch(() => {});
}

async function loadMetrics() {
  if (!state.items.length) return;
  const ids = state.items.map((item) => escapeId(item.id)).filter(Boolean).slice(0, 1000);
  try {
    const response = await fetch(METRICS_URL, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read', ids })
    });
    if (!response.ok) throw new Error(`metrics_${response.status}`);
    const payload = await response.json();
    if (!payload || typeof payload.metrics !== 'object') throw new Error('invalid_metrics_payload');
    state.metrics = payload.metrics;
    state.metricsAvailable = true;
    const viewsOption = [...els.sort.options].find((option) => option.value === 'views');
    if (viewsOption) {
      viewsOption.disabled = false;
      viewsOption.textContent = 'Mais visualizadas';
    }
    render();
  } catch {
    state.metricsAvailable = false;
    const viewsOption = [...els.sort.options].find((option) => option.value === 'views');
    if (viewsOption) {
      viewsOption.disabled = true;
      viewsOption.textContent = 'Mais visualizadas · indisponível';
    }
  }
}

async function refreshFeed({ announce = true } = {}) {
  if (state.busy) return;
  state.busy = true;
  try {
    const response = await fetch(DATA_URL, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`feed_${response.status}`);
    const data = await response.json();
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.items)) throw new Error('feed_schema_invalid');
    state.items = data.items.filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string' && safeExternalUrl(item.sourceUrl));
    state.sources = Array.isArray(data.sources) ? data.sources : [];
    state.coverageNotes = Array.isArray(data.coverageNotes) ? data.coverageNotes : [];
    updateCountryOptions();
    renderSourceList();
    renderCoverageNotes();
    const updated = safeDate(data.generatedAt);
    els.updated.textContent = updated ? formatDate(updated) : 'A aguardar';
    els.note.textContent = updated ? `Feed publicado em ${formatDate(updated)}. A sincronização automática é horária; o agendamento pode sofrer atrasos.` : 'Feed inicial ainda não publicado.';
    els.feed.setAttribute('aria-busy', 'false');
    render();
    await loadMetrics();
  } catch {
    els.feed.setAttribute('aria-busy', 'false');
    els.feed.replaceChildren(createEmpty('Não foi possível carregar o feed', 'O serviço de oportunidades está temporariamente indisponível. Tenta novamente dentro de alguns minutos.', true));
    els.note.textContent = 'Feed indisponível no momento; a página continua funcional e não apresenta dados de exemplo.';
    renderSourceList();
  } finally {
    state.busy = false;
  }
}

let searchTimer = 0;
els.search.addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => { state.page = 1; render(); }, 120);
});
els.form.addEventListener('change', () => { state.page = 1; render(); });
els.form.addEventListener('reset', () => {
  window.setTimeout(() => {
    state.quickCategory = 'all';
    state.page = 1;
    updateQuickChips();
    render();
  }, 0);
});
document.querySelectorAll('[data-quick-category]').forEach((button) => {
  button.addEventListener('click', () => {
    state.quickCategory = button.dataset.quickCategory || 'all';
    els.category.value = 'all';
    state.page = 1;
    updateQuickChips();
    render();
  });
});
els.more.addEventListener('click', () => { state.page += 1; render(); });

refreshFeed();
window.setInterval(() => refreshFeed({ announce: false }), 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshFeed({ announce: false });
});
