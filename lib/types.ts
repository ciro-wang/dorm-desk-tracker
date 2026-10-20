export type Category = "monitor" | "speaker";

export interface MonitorSpecs {
  kind: "monitor";
  sizeIn: number;
  resW: number;
  resH: number;
  refreshHz: number;
  panel: string;
  panelHeightCm: number;
  usbcPdW: number | null;
  curve: string | null;
}

export interface SpeakerSpecs {
  kind: "speaker";
  wooferIn: number;
  subOut: boolean | null;
  dimensionsMm: { w: number; h: number; d: number } | null;
  inputs: string[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  msrpCents: number;
  targetHighCents: number;
  targetLowCents: number;
  colourPrefs: string[];
  specs: MonitorSpecs | SpeakerSpecs;
  active: boolean;
  alertsEnabled: boolean;
  referenceLowCents: number | null;
}

export interface Merchant {
  id: string;
  slug: string;
  name: string;
}

export interface PickupStore {
  id: string;
  merchantId: string;
  externalStoreId: string;
  name: string;
}

export interface Listing {
  id: string;
  productId: string;
  merchantId: string;
  url: string;
  isBundle: boolean;
  bundleContents: string | null;
  autoCheck: boolean;
  /** A marketplace seller the owner trusts; its new-condition prices count like the retailer's. */
  trustedSeller: boolean;
}

export type Condition = "new" | "open_box" | "refurbished";
export type Seller = "retailer" | "marketplace";
export type CheckStatus = "ok" | "blocked" | "failed" | "not_found";

export interface PickupStock {
  externalStoreId: string;
  storeName: string;
  inStock: boolean;
}

export interface ScrapeResult {
  status: CheckStatus;
  priceCents: number | null;
  wasPriceCents: number | null;
  shippingCents: number | null;
  inStockOnline: boolean | null;
  pickup: PickupStock[];
  condition: Condition;
  seller: Seller;
  colour: string | null;
  error: string | null;
}

export interface PriceLog extends ScrapeResult {
  id: string;
  listingId: string;
  checkedAt: string;
  source: "scraped" | "manual";
}

export interface NewsItemInput {
  source: "rfd" | "reddit";
  sourceId: string;
  title: string;
  url: string;
  publishedAt: string;
  excerpt: string;
}

export interface NewsItem extends NewsItemInput {
  id: string;
  score: number;
  matchedProductIds: string[];
  tags: string[];
}

export type VerdictLevel = "all_time_low" | "great" | "target" | "fair" | "not_a_deal" | "unknown";

export interface Verdict {
  level: VerdictLevel;
  inflatedWas: boolean;
  reasons: string[];
}
