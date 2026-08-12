/**
 * View-model types for the storefront surface.
 *
 * These mirror the shapes the `@/server/services/*` layer returns (composed
 * from the Prisma models) but are declared here so the presentational
 * components stay self-contained and strongly typed regardless of how a given
 * query decides to `include` its relations. Money is always integer cents.
 */

export type Currency = string;

export interface ImageData {
  id?: string;
  url: string;
  alt?: string | null;
  position?: number;
}

export interface VendorSummary {
  id: string;
  slug: string;
  storeName: string;
  tagline?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  ratingAvg?: number;
  ratingCount?: number;
  productCount?: number;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  productCount?: number;
}

export interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  compareAtCents?: number | null;
  currency: Currency;
  inventory?: number;
  ratingAvg?: number;
  ratingCount?: number;
  aiGenerated?: boolean;
  /** Primary image, already resolved by the catalog service. */
  image?: ImageData;
  /** Unresolved gallery images (some views pass these instead). */
  images?: ImageData[];
  inStock?: boolean;
  status?: string;
  vendor: VendorSummary;
  category?: CategorySummary | null;
}

export interface ReviewData {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  createdAt: string | Date;
  customer: { name?: string | null; image?: string | null };
}

export interface ProductDetail extends ProductCardData {
  description: string;
  sku?: string;
  reviews?: ReviewData[];
  relatedFromVendor?: ProductCardData[];
}

export interface CartItemData {
  id: string;
  quantity: number;
  product: ProductCardData;
}

export interface CartData {
  id?: string;
  items: CartItemData[];
}

export interface CartTotals {
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  discountCents?: number;
  currency?: Currency;
}

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "FULFILLED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type ShipmentStatus =
  | "LABEL_CREATED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "EXCEPTION";

export type FulfillmentStatus = "UNFULFILLED" | "PACKED" | "SHIPPED" | "DELIVERED";

export interface ShipmentEvent {
  status: string;
  location?: string | null;
  timestamp: string | Date;
}

export interface ShipmentData {
  id: string;
  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  estimatedDelivery?: string | Date | null;
  events: ShipmentEvent[];
}

export interface OrderItemData {
  id: string;
  title: string;
  quantity: number;
  unitPriceCents: number;
  fulfillmentStatus?: FulfillmentStatus;
  product?: { slug: string; images?: ImageData[] } | null;
  vendor?: { slug: string; storeName: string } | null;
}

export interface AddressData {
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
}

export interface OrderSummaryLine {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  currency: Currency;
  createdAt: string | Date;
  items: OrderItemData[];
}

export interface OrderDetailData extends OrderSummaryLine {
  shipments?: ShipmentData[];
  shippingAddress?: AddressData | null;
}
