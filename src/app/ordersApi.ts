// Frontend client for DB-backed orders (Vercel serverless functions + Neon).
import type { Order, OrderStatus } from "./orderStore";
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
  if (res.status === 404) throw new Error("Order service is unavailable. The app must be deployed with the database connected.");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data;
}

/** Create an order for the signed-in user. */
export async function createOrder(o: Order): Promise<Order> {
  return (await send("/api/orders", "POST", o)).order as Order;
}
/** The signed-in user's own orders, newest first. */
export async function getMyOrders(): Promise<Order[]> {
  return (await send("/api/orders", "GET")).orders as Order[];
}
/** Remove an order from the signed-in buyer's own history (it still exists for
 *  the seller/admin and in earnings — this only affects the buyer's own view). */
export async function deleteMyOrder(id: string): Promise<void> {
  await send("/api/orders", "DELETE", { id });
}
/** A seller's own orders, newest first. */
export async function sellerGetOrders(): Promise<Order[]> {
  return (await send("/api/seller/orders", "GET")).orders as Order[];
}
/** Seller: change the status of one of their own orders. */
export async function sellerUpdateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  return (await send("/api/seller/orders", "PATCH", { id, status })).order as Order;
}
/** Seller: archive all currently-visible Delivered orders (call after downloading
 *  the history PDF). Optionally also reset all-time earnings back to zero. */
export async function sellerClearHistory(resetEarnings: boolean): Promise<{ archived: number }> {
  return await send("/api/seller/clear-history", "POST", { resetEarnings }) as { archived: number };
}
