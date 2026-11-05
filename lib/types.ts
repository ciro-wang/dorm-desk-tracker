export type Category = "monitor" | "speaker" | "chair";

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

export interface ChairSpecs {
  kind: "chair";
  /** The colour/version actually tracked, e.g. "Black / Standard". */
  variant: string;
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
  specs: MonitorSpecs | SpeakerSpecs | ChairSpecs;
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
  /** The store's own currency; USD prices are converted to CAD when checked. */
  currency: Currency;
}

export type Currency = "CAD" | "USD";

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
  /** The store's own price before conversion to CAD (US stores only). */
  nativePriceCents?: number | null;
  nativeCurrency?: Currency | null;
}

/** Something the owner already bought, watched for a price drop worth claiming. */
export interface Purchase {
  id: string;
  productId: string;
  merchantId: string;
  /** Before tax: what a price-difference claim is measured against. */
  paidCents: number;
  paidTotalCents: number | null;
  purchasedOn: string;
  /** Last day to claim a difference (or return and rebuy). */
  claimBy: string;
  claimNote: string;
  lastAlertedCents: number | null;
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
