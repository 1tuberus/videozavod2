# PLAN: бесшовная интеграция GEMINI_HUB ↔ VIDEOZAVOD2

**Статус деплоя VIDEOZAVOD2:** ✅ live https://videozavod2.evotop.pro
**GEMINI_HUB:** ✅ live https://gemini.evotop.pro (Phase 5 + hotfix v0.3.1)

Принцип: дизайн VIDEOZAVOD2 не трогаем. Берём его как «оболочку» (видео/фото/музыка/текст), а тяжёлую логику (стрим, треды, биллинг, auth, диагностика) перевозим на наш бэкенд GEMINI_HUB.

---

## Текущая картина (что уже есть)

### VIDEOZAVOD2 (frontend-only SPA)
- React 19 + Vite, билд → статика, отдаём nginx
- API key **встроен в бандл** (`process.env.API_KEY` → `define` в vite.config.ts) — публичный, **уязвимость**
- 4 вкладки: Видео / Фото / Музыка / Текст (`components/Navigation.tsx`)
- Прямые вызовы Google API из браузера (`@google/genai`):
  - `services/geminiService.ts → generateVideo()` — Veo LRO с long-poll, retry на 401, верификация blob
  - `generateImage()` — Imagen / Nano Banana
  - `generateChatResponse()` — для вкладки Текст (4 «роли»)
- Локальные галерея/чекпоинты в `localStorage`

### GEMINI_HUB (full-stack)
- Fastify бэк, SQLite-треды, SSE стрим, cookie auth, rate-limit
- `/api/threads`, `/api/threads/:id/stream`, `/api/image`, `/api/video`, `/api/usage`, `/api/diag`
- Per-model pricing (Veo $0.40/$0.15, Imagen, Nano Banana)
- Thinking trace, Google Search grounding, Code execution, URL context, Files API
- Watcher 03:00 MSK (модели/цены), compact-watcher 30 мин

---

## Phase A — minimum viable (1 час, без регрессий)

**Цель:** в закладке «Текст» работает наш чат GEMINI_HUB как есть, через iframe. Видео/фото остаются на старом коде VIDEOZAVOD2 — тестируем в проде, кто лучше.

### A.1 — заменить `ChatInterface.tsx` на iframe

```tsx
// components/ChatInterface.tsx
const ChatInterface: React.FC = () => (
  <div className="h-[calc(100vh-128px)]">
    <iframe
      src="https://gemini.evotop.pro/"
      className="w-full h-full rounded-xl border border-white/10 bg-black"
      allow="clipboard-read; clipboard-write"
      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
      title="Gemini Hub Chat"
    />
  </div>
);
export default ChatInterface;
```

### A.2 — CORS / iframe headers на GEMINI_HUB

В `src/server.js` (или nginx) убрать `X-Frame-Options: DENY`, добавить:
```
Content-Security-Policy: frame-ancestors 'self' https://videozavod2.evotop.pro https://*.evotop.pro
```

### A.3 — единый login

Пользователь логинится на gemini.evotop.pro один раз → cookie доменно-локальная. Внутри iframe он уже залогинен. Альтернатива: SSO-cookie на `*.evotop.pro` (parent-domain cookie) — добавить `Domain=.evotop.pro` в `sendCookie`.

### A.4 — ремонт безопасности VIDEOZAVOD2

Поскольку `API_KEY` сидит в бандле:
- немедленно выпустить **новый** `GEMINI_API_KEY` для VIDEOZAVOD2 с **HTTP-referrer-restriction** на `videozavod2.evotop.pro/*`
- старый ключ из `.env.local` пометить как «public-frontend, restricted»
- в Cloud Console: API key → Application restrictions → HTTP referrers
- prod ключ на gemini.evotop.pro (server-side) **не трогать**

**Проверка фазы A:**
- https://videozavod2.evotop.pro → вкладка «Текст» → виден чат, работает ввод/стрим/треды
- видео/фото — как раньше через прямые вызовы
- логин: `Bearer` или cookie от gemini.evotop.pro

---

## Phase B — нативная интеграция чата (2-3 часа)

**Цель:** дизайн «Текст» от VIDEOZAVOD2 (роли, аватары, табы), бэкенд от GEMINI_HUB (стрим, треды, thinking, инструменты).

### B.1 — новый клиент `services/hubClient.ts`

