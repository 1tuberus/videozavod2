/**
 * services/hubClient.ts — единый клиент магистрали GEMINI_HUB.
 *
 * Новые эндпоинты (production EVO_OMNI_HUB):
 *   GET  /api/catalog                    — public catalog of models (34 шт.)
 *   POST /api/jobs/estimate              — pre-flight token cost
 *   POST /api/media/generate             — async media job (202 + job_id)
 *   GET  /api/jobs/:id                   — poll job status
 *   GET  /api/jobs                       — list user jobs
 *   POST /v1/chat/completions            — OpenAI-compatible SSE chat
 *
 * Все запросы — Bearer-токен сессии (vz2_session_token из authClient) +
 * заголовок X-Routing-Mode (auto / force_vertex / force_kie).
 *
 * Внизу — back-compat shims (priceVideo / hubGenerateImage / hubStartVideo /
 * hubPollVideo / hubChatStream / hubChatOnce / getSource / checkHubHealth) —
 * для существующих компонентов; внутри переадресованы на новые эндпоинты,
 * чтобы UI работал без правок.
 */
import { ChatMessage, AIRole, Catalog, RoutingMode, Job } from "../types";
import { getToken } from "./authClient";

const HUB_URL = (import.meta as any).env?.VITE_HUB_URL || "https://gemini.evotop.pro";

// ─── Routing mode (per-request provider override) ─────────────────────────
const ROUTING_KEY = "vz2_routing_mode";
export const routing = {
  get: (): RoutingMode => {
    const v = localStorage.getItem(ROUTING_KEY) as RoutingMode | null;
    return v === "force_vertex" || v === "force_kie" ? v : "auto";
  },
  set: (m: RoutingMode) => localStorage.setItem(ROUTING_KEY, m),
};

// ─── Source toggle (legacy, для UI Connections) ────────────────────────────
export type HubSource = "hub" | "browser";
const SRC_KEY = "vz2_source";
export function getSource(): HubSource {
  const v = localStorage.getItem(SRC_KEY) as HubSource | null;
  return v === "browser" ? "browser" : "hub";
}
export function setSource(s: HubSource) { localStorage.setItem(SRC_KEY, s); }

// ─── Common HTTP helpers ──────────────────────────────────────────────────
function headers(extra: Record<string, string> = {}) {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Routing-Mode": routing.get(),
    ...extra,
  };
  const t = getToken();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

async function handle<T>(r: Response): Promise<T> {
  let body: any = null;
  try { body = await r.json(); } catch {}
  if (!r.ok || (body && body.ok === false)) {
    const err: any = new Error(body?.error || `hub_${r.status}`);
    err.status = r.status; err.body = body;
    if (r.status === 429) err.retry_ms = body?.retry_ms;
    if (r.status === 402) { err.required = body?.required; err.balance = body?.balance; }
    throw err;
  }
  return body as T;
}

async function jget<T>(path: string): Promise<T> {
  return handle<T>(await fetch(`${HUB_URL}${path}`, { headers: headers(), credentials: "include" }));
}
async function jpost<T>(path: string, body: any): Promise<T> {
  return handle<T>(await fetch(`${HUB_URL}${path}`, {
    method: "POST", headers: headers(), credentials: "include",
    body: JSON.stringify(body),
  }));
}

// ─── CATALOG ───────────────────────────────────────────────────────────────
export async function getCatalog(): Promise<Catalog> {
  const j = await jget<{ ok: true; models: Catalog }>("/api/catalog");
  return j.models;
}

// ─── ESTIMATE ──────────────────────────────────────────────────────────────
export async function estimate(mode: string, params: any) {
  return jpost<{ ok: true; mode: string; tokens: number; balance: number }>(
    "/api/jobs/estimate", { mode, params }
  );
}

// ─── MEDIA (async, BullMQ-backed) ──────────────────────────────────────────
export async function startMedia(mode: string, params: any) {
  return jpost<{
    ok: true; job_id: number; bull_job_id: string;
    provider: string; route: string; tokens_charged: number; poll_url: string;
  }>("/api/media/generate", { mode, params });
}

export async function getJob(id: number): Promise<Job> {
  const j = await jget<{ ok: true; job: Job }>(`/api/jobs/${id}`);
  return j.job;
}

export async function listJobs(filter: { job_type?: string; status?: string; limit?: number; offset?: number } = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) if (v != null) qs.set(k, String(v));
  return jget<{ ok: true; jobs: Job[]; total: number }>(`/api/jobs?${qs.toString()}`);
}

export async function pollJob(
  id: number,
  opts: { intervalMs?: number; timeoutMs?: number; onTick?: (job: Job) => void } = {}
): Promise<Job> {
  const interval = opts.intervalMs ?? 3000;
  const timeout  = opts.timeoutMs  ?? 25 * 60_000;
  const start    = Date.now();
  while (true) {
    const job = await getJob(id);
    opts.onTick?.(job);
    if (job.status === "succeeded" || job.status === "failed") return job;
    if (Date.now() - start > timeout) throw new Error("poll_timeout");
    await new Promise(r => setTimeout(r, interval));
  }
}

