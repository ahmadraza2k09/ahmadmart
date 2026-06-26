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
/** Admin: every order. */
export async function adminGetOrders(): Promise<Order[]> {
  return (await send("/api/admin/orders", "GET")).orders as Order[];
}
/** Admin: change an order's status. */
export async function adminUpdateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  return (await send("/api/admin/orders", "PATCH", { id, status })).order as Order;
}
