import axios from "axios";

/** Bank of Canada's published daily USD→CAD rate (free, no key). */
const BOC_URL = "https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=1";

export function parseBankOfCanadaRate(json: unknown): number | null {
  const obs = (json as { observations?: { FXUSDCAD?: { v?: string } }[] } | null)?.observations;
  const rate = Number(Array.isArray(obs) ? obs[0]?.FXUSDCAD?.v : NaN);
  return Number.isFinite(rate) && rate > 1 && rate < 2 ? rate : null;
}

export async function fetchUsdCadRate(): Promise<number | null> {
  try {
    const res = await axios.get(BOC_URL, { timeout: 15_000, validateStatus: () => true });
    return res.status === 200 ? parseBankOfCanadaRate(res.data) : null;
  } catch {
    return null;
  }
}

export function toCadCents(cents: number, rate: number): number {
  return Math.round(cents * rate);
}
