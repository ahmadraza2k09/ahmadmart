// Frontend client for the Neon-backed product API (Vercel serverless functions).
// Admin writes are authorized by the logged-in admin's Bearer token (the user
// must have role "admin"). All calls degrade gracefully when the API is
// unreachable (e.g. local `vite` dev), so the storefront still works.
import type { Product } from "./types";
import { getToken } from "./auth";

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data;
}

/** Load the live catalog from the database. Throws if the API is unavailable.
 *  Normal loads come from the CDN edge cache (fast); pass fresh=true after a
 *  write so the unique query param bypasses the cache and the change shows
 *  immediately. */
export async function fetchProducts(fresh = false): Promise<Product[]> {
  const url = fresh ? `/api/products?fresh=${Date.now()}` : "/api/products";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
  const data = (await res.json()) as { products: Product[] };
  return data.products;
}

export async function createProduct(p: Partial<Product>): Promise<Product> {
  return (await send("/api/admin/products", "POST", p)).product;
}
export async function updateProduct(p: Partial<Product>): Promise<Product> {
  return (await send("/api/admin/products", "PUT", p)).product;
}
export async function deleteProduct(id: number): Promise<void> {
  await send("/api/admin/products", "DELETE", { id });
}

/** Admin: feature / un-feature a product so it is prioritised across the store. */
export async function setProductFeatured(id: number, featured: boolean): Promise<Product> {
  return (await send("/api/admin/products", "PATCH", { id, featured })).product;
}

/** Admin: rename a category or sub-category across EVERY product using it —
 *  e.g. "Fashion&ladies clothing" → "Ladies Clothing" fixes all listings at once. */
export async function renameCategory(type: "category" | "subcategory", from: string, to: string): Promise<number> {
  return (await send("/api/admin/categories", "PATCH", { type, from, to })).updated as number;
}

/** Admin: delete a category or sub-category entirely — PERMANENTLY deletes every
 *  product in it, sellers' products included. Returns how many were deleted. */
export async function deleteCategory(type: "category" | "subcategory", name: string): Promise<number> {
  return (await send("/api/admin/categories", "DELETE", { type, name })).deleted as number;
}

export interface Analytics {
  totals: {
    total: number; in_stock: number; out_of_stock: number; services: number;
    discounted: number; inventory_value: number; avg_price: number;
  };
  byCategory: { category: string; count: number; value: number }[];
  bySubcategory: { subcategory: string; count: number }[];
}
export async function fetchAnalytics(): Promise<Analytics> {
  return (await send("/api/admin/analytics", "GET")) as Analytics;
}

export async function seedProducts(products: Product[], force = false): Promise<{ seeded: number; skipped?: boolean; message?: string }> {
  return (await send("/api/admin/seed", "POST", { products, force })) as { seeded: number };
}

/** Public: every category that has an admin-uploaded photo, as lazy image URLs.
 *  Categories with no override just aren't in the map — callers fall back to
 *  a product photo from that category. */
export async function fetchCategoryImages(): Promise<Record<string, string>> {
  const res = await fetch("/api/category-image", { cache: "no-store" });
  if (!res.ok) return {};
  const data = (await res.json()) as { images: Record<string, string> };
  return data.images || {};
}

/** Admin: upload/replace the photo shown for a category on the homepage's
 *  "Shop by Category" strip. */
export async function setCategoryImage(category: string, imageDataUrl: string): Promise<void> {
  await send(`/api/category-image?cat=${encodeURIComponent(category)}`, "PUT", { image: imageDataUrl });
}

/** Admin: remove a category's uploaded photo (reverts to the product-photo fallback). */
export async function deleteCategoryImage(category: string): Promise<void> {
  await send(`/api/category-image?cat=${encodeURIComponent(category)}`, "DELETE");
}
