/**
 * components/ChatInterface.tsx — нативный UI Завода + бэкенд GEMINI_HUB.
 * Поддержка: streaming, Thinking trace, Google Search grounding, Code execution, URL context.
 * Сохранены 4 стандартные роли (system prompts).
 */
import React, { useState, useRef, useEffect } from "react";
import { AIRole, ChatMessage } from "../types";
import { SendIcon, BotIcon, UserIcon, SparklesIcon, TrashIcon, MessageSquareIcon } from "./icons";
import { hubChatStream } from "../services/hubClient";

const DEFAULT_ROLES: AIRole[] = [
  {
    id: "senior-architect",
    name: "Senior Architect",
    description: "Эксперт по архитектуре и коду (30 лет опыта)",
    systemInstruction:
      "Ты - ультра-максимальный программист уровня Senior Architect с 30-летним опытом. Твои ответы должны быть технически безупречны, лаконичны и профессиональны. Ты знаешь все языки программирования и лучшие практики.",
    avatar: "👨‍💻",
  },
  {
    id: "prompt-engineer",
    name: "Prompt Master",
    description: "Мастер создания видео-промптов",
    systemInstruction:
      "Ты - эксперт в области Prompt Engineering для моделей Veo, Sora и Kling. Ты помогаешь пользователям превращать их простые идеи в детализированные, кинематографичные промпты, которые дают лучший результат при генерации видео.",
    avatar: "🎨",
  },
  {
    id: "sys-admin",
    name: "SysAdmin Ultra",
    description: "Эксперт по серверам и Vertex AI",
    systemInstruction:
      "Ты - системный администратор с 20-летним стажем. Ты помогаешь с настройкой Google Cloud, Vertex AI, API ключами и инфраструктурой. Твой тон строгий, но полезный.",
    avatar: "⚙️",
  },
  {
    id: "creative-director",
    name: "Creative Director",
    description: "Визионер и режиссер",
    systemInstruction:
      "Ты - креативный директор и кинорежиссер. Ты помогаешь продумать сценарии, раскадровку и визуальный стиль для будущих видеороликов.",
    avatar: "🎬",
  },
];

interface MsgWithThinking extends ChatMessage {
  thinking?: string;
  grounding?: any;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<MsgWithThinking[]>([]);
  const [input, setInput] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(DEFAULT_ROLES[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [showThinking, setShowThinking] = useState(true);
  const [useSearch, setUseSearch] = useState(false);
  const [useCode, setUseCode] = useState(false);
  const [useUrl, setUseUrl] = useState(false);
  const [model, setModel] = useState<string>("");
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
      id: Date.now().toString(),
      role: "user",
      text: input,
      timestamp: Date.now(),
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
      const tools = {
        google_search: useSearch || undefined,
        code_execution: useCode || undefined,
        url_context: useUrl || undefined,
      };
      for await (const c of hubChatStream({
        messages: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        system: selectedRole.systemInstruction,
        model: model || undefined,
        thinking_budget: -1,
        tools,
      })) {
        if (c.type === "thought") { think += c.text; setThinkingTrace((t) => t + c.text); }
        else if (c.type === "chunk") { acc += c.text; setStreamText((t) => t + c.text); }
        else if (c.type === "done") { grounding = c.data?.grounding; }
        else if (c.type === "error") { throw new Error(c.message); }
      }
      const bot: MsgWithThinking = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: acc,
        timestamp: Date.now(),
        thinking: think || undefined,
        grounding,
      };
      setMessages((prev) => [...prev, bot]);
    } catch (e: any) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: `❌ Ошибка: ${e.message}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
      setStreamText("");
      setThinkingTrace("");
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
      <aside className="space-y-3">
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Роль</div>
          <div className="space-y-1.5">
            {DEFAULT_ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoleId(r.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition ${
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
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-xs">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Инструменты</div>
          <label className="flex items-center gap-2 py-1 cursor-pointer">
            <input type="checkbox" checked={showThinking} onChange={(e) => setShowThinking(e.target.checked)} className="accent-emerald-500" />
            🧩 Показывать Thinking
          </label>
          <label className="flex items-center gap-2 py-1 cursor-pointer">
            <input type="checkbox" checked={useSearch} onChange={(e) => setUseSearch(e.target.checked)} className="accent-emerald-500" />
            🔍 Google Search (grounding)
          </label>
          <label className="flex items-center gap-2 py-1 cursor-pointer">
            <input type="checkbox" checked={useCode} onChange={(e) => setUseCode(e.target.checked)} className="accent-emerald-500" />
            💻 Code Execution
          </label>
          <label className="flex items-center gap-2 py-1 cursor-pointer">
            <input type="checkbox" checked={useUrl} onChange={(e) => setUseUrl(e.target.checked)} className="accent-emerald-500" />
            🌐 URL context
          </label>
          <input
            type="text"
            placeholder="model (auto)"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-2 w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs"
          />
          <button onClick={clearChat} className="mt-2 w-full px-3 py-1.5 rounded bg-rose-700/40 hover:bg-rose-700/60 text-xs flex items-center justify-center gap-1">
            <TrashIcon className="w-3 h-3" /> Очистить
          </button>
        </div>
      </aside>

      <div className="flex flex-col h-[calc(100vh-200px)] rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="border-b border-white/10 px-4 py-2 text-xs text-gray-400 flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-indigo-400" />
          Магистраль: <span className="text-emerald-400">gemini.evotop.pro</span>
          <span className="ml-auto">Роль: <b>{selectedRole.name}</b></span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <MessageSquareIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <div>Начни разговор. Активна роль: <b>{selectedRole.name}</b></div>
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
            placeholder={`Сообщение для ${selectedRole.name}…  (Enter — отправить, Shift+Enter — перенос)`}
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
