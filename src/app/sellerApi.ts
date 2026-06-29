// Frontend client for seller product management and the admin sellers view.
import type { Product } from "./types";
import { getToken } from "./auth";

async function send(url: string, method: string, body?: unknown) {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Check your connection and try again.");
  }
  if (res.status === 404) throw new Error("Seller service is unavailable. The app must be deployed with the database connected.");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data;
}

/** A seller's own products. */
export async function sellerGetProducts(): Promise<Product[]> {
  return (await send("/api/seller/products", "GET")).products as Product[];
}
export async function sellerCreateProduct(p: Partial<Product>): Promise<Product> {
  return (await send("/api/seller/products", "POST", p)).product as Product;
}
export async function sellerUpdateProduct(p: Partial<Product>): Promise<Product> {
  return (await send("/api/seller/products", "PUT", p)).product as Product;
}
export async function sellerDeleteProduct(id: number): Promise<void> {
  await send("/api/seller/products", "DELETE", { id });
}

/** Seller: apply one delivery charge to ALL of their products at once. */
export async function sellerSetAllDelivery(deliveryCharge: number | null): Promise<number> {
  return (await send("/api/seller/products", "PATCH", { deliveryCharge })).updated as number;
}

export interface SellerSummary {
  id: number;
  name: string;
  email: string;
  storeName: string;
  whatsapp: string;
  jazzcashNumber: string;
  jazzcashTitle: string;
  productCount: number;
  orderCount: number;
  earnings: number;
  joinedAt: number;
}
/** Admin: every seller with product/order/earnings analytics. */
export async function adminGetSellers(): Promise<SellerSummary[]> {
  return (await send("/api/admin/sellers", "GET")).sellers as SellerSummary[];
}

// ─── Sales analytics ──────────────────────────────────────────────────────────
export interface DailySales { day: string; orders: number; sales: number }
export interface SalesAnalytics {
  joinedAt: number | null;
  daily: DailySales[];
  totals: { ordersPlaced: number; orders: number; sales: number };
  week: { orders: number; sales: number };
  month: { orders: number; sales: number };
  since: { from: string; ordersPlaced: number; orders: number; sales: number } | null;
}
export interface SellerDetail {
  seller: SellerSummary & { joinedAt: number };
  analytics: SalesAnalytics;
}

/** A seller's own sales analytics (week / month by date, in Pakistan time). */
export async function sellerGetAnalytics(): Promise<SalesAnalytics> {
  return (await send("/api/seller/analytics", "GET")) as SalesAnalytics;
}

/** Admin: one seller's profile + sales analytics, optionally since a date. */
export async function adminGetSellerDetail(id: number, from?: string): Promise<SellerDetail> {
  const q = from ? `?id=${id}&from=${encodeURIComponent(from)}` : `?id=${id}`;
  return (await send(`/api/admin/sellers${q}`, "GET")) as SellerDetail;
}

/** Admin: permanently delete a seller and all of their data. */
export async function adminDeleteSeller(id: number): Promise<void> {
  await send("/api/admin/sellers", "DELETE", { id });
}