// ─── CHAT (OpenAI-compatible SSE) ──────────────────────────────────────────
export interface ChatStreamCallbacks {
  onDelta: (text: string) => void;
  onUsage?: (usage: any) => void;
  onDone?: (reason: string) => void;
  onError?: (e: Error) => void;
}
export async function chatStream(
  body: {
    model: string;
    messages: { role: "user" | "assistant" | "system"; content: string }[];
    temperature?: number;
    max_tokens?: number;
  },
  cb: ChatStreamCallbacks,
  signal?: AbortSignal
) {
  let r: Response;
  try {
    r = await fetch(`${HUB_URL}/v1/chat/completions`, {
      method: "POST", headers: headers(), credentials: "include",
      body: JSON.stringify({ ...body, stream: true }), signal,
    });
  } catch (e: any) { cb.onError?.(e); return; }
  if (!r.ok || !r.body) { cb.onError?.(new Error(`chat_${r.status}`)); return; }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let lastReason = "stop";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const block = buf.slice(0, idx).trim(); buf = buf.slice(idx + 2);
        for (const line of block.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") { cb.onDone?.(lastReason); return; }
          try {
            const j = JSON.parse(payload);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) cb.onDelta(delta);
            const reason = j.choices?.[0]?.finish_reason;
            if (reason) lastReason = reason;
            if (j.usage) cb.onUsage?.(j.usage);
          } catch { /* skip malformed */ }
        }
      }
    }
    cb.onDone?.(lastReason);
  } catch (e: any) { cb.onError?.(e); }
}

// Non-streaming chat helper
export async function chatOnce(model: string, messages: { role: "user"|"assistant"|"system"; content: string }[]): Promise<string> {
  const j = await jpost<{ choices: { message: { content: string } }[] }>("/v1/chat/completions", { model, messages, stream: false });
  return j.choices?.[0]?.message?.content || "";
}

// ─── HEALTH ────────────────────────────────────────────────────────────────
export async function checkHubHealth() {
  const r = await fetch(`${HUB_URL}/api/factory/health`);
  if (!r.ok) throw new Error(`hub_${r.status}`);
  return r.json() as Promise<{ ok: boolean; vertex_key_configured: boolean; version: string }>;
}

// ════════════════════════════════════════════════════════════════════════
// BACK-COMPAT SHIMS — для существующих компонентов / geminiService.ts
// Маппят старые имена моделей на новые catalog IDs и используют новые эндпоинты.
// ════════════════════════════════════════════════════════════════════════

// Старые VeoModel enum → новые catalog IDs
const VEO_MAP: Record<string, string> = {
  "veo-3.1-fast-generate-preview": "veo-3.1-fast",
  "veo-3.1-generate-preview":      "veo-3.1",
  "veo-3.1-lite-generate-preview": "veo-3.1-lite",
};
// Старые PhotoModel enum → новые catalog IDs
const IMG_MAP: Record<string, string> = {
  "gemini-2.5-flash-image":     "nano-banana",
  "gemini-3-pro-image-preview": "nano-banana-pro",
};

export function mapVideoModel(m: string): string  { return VEO_MAP[m] || m; }
export function mapImageModel(m: string): string  { return IMG_MAP[m] || m; }

// Conversion factor token→USD (бэк считает: tokensFromUsd = ceil(usd × 170)).
const TOKENS_PER_USD = 170;
const tokenToUsd = (t: number) => Math.round((t / TOKENS_PER_USD) * 1000) / 1000;

// price* → estimate (обратная совместимость: возвращает est_usd для UI; tokens отдельным полем)
export async function priceVideo(model: string, durationS: number) {
  try {
    const r = await estimate(mapVideoModel(model), { duration: durationS });
    return { ok: true as const, est_usd: tokenToUsd(r.tokens), tokens: r.tokens };
  } catch { return { ok: true as const, est_usd: 0, tokens: 0 }; }
}
export async function priceImage(model: string, n: number) {
  try {
    const r = await estimate(mapImageModel(model), { n });
    return { ok: true as const, est_usd: tokenToUsd(r.tokens), tokens: r.tokens };
  } catch { return { ok: true as const, est_usd: 0, tokens: 0 }; }
}

// hubGenerateImage → /api/media/generate + poll → загрузка mp4/png в base64 (как ждёт UI)
export async function hubGenerateImage(args: {
  prompt: string; model: string; aspect: string; n?: number;
  references?: { mime: string; base64: string }[];
}) {
  const params: any = { prompt: args.prompt, aspect: args.aspect, n: args.n || 1 };
  if (args.references?.length) {
    params.imageUrls = args.references.map(r => `data:${r.mime};base64,${r.base64}`);
  }
  const start = await startMedia(mapImageModel(args.model), params);
  const job = await pollJob(start.job_id);
  if (job.status !== "succeeded" || !job.result_url) {
    throw new Error(job.error_text || "image_failed");
  }
  const url = job.result_url.startsWith("http") ? job.result_url : `${HUB_URL}${job.result_url}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` }, credentials: "include" });
  const buf = await r.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const base64 = btoa(bin);
  const mime = r.headers.get("content-type") || "image/png";
  return {
    ok: true, model: args.model,
    images: [{ mime, base64 }],
    text: null as string | null,
    est_usd: tokenToUsd(start.tokens_charged || 0),
  };
}

