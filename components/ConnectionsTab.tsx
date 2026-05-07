/**
 * components/ConnectionsTab.tsx — статус систем + переключатель источника.
 */
import React, { useEffect, useState } from "react";
import { checkHubHealth, getSource, setSource, HubSource } from "../services/hubClient";

type Status = "ok" | "connecting" | "error";

const dotColor = (s: Status) =>
  s === "ok" ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
    : s === "connecting" ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
    : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]";

const Row: React.FC<{ status: Status; title: string; details: string }> = ({ status, title, details }) => (
  <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full ${dotColor(status)}`} />
    <div className="flex-1">
      <div className="font-medium text-white">{title}</div>
      <div className="text-xs text-gray-400 mt-0.5 font-mono break-all">{details}</div>
    </div>
    <div className="text-xs uppercase tracking-wider text-gray-400">{status}</div>
  </div>
);

const ConnectionsTab: React.FC = () => {
  const [hubStatus, setHubStatus] = useState<Status>("connecting");
  const [hubInfo, setHubInfo] = useState<string>("…");
  const [vertexStatus, setVertexStatus] = useState<Status>("connecting");
  const [vertexInfo, setVertexInfo] = useState<string>("…");
  const [lsStatus, setLsStatus] = useState<Status>("ok");
  const [lsInfo, setLsInfo] = useState<string>("");
  const [source, setSrc] = useState<HubSource>(getSource());

  const refresh = async () => {
    setHubStatus("connecting");
    setVertexStatus("connecting");
    try {
      const j = await checkHubHealth();
      setHubStatus(j.ok ? "ok" : "error");
      setHubInfo(`v${j.version} · gemini.evotop.pro`);
      setVertexStatus(j.vertex_key_configured ? "ok" : "error");
      setVertexInfo(j.vertex_key_configured
        ? "Vertex Grant $1000 — серверный ключ активен"
        : "GEMINI_API_KEY на сервере не задан");
    } catch (e: any) {
      setHubStatus("error");
      setHubInfo(`Connection error: ${e.message}`);
      setVertexStatus("error");
      setVertexInfo("Невозможно проверить — HUB недоступен");
    }
    try {
      const k = "vz2_test_" + Date.now();
      localStorage.setItem(k, "1");
      const ok = localStorage.getItem(k) === "1";
      localStorage.removeItem(k);
      const used = JSON.stringify(localStorage).length;
      setLsStatus(ok ? "ok" : "error");
      setLsInfo(ok ? `Доступно · использовано ~${(used / 1024).toFixed(1)} KB` : "localStorage недоступен");
    } catch (e: any) {
      setLsStatus("error");
      setLsInfo(e.message);
    }
  };

  useEffect(() => { refresh(); const t = setInterval(refresh, 30000); return () => clearInterval(t); }, []);

  const onToggle = (s: HubSource) => { setSource(s); setSrc(s); };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Статус систем</h2>
          <button onClick={refresh} className="text-xs px-3 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40">
            Обновить
          </button>
        </div>
        <Row status={hubStatus} title="HUB API (Poland)" details={hubInfo} />
        <Row status={vertexStatus} title="Google Vertex (Grant $1000)" details={vertexInfo} />
        <Row status={lsStatus} title="Local Storage" details={lsInfo} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-bold mb-2">Источник генерации</h2>
        <p className="text-sm text-gray-400 mb-4">
          По умолчанию — <b>HUB Server</b>: запросы идут через защищённую магистраль с серверным ключом.
          Browser-режим использует ключ из бандла (free-tier, для отладки).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onToggle("hub")}
            className={`p-4 rounded-xl border transition-all ${source === "hub"
              ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
              : "border-white/10 bg-white/5 hover:bg-white/10"}`}
          >
            <div className="text-base font-semibold">🛡 HUB Server</div>
            <div className="text-xs text-gray-400 mt-1">Vertex Grant защищён, цены контролируются сервером</div>
          </button>
          <button
            onClick={() => onToggle("browser")}
            className={`p-4 rounded-xl border transition-all ${source === "browser"
              ? "border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(251,191,36,0.25)]"
              : "border-white/10 bg-white/5 hover:bg-white/10"}`}
          >
            <div className="text-base font-semibold">⚠ Browser</div>
            <div className="text-xs text-gray-400 mt-1">Прямые вызовы Google API из браузера (скомпрометирован)</div>
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Текущий источник: <span className="text-white font-mono">{source}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm">
        <h2 className="text-lg font-bold mb-2">Архитектура</h2>
        <pre className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{`Browser (videozavod2)
  └─ FACTORY_BEARER → https://gemini.evotop.pro/api/factory/*
        └─ server-side GEMINI_API_KEY (Vertex Grant)
              └─ Veo / Imagen / Nano Banana / gemini-*`}</pre>
      </div>
    </div>
  );
};

export default ConnectionsTab;
