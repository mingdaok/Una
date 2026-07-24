import { getApiBase } from '../config';

const STORAGE_KEY = 'una_auth_session';

let session = null;

function endpoint(path) {
  return `${getApiBase()}${path}`;
}

export function getSession() {
  if (session) return session;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    session = stored ? JSON.parse(stored) : null;
  } catch {
    session = null;
  }
  return session;
}

export function saveSession(nextSession) {
  session = nextSession;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
  return session;
}

export function clearSession() {
  session = null;
  localStorage.removeItem(STORAGE_KEY);
}

export async function authenticate(username, password, register = false) {
  const response = await fetch(endpoint(`/api/auth/${register ? 'register' : 'login'}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || '认证失败');
  return saveSession(data);
}

export async function refreshSession() {
  const current = getSession();
  if (!current?.refresh_token) return null;
  const response = await fetch(endpoint('/api/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: current.refresh_token }),
  });
  if (!response.ok) {
    clearSession();
    return null;
  }
  return saveSession(await response.json());
}

export async function authFetch(path, options = {}, retried = false) {
  const current = getSession();
  const headers = new Headers(options.headers || {});
  if (current?.access_token) headers.set('Authorization', `Bearer ${current.access_token}`);
  const response = await fetch(endpoint(path), { ...options, headers });
  if (response.status === 401 && !retried && await refreshSession()) {
    return authFetch(path, options, true);
  }
  return response;
}

export async function createWebSocketTicket() {
  const response = await authFetch('/api/auth/ws-ticket', { method: 'POST' });
  if (!response.ok) throw new Error('无法创建聊天连接');
  return (await response.json()).ticket;
}