// hubStartVideo → /api/media/generate (operation_name = job_id)
export async function hubStartVideo(args: {
  prompt: string; model: string; aspect: string;
  duration_s?: number;
  start_frame?: { mime: string; base64: string };
}) {
  const params: any = {
    prompt: args.prompt,
    aspect_ratio: args.aspect,
    duration: args.duration_s ?? 8,
  };
  if (args.start_frame) {
    params.imageUrls = [`data:${args.start_frame.mime};base64,${args.start_frame.base64}`];
  }
  const start = await startMedia(mapVideoModel(args.model), params);
  return {
    ok: true,
    operation_name: String(start.job_id),
    model: args.model,
    poll_url: start.poll_url,
    poll_after_ms: 8000,
    est_usd: tokenToUsd(start.tokens_charged || 0),
  };
}

// hubPollVideo → /api/jobs/:id (single tick); UI wraps в loop
export async function hubPollVideo(opName: string) {
  const id = Number(opName);
  if (!Number.isFinite(id)) throw new Error("invalid_operation_name");
  const job = await getJob(id);
  if (job.status === "queued" || job.status === "running") {
    return { ok: true, done: false } as { ok: true; done: false };
  }
  if (job.status === "failed") {
    return { ok: true, done: true, error: job.error_text || "failed" } as any;
  }
  if (!job.result_url) return { ok: true, done: true, error: "no_result_url" } as any;
  const url = job.result_url.startsWith("http") ? job.result_url : `${HUB_URL}${job.result_url}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` }, credentials: "include" });
  const buf = await r.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const base64 = btoa(bin);
  const mime = r.headers.get("content-type") || "video/mp4";
  return {
    ok: true, done: true,
    elapsed_ms: undefined,
    videos: [{ base64, mime, size: buf.byteLength }],
    est_usd: tokenToUsd(job.tokens_charged || 0),
  };
}

// ─── Legacy hubChatStream (event generator) — переадресован на /v1/chat/completions ─
export type ChatChunk =
  | { type: "meta"; data: { model: string; mode: string } }
  | { type: "thought"; text: string }
  | { type: "chunk"; text: string }
  | { type: "code"; language: string; code: string }
  | { type: "exec"; outcome: string; output: string }
  | { type: "usage"; data: any }
  | { type: "done"; data: any }
  | { type: "error"; message: string };

export async function* hubChatStream(args: {
  messages: { role: "user" | "model"; parts: { text: string }[] }[];
  system?: string;
  model?: string;
  mode?: "chat" | "analytics" | "deep-research";
  thinking_budget?: number;
  tools?: { google_search?: boolean; url_context?: boolean; code_execution?: boolean };
}): AsyncGenerator<ChatChunk> {
  const model = args.model || "gemini-2.5-flash";
  const messages: { role: "user"|"assistant"|"system"; content: string }[] = [];
  if (args.system) messages.push({ role: "system", content: args.system });
  for (const m of args.messages) {
    const text = (m.parts || []).map(p => p.text).join("");
    messages.push({ role: m.role === "user" ? "user" : "assistant", content: text });
  }

  const r = await fetch(`${HUB_URL}/v1/chat/completions`, {
    method: "POST", headers: headers(), credentials: "include",
    body: JSON.stringify({ model, messages, stream: true }),
  });
  if (!r.ok || !r.body) {
    yield { type: "error", message: `chat_${r.status}` };
    return;
  }
  yield { type: "meta", data: { model, mode: args.mode || "chat" } };

  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, idx).trim(); buf = buf.slice(idx + 2);
      for (const line of block.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") { yield { type: "done", data: {} }; return; }
        try {
          const j = JSON.parse(payload);
          const delta = j.choices?.[0]?.delta?.content;
          if (delta) yield { type: "chunk", text: delta };
          if (j.usage) yield { type: "usage", data: j.usage };
        } catch { /* skip */ }
      }
    }
  }
  yield { type: "done", data: {} };
}

// hubChatOnce — для enhancePromptWithInternet и не-стримового чата
export async function hubChatOnce(messages: ChatMessage[], role: AIRole): Promise<string> {
  const conv: { role: "user"|"assistant"|"system"; content: string }[] = [];
  if (role.systemInstruction) conv.push({ role: "system", content: role.systemInstruction });
  for (const m of messages) conv.push({ role: m.role === "user" ? "user" : "assistant", content: m.text });
  return chatOnce("gemini-2.5-flash", conv);
}
