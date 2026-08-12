// Shared DTO types for LuxeMarket.
//
// These are the *view models* passed from server services into React Server
// Components and client widgets — deliberately flatter and lighter than the raw
// Prisma rows. Keeping them here (rather than leaking Prisma's generated types
// through the UI) means a query can change shape without rippling into every
// component. Money is always integer cents; dates cross the RSC boundary as
// `Date` unless a field is explicitly documented as an ISO string.

import type {
  FulfillmentStatus,
  OrderStatus,
  PayoutStatus,
  ProductStatus,
  Role,
  VendorStatus,
} from "@prisma/client";

/** Integer minor units (cents). Never a float. */
export type Cents = number;

/** A `YYYY-MM-DD` day key used for time-series buckets. */
export type DayKey = string;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PageParams {
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface VendorRef {
  id: string;
  slug: string;
  storeName: string;
}

export interface ProductImageDTO {
  url: string;
  alt: string;
  position: number;
}

/** The compact shape rendered in grids, carousels and search results. */
export interface ProductCard {
  id: string;
  slug: string;
  title: string;
  priceCents: Cents;
  compareAtCents: Cents | null;
  currency: string;
  /** Primary image, already resolved (falls back to a placeholder path). */
  image: ProductImageDTO;
  vendor: VendorRef;
  ratingAvg: number;
  ratingCount: number;
  inStock: boolean;
  /** Present when the product is on sale (compareAt > price). */
  discountPct: number | null;
  status: ProductStatus;
}

export interface ReviewDTO {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string;
  createdAt: Date;
}

export interface ReviewSummary {
  ratingAvg: number;
  ratingCount: number;
  /** Count of reviews per star bucket, indexed 1..5. */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

/** The full product page view model. */
export interface ProductDetail extends Omit<ProductCard, "image"> {
  description: string;
  sku: string;
  inventory: number;
  aiGenerated: boolean;
  images: ProductImageDTO[];
  category: CategoryRef | null;
  vendor: VendorRef & {
    tagline: string | null;
    logoUrl: string | null;
    ratingAvg: number;
    ratingCount: number;
  };
  reviews: ReviewDTO[];
  reviewSummary: ReviewSummary;
  /** Other ACTIVE listings from the same vendor, for the PDP rail. */
  relatedFromVendor: ProductCard[];
  createdAt: Date;
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryNode extends CategoryRef {
  imageUrl: string | null;
  productCount: number;
  children: CategoryNode[];
}

export interface VendorStorefront {
  id: string;
  slug: string;
  storeName: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  productCount: number;
  memberSince: Date;
  products: ProductCard[];
}

export type ProductSort = "featured" | "newest" | "price-asc" | "price-desc" | "rating";

export interface ListProductsParams extends PageParams {
  q?: string;
  categorySlug?: string;
  sort?: ProductSort;
  /** Inclusive price floor / ceiling in cents. */
  min?: Cents;
  max?: Cents;
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export interface CartLine {
  cartItemId: string;
  productId: string;
  slug: string;
  title: string;
  vendorName: string;
  currency: string;
  image: ProductImageDTO;
  unitPriceCents: Cents;
  quantity: number;
  lineTotalCents: Cents;
  /** Available stock, so the UI can cap the quantity stepper. */
  inventory: number;
  /** Set when the requested quantity exceeds available inventory. */
  overStock: boolean;
}

export interface CartTotals {
  itemCount: number;
  subtotalCents: Cents;
  taxCents: Cents;
  shippingCents: Cents;
  totalCents: Cents;
  currency: string;
}

export interface CartSummary {
  id: string | null;
  items: CartLine[];
  totals: CartTotals;
}

// ---------------------------------------------------------------------------
// Dashboards — vendor
// ---------------------------------------------------------------------------

export interface SalesPoint {
  date: DayKey;
  revenueCents: Cents;
  orders: number;
  units: number;
}

export interface TopProduct {
  productId: string;
  title: string;
  slug: string;
  image: ProductImageDTO | null;
  unitsSold: number;
  revenueCents: Cents;
}

/** Vendor console headline metrics + chart series. */
export interface DashboardStats {
  grossSalesCents: Cents;
  netEarningsCents: Cents;
  commissionCents: Cents;
  orderCount: number;
  unitsSold: number;
  avgOrderValueCents: Cents;
  payoutBalanceCents: Cents;
  /** Orders with at least one line still awaiting fulfillment. */
  pendingFulfillment: number;
  activeProducts: number;
  lowStockProducts: number;
  topProducts: TopProduct[];
  /** Trailing 30-day daily series, oldest first. */
  salesSeries: SalesPoint[];
}

export interface VendorProductRow {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  priceCents: Cents;
  compareAtCents: Cents | null;
  currency: string;
  inventory: number;
  status: ProductStatus;
  aiGenerated: boolean;
  sku: string | null;
  category: CategoryRef | null;
  unitsSold: number;
  ratingAvg: number;
  ratingCount: number;
  updatedAt: Date;
}

/** One of the vendor's line items, hydrated for the fulfillment table. */
export interface VendorOrderLine {
  /** OrderItem id — the unit fulfillment advances against. */
  id: string;
  orderNumber: string;
  productTitle: string;
  imageUrl: string | null;
  customerName: string;
  quantity: number;
  unitPriceCents: Cents;
  vendorEarningsCents: Cents;
  currency: string;
  fulfillmentStatus: FulfillmentStatus;
  createdAt: Date;
}

/** The full order summary shown in the vendor order detail drawer/route. */
export interface VendorOrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  placedAt: Date;
  customerName: string;
  customerEmail: string;
  shippingAddress: string | null;
  fulfillmentStatus: FulfillmentStatus;
  items: VendorOrderSummaryItem[];
  /** This vendor's take (gross of their lines, net of commission). */
  earningsCents: Cents;
  /** Whole-order totals (the customer paid these). */
  orderSubtotalCents: Cents;
  orderTaxCents: Cents;
  orderShippingCents: Cents;
  orderTotalCents: Cents;
  currency: string;
}

export interface VendorOrderSummaryItem {
  id: string;
  productTitle: string;
  imageUrl: string | null;
  quantity: number;
  unitPriceCents: Cents;
  vendorEarningsCents: Cents;
  fulfillmentStatus: FulfillmentStatus;
  /** Set when the whole order is cancelled/refunded. */
  refunded: boolean;
}

export interface PayoutRow {
  id: string;
  amountCents: Cents;
  currency: string;
  status: PayoutStatus;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Dashboards — admin
// ---------------------------------------------------------------------------

export interface CategoryMixSlice {
  categoryId: string;
  name: string;
  slug: string;
  productCount: number;
  revenueCents: Cents;
  /** Share of GMV, 0..1. */
  share: number;
}

export interface MarketplaceStats {
  gmvCents: Cents;
  /** Marketplace revenue = sum of commissions taken. */
  revenueCents: Cents;
  orderCount: number;
  averageOrderValueCents: Cents;
  activeVendors: number;
  pendingVendors: number;
  totalVendors: number;
  customerCount: number;
  productCount: number;
  /** Trailing 30-day GMV + commission series, oldest first. */
  revenueSeries: Array<{ date: DayKey; gmvCents: Cents; commissionCents: Cents; orders: number }>;
  categoryMix: CategoryMixSlice[];
}

export interface PendingVendorRow {
  id: string;
  storeName: string;
  slug: string;
  tagline: string | null;
  contactEmail: string;
  contactName: string | null;
  appliedAt: Date;
}

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  orderCount: number;
  vendorStatus: VendorStatus | null;
  createdAt: Date;
}

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  totalCents: Cents;
  currency: string;
  itemCount: number;
  vendorCount: number;
  placedAt: Date;
}

// ---------------------------------------------------------------------------
// AI copy generation
// ---------------------------------------------------------------------------

export type CopyTone = "premium" | "playful" | "minimal" | "technical" | "warm";

export interface GenerateDescriptionInput {
  title: string;
  category?: string;
  /** Free-form key/value product attributes (material, dimensions, origin…). */
  attributes?: Record<string, string | number | boolean | null | undefined>;
  tone?: CopyTone;
}

export interface GenerateDescriptionResult {
  /** Two to three polished paragraphs of body copy. */
  description: string;
  /** <= 60 char SEO/page title. */
  seoTitle: string;
  /** Three to five scannable selling points. */
  bullets: string[];
}

// ---------------------------------------------------------------------------
// Server action envelope
// ---------------------------------------------------------------------------

/** Discriminated result returned by server actions to client forms. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
