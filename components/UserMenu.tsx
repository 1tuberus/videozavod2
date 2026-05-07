/**
 * components/UserMenu.tsx — slide-out side panel (right) с профилем/настройками.
 * Pre-version: модули внутри как inline-секции; позже вынесем в components/menu/*.
 */
import React, { useEffect, useState } from "react";
import { Me, logout } from "../services/authClient";

const APP_VERSION = "v2026.05.07.1";
const SUPPORT_TG = "https://t.me/evotop_support";
const SUPPORT_EMAIL = "support@evotop.pro";

type Lang = "ru" | "en";
type View =
  | "root"
  | "profile"
  | "studio"
  | "history"
  | "referral"
  | "support";

interface Props {
  me: Me | null;
  onClose: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onOpenHistory: () => void;
  onLogin: () => void;
}

const planLabel = (me: Me | null): { text: string; cls: string } => {
  if (!me) return { text: "Гость", cls: "bg-white/5 text-gray-400" };
  if (me.role === "owner") return { text: "Owner", cls: "bg-amber-500/20 text-amber-300" };
  if (me.role === "admin") return { text: "Admin", cls: "bg-violet-500/20 text-violet-300" };
  return { text: "Free", cls: "bg-white/5 text-gray-300" };
};

const Row: React.FC<{
  icon: string; label: string; active?: boolean;
  onClick?: () => void; danger?: boolean;
}> = ({ icon, label, active, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
      active
        ? "bg-indigo-600/80 text-white"
        : danger
        ? "text-rose-400 hover:bg-rose-500/10"
        : "text-gray-200 hover:bg-white/5"
    }`}
  >
    <span className="w-5 text-center">{icon}</span>
    <span className="flex-1 text-left">{label}</span>
  </button>
);

// ───── sub-views (placeholders, потом вынесем в отдельные модули) ─────────────

const ProfileView: React.FC<{ me: Me | null }> = ({ me }) => (
  <div className="space-y-3 text-sm">
    <div className="text-base font-semibold">Профиль</div>
    {me ? (
      <>
        <div className="rounded-lg bg-white/5 p-3 space-y-1">
          <div className="text-[11px] text-gray-500 uppercase">Email</div>
          <div>{me.email}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-[11px] text-gray-500 uppercase">Роль</div>
            <div className="capitalize">{me.role}</div>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-[11px] text-gray-500 uppercase">Баланс</div>
            <div>${(me.balance_cents / 100).toFixed(2)}</div>
          </div>
        </div>
        <div className="rounded-lg bg-white/5 p-3">
          <div className="text-[11px] text-gray-500 uppercase mb-1">ID</div>
          <code className="text-[10px] text-gray-400 break-all">{me.id}</code>
        </div>
        <div className="text-[11px] text-gray-500">
          Аккаунт создан {new Date(me.created_at).toLocaleString()}
        </div>
        <button disabled className="w-full px-3 py-2 rounded bg-white/5 text-gray-500 text-xs cursor-not-allowed">
          Сменить пароль (скоро)
        </button>
      </>
    ) : (
      <div className="text-gray-400">Войдите, чтобы увидеть профиль.</div>
    )}
  </div>
);

const StudioView: React.FC<{ me: Me | null; onOpenAdmin: () => void }> = ({ me, onOpenAdmin }) => {
  const isStaff = me && (me.role === "admin" || me.role === "owner");
  return (
    <div className="space-y-3 text-sm">
      <div className="text-base font-semibold">Студия</div>
      <div className="text-xs text-gray-400">
        Управление подписками, балансом и контентом.
      </div>
      {isStaff ? (
        <button onClick={onOpenAdmin} className="w-full px-3 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-semibold">
          ⚙ Админ-панель
        </button>
      ) : (
        <div className="rounded-lg bg-white/5 p-3 space-y-2">
          <div className="text-sm">Тариф: <b>Free</b></div>
          <div className="text-xs text-gray-400">
            Хранение медиа: 60 дней. Подписка снимет лимит и даст ежемесячный кредит.
          </div>
          <button disabled className="w-full px-3 py-2 rounded bg-indigo-600/40 text-gray-400 text-xs cursor-not-allowed">
            Купить подписку (скоро)
          </button>
        </div>
      )}
    </div>
  );
};

const ReferralView: React.FC<{ me: Me | null }> = ({ me }) => {
  const code = me ? me.id.slice(0, 8).toUpperCase() : "GUEST";
  const link = `https://videozavod2.evotop.pro/?ref=${code}`;
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3 text-sm">
      <div className="text-base font-semibold">Реферальная программа</div>
      <div className="text-xs text-gray-400">
        Приглашай друзей — получай 10% от их пополнений на баланс.
      </div>
      <div className="rounded-lg bg-white/5 p-3 space-y-2">
        <div className="text-[11px] text-gray-500 uppercase">Твой код</div>
        <code className="block text-base font-mono text-emerald-300">{code}</code>
      </div>
      <div className="rounded-lg bg-white/5 p-3 space-y-2">
        <div className="text-[11px] text-gray-500 uppercase">Реферальная ссылка</div>
        <code className="block text-[11px] text-gray-300 break-all">{link}</code>
        <button
          onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(()=>setCopied(false), 1500); }}
          className="w-full px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs"
        >
          {copied ? "✓ Скопировано" : "Скопировать"}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-white/5 p-2"><div className="text-lg">0</div><div className="text-[10px] text-gray-500">Приглашено</div></div>
        <div className="rounded-lg bg-white/5 p-2"><div className="text-lg">0</div><div className="text-[10px] text-gray-500">Активны</div></div>
        <div className="rounded-lg bg-white/5 p-2"><div className="text-lg">$0</div><div className="text-[10px] text-gray-500">Заработано</div></div>
      </div>
    </div>
  );
};

