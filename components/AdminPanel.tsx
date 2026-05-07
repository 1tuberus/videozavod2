/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo, useState } from "react";
import { adminApi, AdminUser, Me, Role } from "../services/authClient";

type Tab = "users" | "media" | "metrics" | "audit" | "settings";

interface Props { me: Me; onClose: () => void; }

const fmtUsd = (n: number) => `$${(n || 0).toFixed(2)}`;
const fmtDate = (ms: number) => new Date(ms).toLocaleString("ru-RU");
const cents = (c: number) => `$${(c / 100).toFixed(2)}`;

export const AdminPanel: React.FC<Props> = ({ me, onClose }) => {
  const [tab, setTab] = useState<Tab>("users");
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[88vh] bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-bold">A</div>
            <div>
              <div className="text-base font-semibold">Admin Panel</div>
              <div className="text-xs text-gray-400">{me.email} · <span className="uppercase">{me.role}</span></div>
            </div>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-md border border-white/10">✕ Закрыть</button>
        </div>
        <nav className="flex gap-1 px-4 pt-3 border-b border-white/5 bg-zinc-900/50">
          {(["users","media","metrics","audit","settings"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-medium rounded-t-md transition-all ${tab===t?"bg-zinc-950 text-white border-x border-t border-white/10":"text-gray-400 hover:text-white"}`}>
              {t === "users" && "Пользователи"}
              {t === "media" && "Медиа"}
              {t === "metrics" && "Метрики"}
              {t === "audit" && "Аудит"}
              {t === "settings" && "Настройки"}
            </button>
          ))}
        </nav>
        <div className="flex-1 overflow-auto p-6">
          {tab === "users" && <UsersTab me={me} />}
          {tab === "media" && <MediaTab />}
          {tab === "metrics" && <MetricsTab />}
          {tab === "audit" && <AuditTab />}
          {tab === "settings" && <SettingsTab me={me} />}
        </div>
      </div>
    </div>
  );
};

// ---- Users ----------------------------------------------------------------
const UsersTab: React.FC<{ me: Me }> = ({ me }) => {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"" | Role>("");
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try { const j = await adminApi.listUsers({ q, role, limit: 100 }); setRows(j.rows); setTotal(j.total); }
    catch (e: any) { alert(e.message); }
    setBusy(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, role]);

  const canEditOwner = me.role === "owner";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Поиск по email" className="flex-1 px-3 py-2 bg-zinc-900 border border-white/10 rounded-md text-sm focus:outline-none focus:border-indigo-500"/>
        <select value={role} onChange={e=>setRole(e.target.value as any)} className="px-3 py-2 bg-zinc-900 border border-white/10 rounded-md text-sm">
          <option value="">Все роли</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
        <button onClick={()=>setShowCreate(true)} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-md">+ Создать</button>
      </div>
      <div className="text-xs text-gray-500">Всего: {total}{busy && " · loading…"}</div>
      <div className="overflow-x-auto rounded-lg border border-white/5">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-xs text-gray-400">
            <tr>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Роль</th>
              <th className="text-right px-3 py-2">Баланс</th>
              <th className="text-left px-3 py-2">Статус</th>
              <th className="text-left px-3 py-2">Создан</th>
              <th className="text-right px-3 py-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id} className="border-t border-white/5 hover:bg-white/[.02]">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">
                  <RoleSelect u={u} me={me} canEditOwner={canEditOwner} onChange={load}/>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{cents(u.balance_cents)}</td>
                <td className="px-3 py-2">
                  {u.banned
                    ? <span className="text-rose-400">забанен{u.ban_reason ? ` (${u.ban_reason})` : ""}</span>
                    : <span className="text-emerald-400">active</span>}
                </td>
                <td className="px-3 py-2 text-xs text-gray-400">{fmtDate(u.created_at)}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  <BalanceBtn u={u} onDone={load}/>
                  {u.banned
                    ? <button onClick={async()=>{ await adminApi.unban(u.id); load(); }} className="text-xs text-emerald-400 hover:underline">Разбан</button>
                    : <button onClick={async()=>{ const r = prompt("Причина бана?"); if(r==null) return; await adminApi.ban(u.id, r); load(); }} className="text-xs text-amber-400 hover:underline">Бан</button>}
                  {canEditOwner && u.role !== "owner" && (
                    <button onClick={async()=>{ if(!confirm(`Удалить ${u.email}? Это уничтожит все его медиа.`)) return; await adminApi.deleteUser(u.id); load(); }}
                      className="text-xs text-rose-400 hover:underline">Удалить</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showCreate && <CreateUserModal me={me} onClose={()=>setShowCreate(false)} onCreated={()=>{setShowCreate(false); load();}}/>}
    </div>
  );
};

const RoleSelect: React.FC<{ u: AdminUser; me: Me; canEditOwner: boolean; onChange: ()=>void }> = ({ u, me, canEditOwner, onChange }) => {
  const allowed: Role[] = canEditOwner ? ["owner","admin","user"] : ["admin","user"];
  const disabled = (u.role === "owner" && !canEditOwner) || u.id === me.id;
  return (
    <select disabled={disabled} value={u.role}
      onChange={async (e)=>{
        const role = e.target.value as Role;
        try { await adminApi.setRole(u.id, role); onChange(); } catch (err:any) { alert(err.message); onChange(); }
      }}
      className={`text-xs px-2 py-1 rounded-md border ${u.role==="owner"?"bg-violet-500/10 border-violet-500/30":u.role==="admin"?"bg-indigo-500/10 border-indigo-500/30":"bg-zinc-800 border-white/10"}`}>
      {allowed.map(r => <option key={r} value={r}>{r}</option>)}
    </select>
  );
};

const BalanceBtn: React.FC<{ u: AdminUser; onDone: ()=>void }> = ({ u, onDone }) => {
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState("");
  const submit = async () => {
    const cents = Math.round(Number(delta) * 100);
    if (!Number.isFinite(cents) || cents === 0) return;
    try { await adminApi.adjustBalance(u.id, cents, reason); setOpen(false); setDelta("0"); setReason(""); onDone(); }
    catch (e: any) { alert(e.message); }
  };
  return (
    <span className="relative">
      <button onClick={()=>setOpen(!open)} className="text-xs text-indigo-400 hover:underline">±$</button>
      {open && (
        <div className="absolute right-0 top-6 z-10 w-64 p-3 bg-zinc-900 border border-white/10 rounded-md shadow-xl">
          <div className="text-xs text-gray-400 mb-2">Изменение баланса (USD, может быть отрицательным)</div>
          <input value={delta} onChange={e=>setDelta(e.target.value)} className="w-full mb-2 px-2 py-1 bg-black border border-white/10 rounded text-sm"/>
          <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Причина" className="w-full mb-2 px-2 py-1 bg-black border border-white/10 rounded text-sm"/>
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs">Применить</button>
            <button onClick={()=>setOpen(false)} className="px-2 py-1 bg-white/5 rounded text-xs">×</button>
          </div>
        </div>
      )}
    </span>
  );
};

const CreateUserModal: React.FC<{ me: Me; onClose: ()=>void; onCreated: ()=>void }> = ({ me, onClose, onCreated }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { await adminApi.createUser({ email, password, role }); onCreated(); }
    catch (e: any) { alert(e.message); }
    setBusy(false);
  };
  const allowed: Role[] = me.role === "owner" ? ["owner","admin","user"] : ["admin","user"];
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-xl p-5 space-y-3">
        <div className="text-base font-semibold">Создать пользователя</div>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded text-sm"/>
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Пароль (10+)" type="password" className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded text-sm"/>
        <select value={role} onChange={e=>setRole(e.target.value as Role)} className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded text-sm">
          {allowed.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 bg-white/5 rounded text-sm">Отмена</button>
          <button disabled={busy || !email || password.length<8} onClick={submit} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded text-sm">{busy?"…":"Создать"}</button>
        </div>
      </div>
    </div>
  );
};

// ---- Media ----------------------------------------------------------------
const MediaTab: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<{ user?: string; type?: string; model?: string }>({});
  const load = async () => {
    try { const j = await adminApi.listMedia({ ...filter, limit: 100 }); setRows(j.rows); setTotal(j.total); } catch (e:any){ alert(e.message); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <select value={filter.type||""} onChange={e=>setFilter({...filter, type: e.target.value || undefined})} className="px-3 py-2 bg-zinc-900 border border-white/10 rounded text-sm">
          <option value="">Все типы</option><option value="video">Видео</option><option value="image">Картинки</option><option value="music">Музыка</option>
        </select>
        <input placeholder="user_id" value={filter.user||""} onChange={e=>setFilter({...filter, user: e.target.value || undefined})} className="px-3 py-2 bg-zinc-900 border border-white/10 rounded text-sm flex-1"/>
      </div>
      <div className="text-xs text-gray-500">Всего: {total}</div>
      <table className="w-full text-sm border border-white/5 rounded-lg overflow-hidden">
        <thead className="bg-zinc-900 text-xs text-gray-400">
          <tr><th className="text-left px-3 py-2">Тип</th><th className="text-left px-3 py-2">Модель</th><th className="text-left px-3 py-2">User</th><th className="text-right px-3 py-2">$</th><th className="text-left px-3 py-2">Создан</th><th className="text-left px-3 py-2">Истекает</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t border-white/5">
              <td className="px-3 py-2">{r.type}</td>
              <td className="px-3 py-2 text-xs">{r.model}</td>
              <td className="px-3 py-2 text-xs text-gray-400">{r.user_id.slice(0,8)}…</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtUsd(r.cost_usd||0)}</td>
              <td className="px-3 py-2 text-xs text-gray-400">{fmtDate(r.created_at)}</td>
              <td className="px-3 py-2 text-xs">{r.expires_at ? fmtDate(r.expires_at) : <span className="text-emerald-400">∞</span>}</td>
              <td className="px-3 py-2 text-right space-x-2">
                {r.expires_at && <button onClick={async()=>{ await adminApi.pinMedia(r.id); load(); }} className="text-xs text-emerald-400">📌 Pin</button>}
                <button onClick={async()=>{ if(!confirm("Удалить?")) return; await adminApi.deleteMedia(r.id); load(); }} className="text-xs text-rose-400">×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---- Metrics --------------------------------------------------------------
const MetricsTab: React.FC = () => {
  const [range, setRange] = useState<"24h"|"7d"|"30d">("24h");
  const [m, setM] = useState<any>(null);
  useEffect(() => { adminApi.metrics(range).then(setM).catch(()=>{}); }, [range]);
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["24h","7d","30d"] as const).map(r => (
          <button key={r} onClick={()=>setRange(r)} className={`px-3 py-1.5 text-xs rounded ${range===r?"bg-indigo-600":"bg-white/5"}`}>{r}</button>
        ))}
      </div>
      {m ? (
        <>
          <div className="grid grid-cols-4 gap-3">
            <Kpi label="Пользователей" value={m.total_users}/>
            <Kpi label="Активных" value={m.active_users}/>
            <Kpi label="Запросов" value={m.requests}/>
            <Kpi label="Расход" value={fmtUsd(m.est_usd)}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-white/5 rounded-lg p-4">
              <div className="text-sm font-semibold mb-2">По моделям</div>
              <table className="w-full text-xs">
                <tbody>
                  {(m.by_model||[]).map((r:any)=>(
                    <tr key={r.model}><td className="py-1">{r.model}</td><td className="text-right tabular-nums">{r.n}</td><td className="text-right tabular-nums text-emerald-400">{fmtUsd(r.usd||0)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border border-white/5 rounded-lg p-4">
              <div className="text-sm font-semibold mb-2">Топ-10 пользователей</div>
              <table className="w-full text-xs">
                <tbody>
                  {(m.top_users||[]).map((u:any)=>(
                    <tr key={u.id}><td className="py-1">{u.email}</td><td className="text-right tabular-nums">{u.n}</td><td className="text-right tabular-nums text-emerald-400">{fmtUsd(u.usd||0)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : <div className="text-sm text-gray-500">Загрузка…</div>}
    </div>
  );
};
const Kpi: React.FC<{label:string; value: any}> = ({ label, value }) => (
  <div className="border border-white/5 rounded-lg p-3 bg-zinc-900/40">
    <div className="text-xs text-gray-400">{label}</div>
    <div className="text-xl font-semibold tabular-nums">{value}</div>
  </div>
);

// ---- Audit ----------------------------------------------------------------
const AuditTab: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { adminApi.audit({ limit: 200 }).then(j=>setRows(j.rows||[])).catch(()=>{}); }, []);
  return (
    <table className="w-full text-xs border border-white/5 rounded-lg overflow-hidden">
      <thead className="bg-zinc-900 text-gray-400">
        <tr><th className="text-left px-3 py-2">Время</th><th className="text-left px-3 py-2">Actor</th><th className="text-left px-3 py-2">Action</th><th className="text-left px-3 py-2">Target</th><th className="text-left px-3 py-2">Meta</th></tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} className="border-t border-white/5">
            <td className="px-3 py-1 text-gray-400">{fmtDate(r.created_at)}</td>
            <td className="px-3 py-1">{r.actor_id?.slice(0,8) || "system"}</td>
            <td className="px-3 py-1 font-mono">{r.action}</td>
            <td className="px-3 py-1 text-gray-400">{r.target_type}/{r.target_id?.slice(0,8)}</td>
            <td className="px-3 py-1 font-mono text-gray-500 truncate max-w-xs">{r.meta_json}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ---- Settings -------------------------------------------------------------
const SettingsTab: React.FC<{ me: Me }> = ({ me }) => {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (me.role !== "owner") return alert("Только владелец");
    if (!confirm("Запустить очистку устаревших медиа сейчас?")) return;
    setBusy(true);
    try { const r = await adminApi.retentionRun(); alert(`Удалено: ${r.removed_media}`); }
    catch (e: any) { alert(e.message); }
    setBusy(false);
  };
  return (
    <div className="space-y-4 max-w-2xl">
      <Section title="Политика хранения">
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <span className="text-emerald-400">Owner / Admin</span> — медиа хранятся бессрочно</li>
          <li>• <span className="text-indigo-400">User</span> — видео и картинки хранятся 60 дней</li>
          <li>• Авто-уборка: каждые 6 часов</li>
        </ul>
        <button disabled={busy || me.role!=="owner"} onClick={run} className="mt-3 px-3 py-2 text-sm bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded">
          {busy ? "Уборка…" : "Запустить уборку сейчас (owner)"}
        </button>
      </Section>
      <Section title="Тарифы и роли">
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <span className="text-violet-400">Owner</span> — полный доступ, создание admins/owners</li>
          <li>• <span className="text-indigo-400">Admin</span> — управление users и admins, без owner</li>
          <li>• <span className="text-emerald-400">User</span> — только свои ресурсы</li>
        </ul>
      </Section>
    </div>
  );
};
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border border-white/5 rounded-lg p-4">
    <div className="text-sm font-semibold mb-2">{title}</div>
    {children}
  </div>
);

export default AdminPanel;
