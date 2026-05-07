/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from "react";
import { login, Me } from "../services/authClient";

interface Props { onSuccess: (me: Me) => void; onClose: () => void; }

export const LoginModal: React.FC<Props> = ({ onSuccess, onClose }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { const me = await login(email, password); onSuccess(me); }
    catch (ex: any) { setErr(ex.message || "Ошибка"); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e)=>e.stopPropagation()} className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-xl p-5 space-y-3">
        <div className="text-base font-semibold">Вход</div>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="email" autoFocus className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded text-sm"/>
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="пароль" className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded text-sm"/>
        {err && <div className="text-xs text-rose-400">{err}</div>}
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="px-3 py-2 bg-white/5 rounded text-sm">Отмена</button>
          <button disabled={busy || !email || !password} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded text-sm">{busy?"…":"Войти"}</button>
        </div>
      </form>
    </div>
  );
};

export default LoginModal;