```ts
const HUB = "https://gemini.evotop.pro";
async function login(password: string) {
  const r = await fetch(`${HUB}/api/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  if (!r.ok) throw new Error("login failed");
}
async function listThreads() {
  return (await fetch(`${HUB}/api/threads`, { credentials: "include" })).json();
}
async function* streamMessage(threadId: string, prompt: string, opts: {
  model?: string; mode?: "chat"|"analytics"|"deep-research"|"image"|"video";
  systemInstruction?: string; thinking?: boolean;
}) {
  const res = await fetch(`${HUB}/api/threads/${threadId}/stream`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ prompt, ...opts })
  });
  // parse SSE: event:meta / event:thinking / event:chunk / event:usage / event:done
  const reader = res.body!.getReader();
  // ...
}
```

### B.2 — переписать `ChatInterface.tsx`

Сохраняем UI: 4 роли, поле ввода, история, аватары. Меняем только источник данных:
```ts
// до: const responseText = await generateChatResponse(messages, role);
// после:
const stream = streamMessage(currentThreadId, input, {
  systemInstruction: selectedRole.systemInstruction,
  thinking: true
});
for await (const chunk of stream) {
  if (chunk.type === "thinking") setThinkingTrace(t => t + chunk.text);
  if (chunk.type === "chunk")    setBotText(t => t + chunk.text);
}
```

### B.3 — CORS на бэке GEMINI_HUB

```js
app.register(cors, {
  origin: ["https://videozavod2.evotop.pro", "https://gemini.evotop.pro", /localhost:\d+$/],
  credentials: true,
});
```

### B.4 — мульти-роль на стороне бэка

Текущий GEMINI_HUB принимает `systemInstruction` per-thread — это и есть «роль». 4 предустановки VIDEOZAVOD2 → 4 кнопки, каждая создаёт новый тред с нужным system prompt.

**Проверка фазы B:**
- стрим, thinking trace, инструменты (search/code/url) работают в нативном UI VIDEOZAVOD2
- треды видны и в gemini.evotop.pro (общая БД), и в видео-заводе

---

## Phase C — единый бэкенд для всех режимов (1-2 дня)

**Цель:** убить прямые вызовы Google API из браузера VIDEOZAVOD2. Видео/фото → проксируются через GEMINI_HUB. API key только на сервере.

### C.1 — расширить `/api/video` GEMINI_HUB

Уже есть. Добавить:
- `mode`: `text-to-video | frames-to-video | references-to-video | extend-video`
- `startFrame` / `endFrame` (multipart upload, как сейчас Files API)
- `style` (Realistic/Anime/3D/Cinematic) → инжектится в prompt
- `aspectRatio`, `resolution`, `model` (Veo 3.1 Fast/Pro/Lite)

### C.2 — расширить `/api/image`

Уже есть. Добавить:
- `model`: nano-banana / nano-banana-pro / imagen-4 / imagen-4-ultra
- `referenceImages[]` для Nano Banana editing

### C.3 — `geminiService.ts` → `hubService.ts`

Заменить все вызовы `new GoogleGenAI({apiKey: process.env.API_KEY})` на `fetch("https://gemini.evotop.pro/api/...", {credentials:"include"})`. После этого:
- `vite.config.ts`: убрать `define` API_KEY
- `.env.local` удалить
- ключ из бандла исчезает

### C.4 — общая галерея

Сейчас в VIDEOZAVOD2 — `localStorage`. Перевезти в GEMINI_HUB SQLite (новая таблица `media_history`):
- `id, user, task (video|photo|music|text), params_json, result_url, cost_usd, created_at`
- `GET /api/media` — пагинация по дате
- `DELETE /api/media/:id`

### C.5 — единый usage/biller

VIDEOZAVOD2 показывает «106,789» (захардкожено). Заменить на `GET /api/usage` от GEMINI_HUB. Показ: «Сегодня: $X.XX / лимит $25, осталось credits ≈ $1000-…».

**Проверка фазы C:**
- View page source `videozavod2.evotop.pro` → нет `AIzaSy...`
- Cloud Console → старый ключ удалить
- галерея VIDEOZAVOD2 = галерея gemini-hub
- A/B сравнение: одинаковый prompt в обоих UI → одинаковая цена/латентность

---

## Phase D — A/B сравнение для клиента (после C)

**Цель:** сравнить, у кого UX лучше при одинаковом backend.

| Метрика | gemini.evotop.pro | videozavod2.evotop.pro |
|--------|-------------------|------------------------|
| TTFB SSE | logged | logged |
| Usability видео-формы | минимал. | продвинутая (frames, style, modes) |
| Цена за prompt | одинаковая | одинаковая |
| Сложность UI | низкая | высокая |
| Сценарий клиентов | dev/power-user | креативщик/режиссёр |

Логировать в `/api/diag` ещё `source: hub|videozavod2` (заголовок `X-Client: videozavod2`). На дашборде diag — % использования.

---

## Phase E — слияние или развилка (по итогам D)

Опции:
1. **Сохранить оба UI** — gemini для текста/инженеров, videozavod2 для медиа/креатива. Оба общаются с одним API.
2. **Перенести лучшие части одного в другой** — например, frames-to-video из videozavod2 в gemini, или thinking-trace из gemini в videozavod2.
3. **Объединить под одним доменом** — `evotop.pro/text|video|photo|music` (рерайт nginx, общий header). Зависит от выбора клиента.

---

## Что НЕ трогаем в видео-заводе

- дизайн (header, navigation, gallery modal, photo generator UI)
- идею 4 ролей в чате
- идею checkpoints
- идею HD/4K/style toggles в видео-форме

Только бэкенд + чат-движок заменяем.

---

## Чек-лист на старт фазы A (если решим начать сейчас)

```
[ ] заменить ChatInterface.tsx на iframe-обёртку (10 строк)
[ ] добавить CSP frame-ancestors на gemini.evotop.pro (1 строка nginx)
[ ] выпустить новый GEMINI_API_KEY с HTTP referrer = videozavod2.evotop.pro/*
[ ] обновить .env.local на Poland
[ ] npm run build → systemctl reload nginx (для статики nginx сам видит новый dist)
[ ] smoke: https://videozavod2.evotop.pro → Текст → ввести "hi" → ответ
```

Время фазы A: ~30 минут. Регрессий ноль (видео/фото не трогаем).

---

## Артефакты

- VIDEOZAVOD2 репо: https://github.com/1tuberus/videozavod2
- VIDEOZAVOD2 deploy: `./deploy.sh` (git pull + npm ci + npm run build на Poland)
- GEMINI_HUB репо: (текущий — см. AIR_12/GEMINI_HUB)
- Nginx конфиги: `/etc/nginx/sites-enabled/{videozavod2,gemini}.evotop.pro`
- SSL: Let's Encrypt, авторенью cron
