import { createHash } from 'node:crypto';

const SHARD_COUNT = 16;
const MAX_READ_IDS = 1000;
const MAX_BODY_BYTES = 32 * 1024;
const MAX_DAILY_UNIQUE_EVENTS = 250;
const MAX_TRACKED_ITEMS_PER_SHARD = 250;
const MAX_CAS_ATTEMPTS = 40;
const STORE_PREFIX = 'radar-metrics-v1-shard-';
const ITEM_ID_RE = /^[a-z][a-z0-9_-]{1,24}:[A-Za-z0-9._-]{1,96}$/;
const VISITOR_ID_RE = /^[A-Za-z0-9_-]{24,80}$/;
const RESPONSE_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, max-age=0' };

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...RESPONSE_HEADERS, ...extraHeaders } });
}

function utcDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function shardFor(itemId) {
  return Number.parseInt(sha256(itemId).slice(0, 8), 16) % SHARD_COUNT;
}

function emptyShard(day) {
  return { schemaVersion: 1, day, items: {}, seen: { view: {}, sourceClick: {} } };
}

function safeStoredShard(value, day) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schemaVersion !== 1) return emptyShard(day);
  const state = {
    schemaVersion: 1,
    day: typeof value.day === 'string' ? value.day : day,
    items: value.items && typeof value.items === 'object' && !Array.isArray(value.items) ? value.items : {},
    seen: value.seen && typeof value.seen === 'object' && !Array.isArray(value.seen) ? value.seen : { view: {}, sourceClick: {} },
  };
  if (state.day !== day) {
    state.day = day;
    state.seen = { view: {}, sourceClick: {} };
  }
  state.seen.view = state.seen.view && typeof state.seen.view === 'object' ? state.seen.view : {};
  state.seen.sourceClick = state.seen.sourceClick && typeof state.seen.sourceClick === 'object' ? state.seen.sourceClick : {};
  return state;
}

async function readShard(store, index, day = utcDay()) {
  const key = `${STORE_PREFIX}${String(index).padStart(2, '0')}`;
  const entry = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
  if (entry === null) return { key, index, state: emptyShard(day), etag: null, exists: false, needsPrune: false };
  const data = entry?.data ?? null;
  return { key, index, state: safeStoredShard(data, day), etag: entry?.etag, exists: true, needsPrune: Boolean(data && data.day !== day) };
}

async function writeShardOnce(store, shard) {
  const result = shard.exists
    ? await store.setJSON(shard.key, shard.state, { onlyIfMatch: shard.etag })
    : await store.setJSON(shard.key, shard.state, { onlyIfNew: true });
  return Boolean(result?.modified);
}

function pause(attempt) {
  return new Promise((resolve) => setTimeout(resolve, Math.min(3 + attempt * 5, 75)));
}

function countsFor(state, itemId) {
  const record = state.items[itemId] || {};
  return {
    views: Number.isSafeInteger(record.views) && record.views >= 0 ? record.views : 0,
    sourceClicks: Number.isSafeInteger(record.sourceClicks) && record.sourceClicks >= 0 ? record.sourceClicks : 0,
  };
}

async function readMetrics(store, ids) {
  if (ids.length > MAX_READ_IDS) return json({ error: 'too_many_ids' }, 413);
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.some((id) => !ITEM_ID_RE.test(id))) return json({ error: 'invalid_item_id' }, 400);
  const indexes = [...new Set(uniqueIds.map(shardFor))];
  const shardResults = await Promise.all(indexes.map((index) => readShard(store, index)));
  const stateByIndex = new Map();

  for (let shard of shardResults) {
    if (shard.needsPrune) {
      let pruned = false;
      for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt += 1) {
        if (await writeShardOnce(store, shard)) {
          pruned = true;
          break;
        }
        await pause(attempt);
        shard = await readShard(store, shard.index);
        if (!shard.needsPrune) {
          pruned = true;
          break;
        }
      }
      if (!pruned) throw new Error('metrics_prune_conflict');
    }
    stateByIndex.set(shard.index, shard.state);
  }

  const metrics = {};
  for (const id of uniqueIds) metrics[id] = countsFor(stateByIndex.get(shardFor(id)) || emptyShard(utcDay()), id);
  return json({ metrics, semantics: 'deduplicated-per-browser-token-and-UTC-day' });
}

