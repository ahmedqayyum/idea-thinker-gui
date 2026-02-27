import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export async function fetchExamples() {
  const res = await api.get('/api/defaults/examples');
  return res.data;
}

export async function fetchDomains() {
  const res = await api.get('/api/defaults/domains');
  return res.data;
}

export async function fetchProviders() {
  const res = await api.get('/api/defaults/providers');
  return res.data;
}

export async function createIdea(prompt: string) {
  const res = await api.post('/api/ideas', { prompt });
  return res.data;
}

export async function listIdeas(opts?: { status?: string; pipelineCompleted?: boolean }) {
  const params: Record<string, string | boolean> = {};
  if (opts?.status) params.status = opts.status;
  if (opts?.pipelineCompleted !== undefined) params.pipeline_completed = opts.pipelineCompleted;
  const res = await api.get('/api/ideas', { params });
  return res.data;
}

export async function getIdea(ideaId: string) {
  const res = await api.get(`/api/ideas/${ideaId}`);
  return res.data;
}

export async function getPipelineStatus(ideaId: string) {
  const res = await api.get(`/api/ideas/${ideaId}/pipeline`);
  return res.data;
}

export async function runPipeline(ideaId: string, provider = 'claude') {
  const res = await api.post(`/api/ideas/${ideaId}/run`, { provider });
  return res.data;
}

export async function listArtifacts(ideaId: string, path = '') {
  const res = await api.get(`/api/ideas/${ideaId}/artifacts`, { params: { path } });
  return res.data;
}

export async function readArtifact(ideaId: string, filePath: string) {
  const res = await api.get(`/api/ideas/${ideaId}/artifacts/${filePath}`);
  return res.data;
}

export function rawArtifactUrl(ideaId: string, filePath: string): string {
  return `${API_BASE}/api/ideas/${ideaId}/artifacts-raw/${filePath}`;
}

export async function forkFromStage(ideaId: string, stage: string, provider = 'claude') {
  const res = await api.post(`/api/ideas/${ideaId}/fork/${stage}`, { provider });
  return res.data;
}

export function createPipelineWs(ideaId: string): WebSocket {
  const wsBase = API_BASE.replace('http', 'ws');
  return new WebSocket(`${wsBase}/ws/pipeline/${ideaId}`);
}
