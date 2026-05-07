/**
 * components/ChatInterface.tsx — Gemini-style UI поверх магистрали GEMINI_HUB.
 * Логика: модель (Fast/Thinking/Pro) + инструменты (поиск/код/URL/Deep Research),
 * как в Gemini app, но в левых двух блоках Завода. Плюс 4 роли.
 */
import React, { useState, useRef, useEffect } from "react";
import { AIRole, ChatMessage } from "../types";
import { SendIcon, BotIcon, UserIcon, SparklesIcon, TrashIcon, MessageSquareIcon } from "./icons";
import { hubChatStream } from "../services/hubClient";

const DEFAULT_ROLES: AIRole[] = [
  { id: "senior-architect", name: "Senior Architect", description: "Эксперт по коду (30y)",
    systemInstruction: "Ты - Senior Architect с 30-летним опытом. Технически безупречно, лаконично, профессионально.", avatar: "👨‍💻" },
  { id: "prompt-engineer", name: "Prompt Master", description: "Видео-промпты",
    systemInstruction: "Ты - эксперт Prompt Engineering для Veo / Sora / Kling. Делай промпты кинематографичными и детализированными.", avatar: "🎨" },
  { id: "sys-admin", name: "SysAdmin Ultra", description: "Серверы, Vertex",
    systemInstruction: "Ты - системный администратор с 20-летним стажем. Помогаешь с GCP, Vertex AI, инфраструктурой.", avatar: "⚙️" },
  { id: "creative-director", name: "Creative Director", description: "Режиссёр",
    systemInstruction: "Ты - креативный директор и кинорежиссёр. Сценарии, раскадровка, визуальный стиль.", avatar: "🎬" },
];

type Tier = "fast" | "thinking" | "pro";
const TIERS: { id: Tier; label: string; sub: string; model: string }[] = [
  { id: "fast",     label: "Fast",     sub: "Answers quickly",        model: "gemini-2.5-flash" },
  { id: "thinking", label: "Thinking", sub: "Solves complex problems", model: "gemini-2.5-pro" },
  { id: "pro",      label: "Pro",      sub: "Maximum quality",        model: "gemini-3-pro-preview" },
];

type Tool = "none" | "search" | "code" | "url" | "deep-research" | "image" | "video";