async function recordEvent(store, { action, itemId, visitorId }) {
  if (!ITEM_ID_RE.test(itemId)) return json({ error: 'invalid_item_id' }, 400);
  if (!VISITOR_ID_RE.test(visitorId)) return json({ error: 'invalid_visitor_id' }, 400);
  const day = utcDay();
  const index = shardFor(itemId);
  const eventHash = sha256(`${visitorId}\u0000${itemId}\u0000${action}\u0000${day}`).slice(0, 32);

  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt += 1) {
    const shard = await readShard(store, index, day);
    const state = shard.state;
    if (!Object.hasOwn(state.items, itemId) && Object.keys(state.items).length >= MAX_TRACKED_ITEMS_PER_SHARD) {
      return json({ error: 'shard_item_limit' }, 429);
    }
    state.items[itemId] ||= { views: 0, sourceClicks: 0 };
    const counterName = action === 'view' ? 'views' : 'sourceClicks';
    state.seen[action] ||= {};
    const seenForItem = Array.isArray(state.seen[action][itemId]) ? state.seen[action][itemId] : [];
    const currentCounts = countsFor(state, itemId);

    if (seenForItem.includes(eventHash)) return json({ ok: true, duplicate: true, ...currentCounts });
    if (seenForItem.length >= MAX_DAILY_UNIQUE_EVENTS) return json({ error: 'daily_event_limit' }, 429);

    state.seen[action][itemId] = [...seenForItem, eventHash];
    state.items[itemId][counterName] = currentCounts[counterName] + 1;
    state.items[itemId].views = Number.isSafeInteger(state.items[itemId].views) ? state.items[itemId].views : 0;
    state.items[itemId].sourceClicks = Number.isSafeInteger(state.items[itemId].sourceClicks) ? state.items[itemId].sourceClicks : 0;
    state.day = day;

    if (await writeShardOnce(store, { ...shard, state })) {
      return json({ ok: true, duplicate: false, ...countsFor(state, itemId) });
    }
    await pause(attempt);
  }
  return json({ error: 'temporarily_unavailable' }, 503);
}

function sameOriginRequest(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function handleRadarMetrics(request, store) {
  try {
    const url = new URL(request.url);
    if (request.method === 'GET') {
      const ids = (url.searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, MAX_READ_IDS + 1);
      return await readMetrics(store, ids);
    }
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { Allow: 'GET, POST' });
    if (!sameOriginRequest(request)) return json({ error: 'same_origin_required' }, 403);
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return json({ error: 'payload_too_large' }, 413);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: 'payload_too_large' }, 413);
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return json({ error: 'invalid_payload' }, 400);
    if (payload.action === 'read') {
      if (!Array.isArray(payload.ids)) return json({ error: 'ids_required' }, 400);
      return await readMetrics(store, payload.ids.slice(0, MAX_READ_IDS + 1).map((id) => String(id)));
    }
    if (!['view', 'sourceClick'].includes(payload.action)) return json({ error: 'invalid_action' }, 400);
    return await recordEvent(store, {
      action: payload.action,
      itemId: String(payload.itemId || ''),
      visitorId: String(payload.visitorId || ''),
    });
  } catch {
    return json({ error: 'temporarily_unavailable' }, 503);
  }
}

export const radarMetricsConstants = { SHARD_COUNT, MAX_READ_IDS, MAX_DAILY_UNIQUE_EVENTS, MAX_TRACKED_ITEMS_PER_SHARD };
