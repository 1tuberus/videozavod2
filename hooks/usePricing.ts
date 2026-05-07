/**
 * hooks/usePricing.ts — публичная pricing_matrix хаба, кэш TTL 60s.
 *
 * SOURCE OF TRUTH: backend (hub) /api/pricing/public.
 * При недоступности — fallback на null (UI должен показать "Цена при генерации",
 * но НИКОГДА не разрешать генерацию без серверной верификации).
 *
 * Расчёт ИДЕНТИЧЕН backend `pricing_overrides.estimateTokens`:
 *   tokensFromUsd(usd) = ceil(usd × 85 × 2)  // RUB_PER_USD × TOKEN_MARKUP
 *   total = (base_rate × duration + audio_fixed_price × duration) × resMult × markup
 */
import { useEffect, useState } from "react";
import { getPublicPricing, PublicPricingRow } from "../services/hubClient";

export type PricingMatrix = Map<string, PublicPricingRow>;

let cached: { matrix: PricingMatrix; ts: number } | null = null;
const TTL = 60_000;

export function usePricing() {
  const [matrix, setMatrix] = useState<PricingMatrix | null>(cached?.matrix || null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cached && Date.now() - cached.ts < TTL) {
      setMatrix(cached.matrix); setLoading(false); return;
    }
    setLoading(true);
    getPublicPricing()
      .then(r => {
        if (!r) { setError(new Error("pricing_unavailable")); setMatrix(null); return; }
        const m: PricingMatrix = new Map();
        for (const row of r.rows) m.set(row.model_id, row);
        cached = { matrix: m, ts: Date.now() };
        setMatrix(m);
      })
      .finally(() => setLoading(false));
  }, []);

  return { matrix, loading, error };
}

// ─── Token math (mirrors backend) ──────────────────────────────────────────
const RUB_PER_USD = 85;
const TOKEN_MARKUP = 2;
export function tokensFromUsd(usd: number): number {
  return Math.ceil(Number(usd || 0) * RUB_PER_USD * TOKEN_MARKUP);
}

export interface EstimateInput {
  modelId: string;
  unit: "sec" | "img" | "track" | "1k_chars" | "1m_tokens";
  duration?: number;     // seconds, for unit=sec
  count?: number;        // images/tracks, for unit=img/track
  resolution?: string;   // "720p" | "1080p" | other
  audioEnabled?: boolean;
}

/**
 * Compute total tokens from matrix. Returns null if model is missing → caller
 * must fallback to "Price calculated upon generation" and ALWAYS rely on
 * backend verification before deducting.
 */
export function estimateFromMatrix(m: PricingMatrix | null, inp: EstimateInput): number | null {
  if (!m) return null;
  const row = m.get(inp.modelId);
  if (!row) return null;

  const dur = Math.max(1, Number(inp.duration || 1));
  const cnt = Math.max(1, Number(inp.count || 1));
  const resMult = inp.resolution === "1080p" ? Number(row.res_multiplier_1080 ?? 1)
                : inp.resolution === "720p"  ? Number(row.res_multiplier_720 ?? 1)
                : 1;
  const markup = Number(row.markup ?? 1);
  const base = Number(row.base_rate || 0);
  const audio = inp.audioEnabled ? Number(row.audio_fixed_price || 0) : 0;

  let usd = 0;
  if (inp.unit === "sec") {
    usd = (base * dur + audio * dur) * resMult * markup;
  } else if (inp.unit === "img") {
    usd = base * cnt * resMult * markup;
  } else if (inp.unit === "track") {
    usd = base * cnt * markup;
  } else {
    // 1k_chars, 1m_tokens — base × markup; UI almost never uses these
    usd = base * markup;
  }
  return tokensFromUsd(usd);
}

/** Per-unit price in tokens (without duration multiplication), useful for label. */
export function perUnitTokens(m: PricingMatrix | null, modelId: string): number | null {
  if (!m) return null;
  const row = m.get(modelId);
  if (!row) return null;
  return tokensFromUsd(Number(row.base_rate || 0) * Number(row.markup ?? 1));
}
