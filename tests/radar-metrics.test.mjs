import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRadarMetrics } from '../netlify/functions/radar-metrics-core.mjs';

class MemoryStore {
  constructor() { this.entries = new Map(); this.version = 0; }
  async getWithMetadata(key) {
    const entry = this.entries.get(key);
    if (!entry) return null;
    return { data: structuredClone(entry.data), etag: entry.etag };
  }
  async setJSON(key, value, options = {}) {
    const current = this.entries.get(key);
    if (options.onlyIfNew && current) return { modified: false };
    if (options.onlyIfMatch && (!current || current.etag !== options.onlyIfMatch)) return { modified: false };
    const etag = `"${++this.version}"`;
    this.entries.set(key, { data: structuredClone(value), etag });
    return { modified: true, etag };
  }
}

function request(method, pathname, body, origin = 'https://world69.example') {
  const headers = new Headers();
  if (method === 'POST') {
    headers.set('content-type', 'application/json');
    headers.set('origin', origin);
  }
  return new Request(`https://world69.example${pathname}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

async function json(response) { return response.json(); }

const itemId = 'jobicy:role-123';
const visitorA = 'w69r_0123456789abcdef0123456789abcdef';
const visitorB = 'w69r_fedcba9876543210fedcba9876543210';

test('records a real view once per item, browser token, action and UTC day', async () => {
  const store = new MemoryStore();
  const first = await json(await handleRadarMetrics(request('POST', '/api/radar-metrics', { action: 'view', itemId, visitorId: visitorA }), store));
  const repeat = await json(await handleRadarMetrics(request('POST', '/api/radar-metrics', { action: 'view', itemId, visitorId: visitorA }), store));
  const secondVisitor = await json(await handleRadarMetrics(request('POST', '/api/radar-metrics', { action: 'view', itemId, visitorId: visitorB }), store));
  assert.equal(first.views, 1);
  assert.equal(first.duplicate, false);
  assert.equal(repeat.views, 1);
  assert.equal(repeat.duplicate, true);
  assert.equal(secondVisitor.views, 2);
});

test('records source clicks separately from views', async () => {
  const store = new MemoryStore();
  const click = await json(await handleRadarMetrics(request('POST', '/api/radar-metrics', { action: 'sourceClick', itemId, visitorId: visitorA }), store));
  assert.equal(click.views, 0);
  assert.equal(click.sourceClicks, 1);
});

test('compare-and-swap preserves concurrent events in the same shard', async () => {
  const store = new MemoryStore();
  const events = Array.from({ length: 30 }, (_, index) => handleRadarMetrics(
    request('POST', '/api/radar-metrics', { action: 'view', itemId, visitorId: `w69r_${String(index).padStart(32, 'a')}` }), store
  ));
  await Promise.all(events);
  const response = await handleRadarMetrics(request('GET', `/api/radar-metrics?ids=${encodeURIComponent(itemId)}`, undefined), store);
  const result = await json(response);
  assert.equal(result.metrics[itemId].views, 30);
});

test('read action returns zero only when the metrics service is online and the count is zero', async () => {
  const store = new MemoryStore();
  const response = await handleRadarMetrics(request('POST', '/api/radar-metrics', { action: 'read', ids: [itemId] }), store);
  const result = await json(response);
  assert.deepEqual(result.metrics[itemId], { views: 0, sourceClicks: 0 });
});

test('caps unique daily events for one item instead of allowing unlimited counter inflation', async () => {
  const store = new MemoryStore();
  let lastResponse;
  for (let index = 0; index < 251; index += 1) {
    const visitorId = `w69r_${String(index).padStart(32, 'a')}`;
    lastResponse = await handleRadarMetrics(request('POST', '/api/radar-metrics', { action: 'view', itemId, visitorId }), store);
  }
  assert.equal(lastResponse.status, 429);
  const result = await json(await handleRadarMetrics(request('GET', `/api/radar-metrics?ids=${encodeURIComponent(itemId)}`, undefined), store));
  assert.equal(result.metrics[itemId].views, 250);
});

test('rejects cross-origin writes and malformed identifiers', async () => {
  const store = new MemoryStore();
  const crossOrigin = await handleRadarMetrics(request('POST', '/api/radar-metrics', { action: 'view', itemId, visitorId: visitorA }, 'https://attacker.example'), store);
  const malformed = await handleRadarMetrics(request('POST', '/api/radar-metrics', { action: 'view', itemId: '../secret', visitorId: visitorA }), store);
  assert.equal(crossOrigin.status, 403);
  assert.equal(malformed.status, 400);
});
