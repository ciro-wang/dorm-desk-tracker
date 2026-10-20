/** Each merchant's own domain. Listing URLs must be https and on one of these hosts (or a subdomain). */
export const MERCHANT_DOMAINS: Record<string, string[]> = {
  "best-buy": ["bestbuy.ca"],
  "canada-computers": ["canadacomputers.com"],
  dell: ["dell.com"],
  amazon: ["amazon.ca"],
  "memory-express": ["memoryexpress.com"],
  newegg: ["newegg.ca"],
  fluance: ["fluance.com"],
  crutchfield: ["crutchfield.ca"],
  visions: ["visions.ca"],
  "bay-bloor-radio": ["baybloorradio.com"],
};

export function isMerchantUrl(url: string, merchantSlug: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  return (MERCHANT_DOMAINS[merchantSlug] ?? []).some((d) => host === d || host.endsWith(`.${d}`));
}
