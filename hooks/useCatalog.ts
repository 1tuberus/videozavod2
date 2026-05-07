/**
 * hooks/useCatalog.ts — кэш каталога моделей с TTL 5 мин.
 * Используй в формах: const { catalog } = useCatalog();
 *                     const videoModels = catalog?.video || [];
 */
import { useEffect, useState } from "react";
import { Catalog } from "../types";
import { getCatalog } from "../services/hubClient";

let cached: Catalog | null = null;
let cachedAt = 0;
const TTL = 5 * 60_000;

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(cached);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached && Date.now() - cachedAt < TTL) { setCatalog(cached); setLoading(false); return; }
    setLoading(true);
    getCatalog()
      .then(c => { cached = c; cachedAt = Date.now(); setCatalog(c); setLoading(false); })
      .catch(e => { setError(e); setLoading(false); });
  }, []);

  return { catalog, loading, error };
}
