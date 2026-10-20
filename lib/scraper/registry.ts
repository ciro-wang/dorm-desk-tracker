import { bestBuyAdapter } from "@/lib/scraper/adapters/best-buy";
import { canadaComputersAdapter } from "@/lib/scraper/adapters/canada-computers";
import { genericAdapter } from "@/lib/scraper/adapters/generic";
import type { MerchantAdapter } from "@/lib/scraper/types";

const adapters: Record<string, MerchantAdapter> = {
  [bestBuyAdapter.merchantSlug]: bestBuyAdapter,
  [canadaComputersAdapter.merchantSlug]: canadaComputersAdapter,
};

export function getAdapter(merchantSlug: string): MerchantAdapter {
  return adapters[merchantSlug] ?? genericAdapter;
}
