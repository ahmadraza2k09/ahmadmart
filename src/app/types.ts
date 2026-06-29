// Shared product type used by the storefront, the admin panel, and the API client.
export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  priceNote?: string; // e.g. "per month", "onwards" — shown next to the price
  category: string;
  subcategory: string;
  image: string;
  images: string[];
  rating: number;
  reviews: number;
  badge?: "new" | "sale" | "bestseller";
  featured?: boolean; // admin-curated — featured products are prioritised everywhere
  deliveryCharge?: number | null; // seller-set delivery charge (per product); null = use default
  inStock: boolean;
  isService?: boolean; // digital service — bought by contacting us on WhatsApp, not via cart
  description: string;
  specs: Record<string, string>;
  // Marketplace: which seller's store this product belongs to (absent = official Ahmad Mart).
  sellerId?: number;
  sellerStore?: string;
  sellerWhatsapp?: string;
  sellerJazzcashNumber?: string;
  sellerJazzcashTitle?: string;
}
