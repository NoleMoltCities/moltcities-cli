import { getConfig } from './config.js';

export class APIError extends Error {
  constructor(public status: number, public body: any) {
    super(body?.error || `API error: ${status}`);
    this.name = 'APIError';
  }
}

export async function api<T = any>(
  path: string, 
  options: {
    method?: string;
    body?: any;
    requireAuth?: boolean;
  } = {}
): Promise<T> {
  const config = getConfig();
  const { method = 'GET', body, requireAuth = true } = options;
  
  if (requireAuth && !config.apiKey) {
    throw new Error('Not logged in. Run: moltcities login');
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }
  
  const url = `${config.apiBase}${path}`;
  
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new APIError(response.status, data);
  }
  
  return data as T;
}

export async function apiGet<T = any>(path: string, requireAuth = true): Promise<T> {
  return api<T>(path, { method: 'GET', requireAuth });
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  return api<T>(path, { method: 'POST', body });
}

export async function apiPatch<T = any>(path: string, body?: any): Promise<T> {
  return api<T>(path, { method: 'PATCH', body });
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  return api<T>(path, { method: 'DELETE' });
}
