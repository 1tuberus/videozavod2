// services/billingClient.ts — клиент к /api/billing/*.
import { getToken } from "./authClient";

const HUB = (import.meta as any).env?.VITE_HUB_URL || "https://gemini.evotop.pro";

export interface Plan {
  id: string; title: string; price_rub: number; tokens: number; bonus_pct: number; sort: number;
}
export interface Purchase {
  id: string; user_id: string; plan_id: string;
  amount_rub: number; tokens_credited: number;
  status: "pending" | "paid" | "failed" | "refunded";
  created_at: number; paid_at: number | null;
  cp_transaction_id: number | null;
  error_log?: string | null;
}
export interface CheckoutResp {
  ok: true; invoice_id: string;
  widget: {
    publicId: string; description: string;
    amount: number; currency: string;
    invoiceId: string; accountId: string; email: string;
    data: { plan_id: string; user_id: string; tokens: number };
  };
  site_url: string;
}

async function req(path: string, opts: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts.headers as any || {}) };
  const t = getToken(); if (t) headers["Authorization"] = `Bearer ${t}`;
  const r = await fetch(`${HUB}${path}`, { ...opts, headers });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}

export const fetchPlans = () => req("/api/billing/plans").then(j => j.plans as Plan[]);
export const fetchBalance = () => req("/api/billing/me/balance") as Promise<{
  ok: true; balance_tokens: number; current_plan: string | null; purchases: Purchase[];
}>;
export const checkout = (plan_id: string) =>
  req("/api/billing/checkout", { method: "POST", body: JSON.stringify({ plan_id }) }) as Promise<CheckoutResp>;

// admin
export const adminListPurchases = (q?: { user_id?: string; status?: string; limit?: number }) =>
  req(`/api/admin/billing/purchases?${new URLSearchParams(q as any).toString()}`);
export const adminGrantTokens = (user_id: string, tokens: number, reason?: string) =>
  req("/api/admin/billing/grant", { method: "POST", body: JSON.stringify({ user_id, tokens, reason }) });

// ─── CloudPayments widget ──────────────────────────────────────────────────
const CP_SCRIPT = "https://widget.cloudpayments.ru/bundles/cloudpayments.js";
let cpLoaded: Promise<void> | null = null;
function loadCpSdk(): Promise<void> {
  if (cpLoaded) return cpLoaded;
  cpLoaded = new Promise((resolve, reject) => {
    if ((window as any).cp) return resolve();
    const s = document.createElement("script");
    s.src = CP_SCRIPT; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("cp_sdk_load_failed"));
    document.head.appendChild(s);
  });
  return cpLoaded;
}

export async function openCloudPaymentsWidget(plan_id: string, opts?: {
  onSuccess?: (data: any) => void;
  onFail?: (reason: string) => void;
}): Promise<void> {
  const co = await checkout(plan_id);
  await loadCpSdk();
  const w = co.widget;
  const cp = new (window as any).cp.CloudPayments();
  cp.charge({
    publicId: w.publicId,
    description: w.description,
    amount: w.amount,
    currency: w.currency,
    invoiceId: w.invoiceId,
    accountId: w.accountId,
    email: w.email,
    skin: "modern",
    data: w.data,
  },
  (options: any) => { opts?.onSuccess?.(options); },
  (reason: string) => { opts?.onFail?.(reason); });
}
