/**
 * services/hubClient.ts — клиент магистрали GEMINI_HUB.
 * Все запросы идут на gemini.evotop.pro/api/factory с Bearer токеном.
 * Ключ Vertex Grant ($1000) хранится только на сервере.
 */
import { ChatMessage, AIRole } from "../types";

// Можно переопределить через VITE_HUB_URL / VITE_FACTORY_BEARER при сборке.
const HUB_URL = (import.meta as any).env?.VITE_HUB_URL || "https://gemini.evotop.pro";
const FACTORY_BEARER = (import.meta as any).env?.VITE_FACTORY_BEARER || "";

export type HubSource = "hub" | "browser";
const SRC_KEY = "vz2_source";
export function getSource(): HubSource {
  const v = localStorage.getItem(SRC_KEY) as HubSource | null;
  return v === "browser" ? "browser" : "hub";
}
export function setSource(s: HubSource) { localStorage.setItem(SRC_KEY, s); }

function authHeaders() {
  return FACTORY_BEARER ? { Authorization: `Bearer ${FACTORY_BEARER}` } : ({} as Record<string, string>);
}

async function jget<T>(path: string): Promise<T> {
  const r = await fetch(`${HUB_URL}${path}`, { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error(`HUB ${r.status}: ${await r.text()}`);
  return r.json();
}
async function jpost<T>(path: string, body: any): Promise<T> {
  const r = await fetch(`${HUB_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HUB ${r.status}: ${await r.text()}`);
  return r.json();
}

// ===== HEALTH / STATUS =====
export async function checkHubHealth() {
  const r = await fetch(`${HUB_URL}/api/factory/health`);
  if (!r.ok) throw new Error(`hub_${r.status}`);
  return r.json() as Promise<{ ok: boolean; vertex_key_configured: boolean; version: string }>;
}

// ===== PRICE PREVIEW =====
export async function priceVideo(model: string, durationS: number) {
  return jget<{ ok: true; est_usd: number }>(
    `/api/factory/price?type=video&model=${encodeURIComponent(model)}&duration_s=${durationS}`,
  );
}
export async function priceImage(model: string, n: number) {
  return jget<{ ok: true; est_usd: number }>(
    `/api/factory/price?type=image&model=${encodeURIComponent(model)}&n=${n}`,
  );
}

// ===== IMAGE =====
export async function hubGenerateImage(args: {
  prompt: string; model: string; aspect: string; n?: number;
  references?: { mime: string; base64: string }[];
}) {
  const r = await jpost<{
    ok: boolean; model: string;
    images: { mime: string; base64: string }[];
    text?: string | null; est_usd: number;
  }>("/api/factory/image", args);
  return r;
}

// ===== VIDEO (LRO) =====
export async function hubStartVideo(args: {
  prompt: string; model: string; aspect: string;
  duration_s?: number;
  start_frame?: { mime: string; base64: string };
}) {
  return jpost<{
    ok: boolean; operation_name: string; model: string;
    poll_url: string; poll_after_ms: number; est_usd: number;
  }>("/api/factory/video", args);
}
export async function hubPollVideo(opName: string) {
  return jget<{
    ok: boolean; done: boolean;
    elapsed_ms?: number;
    videos?: { base64: string; mime: string; size: number }[];
    est_usd?: number;
    error?: any;
  }>(`/api/factory/video/${encodeURIComponent(opName)}`);
}

// ===== CHAT (SSE streaming) =====
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
  const r = await fetch(`${HUB_URL}/api/factory/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...authHeaders() },
    body: JSON.stringify(args),
  });
  if (!r.ok || !r.body) throw new Error(`HUB chat ${r.status}: ${await r.text()}`);
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const event = (block.match(/^event:\s*(.*)$/m) || [])[1] || "message";
      const dataLine = (block.match(/^data:\s*(.*)$/m) || [])[1] || "";
      let data: any = {};
      try { data = JSON.parse(dataLine); } catch {}
      if (event === "chunk") yield { type: "chunk", text: data.text || "" };
      else if (event === "thought") yield { type: "thought", text: data.text || "" };
      else if (event === "code") yield { type: "code", language: data.language, code: data.code };
      else if (event === "exec") yield { type: "exec", outcome: data.outcome, output: data.output };
      else if (event === "meta") yield { type: "meta", data };
      else if (event === "usage") yield { type: "usage", data };
      else if (event === "done") yield { type: "done", data };
      else if (event === "error") yield { type: "error", message: data.message || "stream_error" };
    }
  }
}

// helper: chat → single text answer (without streaming UI)
export async function hubChatOnce(messages: ChatMessage[], role: AIRole): Promise<string> {
  let text = "";
  for await (const c of hubChatStream({
    messages: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    system: role.systemInstruction,
    mode: "chat",
  })) {
    if (c.type === "chunk") text += c.text;
    if (c.type === "error") throw new Error(c.message);
  }
  return text;
}