interface MsgWithThinking extends ChatMessage { thinking?: string; grounding?: any; }

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<MsgWithThinking[]>([]);
  const [input, setInput] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(DEFAULT_ROLES[0].id);
  const [tier, setTier] = useState<Tier>("fast");
  const [tool, setTool] = useState<Tool>("none");
  const [showThinking, setShowThinking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingTrace, setThinkingTrace] = useState("");
  const [streamText, setStreamText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRole = DEFAULT_ROLES.find((r) => r.id === selectedRoleId) || DEFAULT_ROLES[0];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamText, thinkingTrace]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: MsgWithThinking = {
      id: Date.now().toString(), role: "user", text: input, timestamp: Date.now(),
    };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setIsLoading(true);
    setThinkingTrace("");
    setStreamText("");

    try {
      let acc = "";
      let think = "";
      let grounding: any = null;
      const isDeep = tool === "deep-research";
      const tools = {
        google_search: tool === "search" || isDeep || undefined,
        code_execution: tool === "code" || undefined,
        url_context: tool === "url" || undefined,
      };
      const mode = isDeep ? "deep-research" : tier === "thinking" ? "analytics" : "chat";
      const tierModel = TIERS.find((t) => t.id === tier)!.model;

      for await (const c of hubChatStream({
        messages: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        system: selectedRole.systemInstruction,
        model: tierModel,
        mode: mode as any,
        thinking_budget: tier === "fast" ? 0 : -1,
        tools,
      })) {
        if (c.type === "thought") { think += c.text; setThinkingTrace((t) => t + c.text); }
        else if (c.type === "chunk") { acc += c.text; setStreamText((t) => t + c.text); }
        else if (c.type === "done") { grounding = c.data?.grounding; }
        else if (c.type === "error") { throw new Error(c.message); }
      }
      const bot: MsgWithThinking = {
        id: (Date.now() + 1).toString(), role: "model", text: acc || "(пусто)", timestamp: Date.now(),
        thinking: think || undefined, grounding,
      };
      setMessages((prev) => [...prev, bot]);
    } catch (e: any) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: "model",
        text: `❌ Ошибка: ${e.message}`, timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
      setStreamText("");
      setThinkingTrace("");
    }
  };

  const clearChat = () => setMessages([]);

  const TierRow: React.FC<{ t: typeof TIERS[number] }> = ({ t }) => (
    <button
      onClick={() => setTier(t.id)}
      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition ${
        tier === t.id ? "bg-indigo-600/20 border border-indigo-500/50" : "hover:bg-white/5"
      }`}
    >
      <div className="flex-1">
        <div className="font-medium text-sm">{t.label}</div>
        <div className="text-[11px] text-gray-400">{t.sub}</div>
      </div>
      {tier === t.id && (
        <div className="w-5 h-5 rounded-full bg-indigo-400 flex items-center justify-center text-black text-xs">✓</div>
      )}
    </button>
  );

  const ToolRow: React.FC<{ id: Tool; icon: string; label: string; sub?: string }> = ({ id, icon, label, sub }) => (
    <button
      onClick={() => setTool(tool === id ? "none" : id)}
      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition ${
        tool === id ? "bg-emerald-600/20 border border-emerald-500/40" : "hover:bg-white/5 border border-transparent"
      }`}
    >
      <span className="text-base">{icon}</span>
      <div className="flex-1">
        <div className="text-sm">{label}</div>
        {sub && <div className="text-[10px] text-gray-500">{sub}</div>}
      </div>
      {tool === id && <span className="text-emerald-400 text-xs">●</span>}
    </button>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <aside className="space-y-3">
        {/* Block 1: Gemini 3 — model tier + tools */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="text-base font-semibold mb-2 flex items-center gap-2">Gemini 3</div>
          <div className="space-y-1">{TIERS.map((t) => <TierRow key={t.id} t={t} />)}</div>

          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Tools</div>
            <div className="space-y-1">
              <ToolRow id="search"        icon="🔍" label="Google Search"  sub="grounding по интернету" />
              <ToolRow id="deep-research" icon="🔬" label="Deep Research"   sub="многошаговое исследование" />
              <ToolRow id="code"          icon="💻" label="Code Execution" sub="выполнение кода" />
              <ToolRow id="url"           icon="🌐" label="URL context"    sub="прочитать URL из промпта" />
            </div>
            <label className="flex items-center gap-2 py-2 mt-2 text-xs cursor-pointer">
              <input type="checkbox" checked={showThinking} onChange={(e) => setShowThinking(e.target.checked)} className="accent-emerald-500" />
              🧩 Показывать Thinking trace
            </label>
          </div>
        </div>

        {/* Block 2: Роли */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Роли</div>
          <div className="space-y-1">
            {DEFAULT_ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoleId(r.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg transition ${
                  selectedRoleId === r.id ? "bg-indigo-600/30 border border-indigo-500/50" : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{r.avatar}</span>
                  <span className="font-medium text-sm">{r.name}</span>
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">{r.description}</div>
              </button>
            ))}
          </div>
          <button onClick={clearChat} className="mt-2 w-full px-3 py-1.5 rounded bg-rose-700/40 hover:bg-rose-700/60 text-xs flex items-center justify-center gap-1">
            <TrashIcon className="w-3 h-3" /> Очистить
          </button>
        </div>
      </aside>

      {/* Chat */}
      <div className="flex flex-col h-[calc(100vh-200px)] rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="border-b border-white/10 px-4 py-2 text-xs text-gray-400 flex items-center gap-2 flex-wrap">
          <SparklesIcon className="w-4 h-4 text-indigo-400" />
          <span>Магистраль:</span>
          <span className="text-emerald-400">gemini.evotop.pro</span>
          <span className="ml-2">·</span>
          <span>{TIERS.find((t) => t.id === tier)?.label}</span>
          {tool !== "none" && <><span>·</span><span className="text-emerald-300">{tool}</span></>}
          <span className="ml-auto">Роль: <b>{selectedRole.name}</b></span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <MessageSquareIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <div>Начни разговор. Активна роль: <b>{selectedRole.name}</b></div>
              <div className="text-[11px] mt-2 text-gray-600">Tier: {tier} · Tool: {tool}</div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600/30 border border-indigo-500/30 shrink-0">
                {m.role === "user" ? <UserIcon className="w-4 h-4" /> : <BotIcon className="w-4 h-4" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.role === "user" ? "bg-indigo-600/40" : "bg-black/40 border border-white/10"}`}>
                {m.thinking && showThinking && (
                  <details className="mb-2">
                    <summary className="text-[11px] text-amber-400 cursor-pointer">🧩 Thinking</summary>
                    <pre className="text-[11px] text-amber-200/70 whitespace-pre-wrap mt-1">{m.thinking}</pre>
                  </details>
                )}
                <div className="whitespace-pre-wrap text-sm">{m.text}</div>
                {m.grounding?.webSearchQueries?.length > 0 && (
                  <div className="mt-2 text-[11px] text-emerald-300/80">🔍 {m.grounding.webSearchQueries.join(" · ")}</div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (streamText || thinkingTrace) && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600/30 border border-indigo-500/30 shrink-0"><BotIcon className="w-4 h-4" /></div>
              <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-black/40 border border-white/10">
                {showThinking && thinkingTrace && (
                  <details open className="mb-2">
                    <summary className="text-[11px] text-amber-400 cursor-pointer">🧩 Thinking…</summary>
                    <pre className="text-[11px] text-amber-200/70 whitespace-pre-wrap mt-1">{thinkingTrace}</pre>
                  </details>
                )}
                <div className="whitespace-pre-wrap text-sm">{streamText}<span className="animate-pulse">▌</span></div>
              </div>
            </div>
          )}
          {isLoading && !streamText && !thinkingTrace && (
            <div className="text-xs text-gray-500 px-2">Подключение к магистрали…</div>
          )}
        </div>

        <div className="border-t border-white/10 p-3 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`Сообщение (${TIERS.find((t) => t.id === tier)?.label}, ${selectedRole.name}). Enter — отправить, Shift+Enter — перенос`}
            rows={2}
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono resize-none"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 flex items-center gap-2 text-sm font-medium"
          >
            <SendIcon className="w-4 h-4" /> {isLoading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
