/**
 * services/geminiService.ts — теперь обёртка над магистралью HUB.
 * Прямые вызовы Google API остаются только в режиме "browser" toggle (legacy/диагностика).
 * По умолчанию все запросы идут через https://gemini.evotop.pro (наш Vertex Grant).
 */
import {
  GenerateVideoParams,
  GeneratePhotoParams,
  GenerationMode,
  VertexConnectionConfig,
  ChatMessage,
  AIRole,
} from "../types";
import {
  getSource,
  hubGenerateImage,
  hubStartVideo,
  hubPollVideo,
  hubChatOnce,
} from "./hubClient";

// ===== VIDEO =====
export const generateVideo = async (
  params: GenerateVideoParams,
  _connectionConfig: VertexConnectionConfig,
  onLog?: (message: string, data?: any) => void
): Promise<{ objectUrl: string; blob: Blob; uri: string; video: any; isSimulation?: boolean }> => {
  const log = (msg: string, data?: any) => { if (onLog) onLog(msg, data); else console.log("[VEO]", msg, data || ""); };

  if (getSource() === "browser") {
    throw new Error("Browser-режим отключён: ключ скомпрометирован. Переключи Toggle на «HUB Server» в Connections.");
  }

  log("HUB: запуск Veo через магистраль…");
  const start = await hubStartVideo({
    prompt: params.prompt || "High-end cinematic video, 8k, photorealistic",
    model: String(params.model),
    aspect: String(params.aspectRatio),
    duration_s: 8,
    start_frame: params.startFrame
      ? { mime: params.startFrame.file.type, base64: params.startFrame.base64 }
      : undefined,
  });
  log(`HUB: операция создана: ${start.operation_name}`);
  log(`HUB: оценка стоимости: $${start.est_usd}`);

  const t0 = Date.now();
  const maxWait = 25 * 60 * 1000;
  // initial wait so server has time
  await new Promise((r) => setTimeout(r, 8000));

  while (true) {
    if (Date.now() - t0 > maxWait) throw new Error("Timeout: > 25 минут.");
    const elapsed = Math.round((Date.now() - t0) / 1000);
    log(`HUB: рендеринг… [${elapsed}s]`);
    let res;
    try { res = await hubPollVideo(start.operation_name); }
    catch (e: any) { log(`HUB: poll error ${e.message}, retry…`); await new Promise((r) => setTimeout(r, 8000)); continue; }
    if (!res.done) { await new Promise((r) => setTimeout(r, 8000)); continue; }
    if (res.error) throw new Error(typeof res.error === "string" ? res.error : JSON.stringify(res.error));
    const v = res.videos?.[0];
    if (!v) throw new Error("HUB вернул пустой список видео.");
    log(`HUB: SUCCESS, размер ${(v.size / 1024 / 1024).toFixed(2)} MB`);
    const bytes = Uint8Array.from(atob(v.base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: v.mime });
    return {
      objectUrl: URL.createObjectURL(blob),
      blob,
      uri: "",
      video: { uri: "", mimeType: v.mime },
    };
  }
};

// ===== PROMPT ENHANCE (через chat HUB с google search) =====
export const enhancePromptWithInternet = async (prompt: string, onLog?: (msg: string) => void): Promise<string> => {
  if (onLog) onLog("HUB: улучшение промпта (Google Search)…");
  try {
    const text = await hubChatOnce(
      [{ id: "1", role: "user", text: `Improve the following video prompt with up-to-date visual details. Return ONLY the improved prompt.\n\nOriginal: ${prompt}`, timestamp: Date.now() }],
      { id: "enh", name: "Prompt Enhancer", description: "", systemInstruction: "You rewrite prompts to be cinematic and detailed. Return only the rewritten prompt.", avatar: "✨" }
    );
    return (text || prompt).trim();
  } catch (e: any) {
    if (onLog) onLog(`Ошибка enhance: ${e.message}`);
    return prompt;
  }
};

// ===== IMAGE =====
export const generateImage = async (
  params: GeneratePhotoParams,
  _config: VertexConnectionConfig,
  onLog: any
) => {
  const log = (msg: string, data?: any) => onLog?.(msg, data);
  if (getSource() === "browser") {
    throw new Error("Browser-режим отключён (free-tier 429 / leaked key). Используй HUB Server.");
  }
  log("HUB: image gen через магистраль…");
  const r = await hubGenerateImage({
    prompt: params.prompt,
    model: String(params.model),
    aspect: String(params.aspectRatio),
    n: 1,
  });
  if (!r.images?.length) throw new Error("HUB: no_images_returned");
  const img = r.images[0];
  const bytes = Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: img.mime });
  log(`HUB: SUCCESS, $${r.est_usd}`);
  return { imageUrl: URL.createObjectURL(blob), blob };
};

export const testVertexConnection = async (_config: VertexConnectionConfig, log: any) => {
  try {
    const r = await fetch(`${(import.meta as any).env?.VITE_HUB_URL || "https://gemini.evotop.pro"}/api/factory/health`);
    const j = await r.json();
    log(`HUB Status: ${j.ok ? "OK" : "FAIL"} (vertex=${j.vertex_key_configured})`, j.ok ? "success" : "error");
  } catch (e: any) {
    log(`HUB Status: FAILED (${e.message})`, "error");
  }
};

// ===== CHAT (used by old ChatInterface; native streaming is in components/ChatInterface.tsx) =====
export const generateChatResponse = async (
  messages: ChatMessage[],
  role: AIRole,
  onLog?: (msg: string) => void
): Promise<string> => {
  if (onLog) onLog(`HUB: chat (${role.name})`);
  return hubChatOnce(messages, role);
};