const SupportView: React.FC = () => (
  <div className="space-y-3 text-sm">
    <div className="text-base font-semibold">Поддержка</div>
    <div className="text-xs text-gray-400">Опиши проблему — ответим в течение суток.</div>
    <a href={SUPPORT_TG} target="_blank" rel="noreferrer"
       className="block w-full px-3 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-sm text-center">
      Telegram: @evotop_support
    </a>
    <a href={`mailto:${SUPPORT_EMAIL}`}
       className="block w-full px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-center">
      Email: {SUPPORT_EMAIL}
    </a>
    <div className="rounded-lg bg-white/5 p-3 text-[11px] text-gray-400 space-y-1">
      <div>Версия: <span className="text-gray-200">{APP_VERSION}</span></div>
      <div>Магистраль: <span className="text-emerald-300">gemini.evotop.pro</span></div>
    </div>
  </div>
);

// ───── main panel ────────────────────────────────────────────────────────────

const UserMenu: React.FC<Props> = ({ me, onClose, onLogout, onOpenAdmin, onOpenHistory, onLogin }) => {
  const [view, setView] = useState<View>("root");
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("vz2_lang") as Lang) || "ru");
  const plan = planLabel(me);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const setLanguage = (l: Lang) => { setLang(l); localStorage.setItem("vz2_lang", l); };

  const goRoot = () => setView("root");
  const subView = view !== "root";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative h-full w-[340px] bg-zinc-950 border-l border-white/10 shadow-2xl flex flex-col animate-[slideIn_0.18s_ease-out]"
        style={{ animation: "slideIn 0.18s ease-out" }}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {/* header */}
        <div className="px-5 pt-5 pb-3 border-b border-white/5">
          {subView ? (
            <button onClick={goRoot} className="text-xs text-gray-400 hover:text-white mb-2 flex items-center gap-1">
              ← Назад
            </button>
          ) : null}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold truncate">
                {me ? me.email : "Гость"}
              </div>
              <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[11px] ${plan.cls}`}>
                {plan.text}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none p-1">×</button>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {view === "root" && (
            <>
              <Row icon="👤" label="Профиль" onClick={() => setView("profile")} />
              <Row icon="🎬" label="Студия" onClick={() => setView("studio")} />
              <Row icon="🕘" label="История" onClick={() => { onOpenHistory(); onClose(); }} />
              <Row icon="👥" label="Реферальная программа" onClick={() => setView("referral")} />
              <Row icon="🎧" label="Поддержка" onClick={() => setView("support")} active />

              <div className="pt-4 mt-2 border-t border-white/5">
                <div className="px-3 text-[11px] uppercase tracking-wider text-gray-500 mb-2">Версия</div>
                <div className="px-3 flex items-center justify-between">
                  <code className="text-sm text-gray-400">{APP_VERSION}</code>
                  <button
                    onClick={() => location.reload()}
                    title="Обновить"
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300"
                  >↻</button>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-white/5">
                <div className="px-3 text-[11px] uppercase tracking-wider text-gray-500 mb-2">Язык</div>
                <button
                  onClick={() => setLanguage("ru")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${lang === "ru" ? "bg-indigo-600 text-white" : "hover:bg-white/5"}`}
                >
                  <span className="font-bold w-7">RU</span><span>Русский</span>
                </button>
                <button
                  onClick={() => setLanguage("en")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${lang === "en" ? "bg-indigo-600 text-white" : "hover:bg-white/5"}`}
                >
                  <span className="font-bold w-7">EN</span><span>Английский</span>
                </button>
              </div>

              <div className="pt-4 mt-2 border-t border-white/5">
                {me ? (
                  <Row icon="⎋" label="Выйти" danger onClick={async () => { await logout(); onLogout(); onClose(); }} />
                ) : (
                  <Row icon="→" label="Войти" onClick={() => { onLogin(); onClose(); }} />
                )}
              </div>
            </>
          )}

          {view === "profile"  && <ProfileView  me={me} />}
          {view === "studio"   && <StudioView   me={me} onOpenAdmin={() => { onOpenAdmin(); onClose(); }} />}
          {view === "referral" && <ReferralView me={me} />}
          {view === "support"  && <SupportView />}
        </div>
      </aside>
    </div>
  );
};

export default UserMenu;
