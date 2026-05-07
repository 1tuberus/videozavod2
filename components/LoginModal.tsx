/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from "react";
import { login, register, Me } from "../services/authClient";

interface Props { onSuccess: (me: Me) => void; onClose: () => void; }
type Mode = "login" | "register";

export const LoginModal: React.FC<Props> = ({ onSuccess, onClose }) => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [welcomeTokens, setWelcome] = useState<number | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (mode === "login") {
        const me = await login(email, password);
        onSuccess(me);
      } else {
        if (!agree) throw new Error("Подтвердите согласие с офертой и политикой");
        const { user, welcome_tokens } = await register(email, password);
        setWelcome(welcome_tokens);
        setTimeout(() => onSuccess(user), 1200);
      }
    } catch (ex: any) {
      setErr(translateError(ex.message));
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e)=>e.stopPropagation()} className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">{mode === "login" ? "Вход" : "Регистрация"}</div>
          <div className="flex bg-white/5 rounded-lg p-0.5 text-xs">
            <button type="button" onClick={()=>{ setMode("login"); setErr(null); }} className={`px-2.5 py-1 rounded ${mode==="login"?"bg-indigo-600":""}`}>Войти</button>
            <button type="button" onClick={()=>{ setMode("register"); setErr(null); }} className={`px-2.5 py-1 rounded ${mode==="register"?"bg-indigo-600":""}`}>Создать</button>
          </div>
        </div>

        {welcomeTokens !== null ? (
          <div className="rounded-lg bg-emerald-600/20 border border-emerald-500/40 p-4 text-center">
            <div className="text-2xl mb-1">🎁</div>
            <div className="font-semibold">Аккаунт создан</div>
            <div className="text-sm text-emerald-200 mt-1">+{welcomeTokens} токенов в подарок</div>
          </div>
        ) : (
          <>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="email" autoFocus className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded text-sm"/>
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder={mode==="register"?"пароль (мин. 6 символов)":"пароль"} className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded text-sm"/>
            {mode === "register" && (
              <label className="flex items-start gap-2 text-[11px] text-gray-400 cursor-pointer">
                <input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} className="mt-0.5 accent-indigo-500"/>
                <span>Я согласен с <a href="/legal/terms" target="_blank" className="text-indigo-300 underline">Офертой</a>, <a href="/legal/privacy" target="_blank" className="text-indigo-300 underline">Политикой конфиденциальности</a> и <a href="/legal/refund" target="_blank" className="text-indigo-300 underline">условиями возврата</a>.</span>
              </label>
            )}
            {err && <div className="text-xs text-rose-400">{err}</div>}
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={onClose} className="px-3 py-2 bg-white/5 rounded text-sm">Отмена</button>
              <button disabled={busy || !email || !password || (mode==="register" && !agree)} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded text-sm">
                {busy?"…":(mode==="login"?"Войти":"Создать аккаунт")}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

function translateError(m: string): string {
  const map: Record<string,string> = {
    "invalid_email": "Неверный формат email",
    "weak_password": "Пароль слишком короткий (мин. 6 символов)",
    "email_exists": "Email уже зарегистрирован",
    "invalid_credentials": "Неверный email или пароль",
    "banned": "Аккаунт заблокирован",
  };
  return map[m] || m || "Ошибка";
}

export default LoginModal;
