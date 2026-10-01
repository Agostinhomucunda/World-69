import { getStore } from '@netlify/blobs';
import { handleRadarMetrics } from './radar-metrics-core.mjs';

const metricsStore = getStore({ name: 'world69-radar-metrics', consistency: 'strong' });

export default async function radarMetrics(request) {
  return handleRadarMetrics(request, metricsStore);
}

export const config = { path: '/api/radar-metrics' };
