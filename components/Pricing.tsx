/**
 * components/Pricing.tsx — страница тарифов 1:1 со скрином.
 * 4 карточки + Framer Motion appearance + CloudPayments widget на «Купить».
 */
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchPlans, openCloudPaymentsWidget, Plan } from "../services/billingClient";

const PLAN_META: Record<string, {
  icon: string; bg: string; border: string; cta: string; highlight?: boolean; topPick?: boolean;
  videos: { sora2: number; veo: number; seedance: number }; photos: number; tracks: number;
}> = {
  starter:  { icon: "✦",  bg: "bg-zinc-900/60",         border: "border-white/10",
              cta: "bg-white/5 hover:bg-white/10",
              videos: { sora2: 23,  veo: 11,  seedance: 14  }, photos: 174,  tracks: 43 },
  popular:  { icon: "⚡", bg: "bg-zinc-900/60",         border: "border-white/10", topPick: true,
              cta: "bg-white/5 hover:bg-white/10",
              videos: { sora2: 57,  veo: 28,  seedance: 34  }, photos: 431,  tracks: 107 },
  premium:  { icon: "♛",  bg: "bg-gradient-to-b from-violet-900/30 to-zinc-900/60", border: "border-violet-500/60",
              cta: "bg-indigo-600 hover:bg-indigo-500", highlight: true,
              videos: { sora2: 125, veo: 62,  seedance: 75  }, photos: 937,  tracks: 234 },
  ultra:    { icon: "🚀", bg: "bg-zinc-900/60",         border: "border-white/10",
              cta: "bg-white/5 hover:bg-white/10",
              videos: { sora2: 433, veo: 217, seedance: 260 }, photos: 3250, tracks: 812 },
};

interface Props { onPurchased?: () => void; }

const Pricing: React.FC<Props> = ({ onPurchased }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => { fetchPlans().then(setPlans).catch(()=>setPlans([])); }, []);

  const buy = async (plan_id: string) => {
    setBusy(plan_id); setToast(null);
    try {
      await openCloudPaymentsWidget(plan_id, {
        onSuccess: () => {
          setToast({ kind: "ok", text: "Оплата прошла. Токены зачислены." });
          onPurchased?.();
        },
        onFail: (reason) => setToast({ kind: "err", text: `Ошибка оплаты: ${reason}` }),
      });
    } catch (e: any) {
      setToast({ kind: "err", text: e.message || "Ошибка checkout" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
          Тарифные планы
        </h1>
        <p className="mt-3 text-gray-400 text-sm md:text-base">
          Выберите подходящий пакет токенов для создания видео с помощью AI
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 max-w-7xl mx-auto px-4">
        {plans.map((p, i) => {
          const m = PLAN_META[p.id] || PLAN_META.starter;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`relative rounded-2xl p-6 border ${m.bg} ${m.border} ${m.highlight ? "shadow-[0_0_40px_-10px_rgba(139,92,246,0.6)]" : ""}`}
            >
              {m.topPick && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-[10px] font-bold tracking-wider">
                  ТОП ВЫБОР
                </div>
              )}

              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-lg bg-white/5 flex items-center justify-center text-xl">
                  {m.icon}
                </div>
                <div className="text-2xl font-semibold">{p.title}</div>
              </div>

              <div className="mb-1 flex items-baseline gap-2">
                <div className="text-5xl font-extrabold tracking-tight">{p.price_rub.toLocaleString("ru")}</div>
                <div className="text-2xl text-gray-400">₽</div>
                {p.bonus_pct > 0 && (
                  <span className="ml-auto px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-semibold">
                    +{p.bonus_pct}%
                  </span>
                )}
              </div>
              <div className="text-indigo-300 text-sm font-semibold mb-6">
                {p.tokens.toLocaleString("ru")} токенов
              </div>

              <button
                onClick={() => buy(p.id)}
                disabled={busy !== null}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${m.cta}`}
              >
                {busy === p.id ? "Открываем CloudPayments…" : "Купить"}
              </button>

              <ul className="mt-6 space-y-2 text-[13px] text-gray-300">
                <Feat>~{m.videos.sora2} видео Sora 2</Feat>
                <Feat>~{m.videos.veo} видео Veo 3.1 Fast</Feat>
                <Feat>~{m.videos.seedance} видео Seedance 2.0</Feat>
                <Feat>~{m.photos} фото Nano Banana</Feat>
                <Feat>~{m.tracks} треков Suno v5</Feat>
              </ul>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center mt-10 text-gray-500 text-xs space-y-1"
      >
        <div>1 токен = 1 рубль. Токены не сгорают и действуют бессрочно.</div>
        <div>Оплата производится через безопасный сервис CloudPayments</div>
      </motion.div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-2xl ${
              toast.kind === "ok" ? "bg-emerald-600" : "bg-rose-600"
            }`}
            onAnimationComplete={() => setTimeout(() => setToast(null), 4000)}
          >
            <div className="text-sm">{toast.text}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Feat: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-center gap-2">
    <span className="text-indigo-400">✓</span>
    <span>{children}</span>
  </li>
);

export default Pricing;
