// Auth + admin client. Stores session token in localStorage; sends as Bearer.
const HUB = (import.meta as any).env?.VITE_HUB_URL || "https://gemini.evotop.pro";
const TOKEN_KEY = "vz2_session_token";

export type Role = "owner" | "admin" | "user";
export interface Me {
  id: string; email: string; role: Role;
  balance_cents: number;
  banned: boolean; ban_reason?: string | null; ban_expires_at?: number | null;
  created_at: number;
}

export function getToken(): string { return localStorage.getItem(TOKEN_KEY) || ""; }
export function setToken(t: string) { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }

async function req(path: string, opts: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts.headers as any || {}) };
  const t = getToken(); if (t) headers["Authorization"] = `Bearer ${t}`;
  const r = await fetch(`${HUB}${path}`, { ...opts, headers, credentials: "include" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}

export async function login(email: string, password: string): Promise<Me> {
  const j = await req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  setToken(j.token);
  return j.user;
}
export async function logout(): Promise<void> {
  try { await req("/api/auth/logout", { method: "POST" }); } catch {}
  setToken("");
}
export async function fetchMe(): Promise<Me | null> {
  try { const j = await req("/api/auth/me"); return j.user || null; } catch { return null; }
}

// ---- admin -----------------------------------------------------------------
export interface AdminUser {
  id: string; email: string; role: Role; balance_cents: number;
  banned: 0 | 1; ban_reason?: string | null; ban_expires_at?: number | null;
  created_at: number; updated_at: number;
}
export interface AdminListUsers { rows: AdminUser[]; total: number; }

export const adminApi = {
  listUsers: (q?: { q?: string; role?: string; limit?: number; offset?: number }) =>
    req(`/api/admin/users?${new URLSearchParams(q as any).toString()}`).then(j => j as AdminListUsers & { ok: true }),
  createUser: (b: { email: string; password?: string; role?: Role; balance_cents?: number }) =>
    req("/api/admin/users", { method: "POST", body: JSON.stringify(b) }),
  setRole: (id: string, role: Role) =>
    req(`/api/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  ban: (id: string, reason?: string, expiresIn?: number) =>
    req(`/api/admin/users/${id}/ban`, { method: "PATCH", body: JSON.stringify({ reason, expiresIn }) }),
  unban: (id: string) => req(`/api/admin/users/${id}/unban`, { method: "PATCH" }),
  adjustBalance: (id: string, delta_cents: number, reason?: string) =>
    req(`/api/admin/users/${id}/balance`, { method: "POST", body: JSON.stringify({ delta_cents, reason }) }),
  deleteUser: (id: string) => req(`/api/admin/users/${id}`, { method: "DELETE" }),
  metrics: (range: "24h" | "7d" | "30d" = "24h") => req(`/api/admin/metrics?range=${range}`),
  listMedia: (q?: any) => req(`/api/admin/media?${new URLSearchParams(q || {}).toString()}`),
  pinMedia: (id: string) => req(`/api/admin/media/${id}/pin`, { method: "POST" }),
  deleteMedia: (id: string) => req(`/api/admin/media/${id}`, { method: "DELETE" }),
  audit: (q?: any) => req(`/api/admin/audit?${new URLSearchParams(q || {}).toString()}`),
  retentionRun: () => req("/api/admin/retention/run", { method: "POST" }),
};
