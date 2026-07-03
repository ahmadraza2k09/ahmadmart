// Shared helpers for the Vercel serverless functions.
// These secrets live ONLY in environment variables (Vercel → Project → Settings →
// Environment Variables):
//   DATABASE_URL    = your Neon connection string (sslmode=require)
//   JWT_SECRET      = a long random string used to sign login tokens
//   ADMIN_EMAIL     = admin login email   (default: ahmadmart@mail.com)
//   ADMIN_PASSWORD  = admin login password (default: ahmadmart@123 — change it!)
import { neon } from "@neondatabase/serverless";
import jwt from "jsonwebtoken";

let _sql;
export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it in Vercel → Environment Variables.");
  }
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

// JWT — set JWT_SECRET in Vercel for production. The fallback only keeps local
// development working; tokens signed with it are not secure.
const JWT_SECRET = process.env.JWT_SECRET || "ahmadmart-dev-secret-change-me";

export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
}

// Decode the Bearer token on a request. Returns { id, email, role } or null.
export function getAuthUser(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const m = /^Bearer (.+)$/.exec(header);
  if (!m) return null;
  try {
    return jwt.verify(m[1], JWT_SECRET);
  } catch {
    return null;
  }
}

// Strip the password hash before sending a user to the client.
export function userPublic(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    storeName: row.store_name ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    city: row.city ?? undefined,
    jazzcashNumber: row.jazzcash_number ?? undefined,
    jazzcashTitle: row.jazzcash_title ?? undefined,
  };
}

// Gate every admin write: requires a valid Bearer token whose role is "admin".
export function requireAdmin(req, res) {
  const u = getAuthUser(req);
  if (!u || u.role !== "admin") {
    res.status(401).json({ error: "Unauthorized — admin login required." });
    return false;
  }
  return true;
}

// Map an order row to the Order shape the frontend uses.
export function rowToOrder(r) {
  return {
    id: r.id,
    userId: r.user_id ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
    name: r.name,
    phone: r.phone,
    email: r.email || "",
    address: r.address,
    notes: r.notes || undefined,
    items: r.items || [],
    subtotal: r.subtotal,
    shipping: r.shipping,
    discount: r.discount || undefined,
    promoCode: r.promo_code || undefined,
    total: r.total,
    paymentMethod: r.payment_method,
    status: r.status,
    sellerId: r.seller_id ?? undefined,
    sellerStore: r.seller_store ?? undefined,
    archived: r.archived ?? false,
  };
}

// Map a DB row (snake_case) to the Product shape the frontend uses (camelCase).
// When the query joins the seller (users), the seller_* aliases are included so
// the storefront can show "Sold by …" and route checkout to that seller.
export function rowToProduct(r) {
  return {
    id: r.id,
    name: r.name,
    price: r.price,
    originalPrice: r.original_price ?? undefined,
    priceNote: r.price_note ?? undefined,
    category: r.category,
    subcategory: r.subcategory,
    image: r.image,
    images: r.images || [],
    rating: r.rating ?? 0,
    reviews: r.reviews ?? 0,
    badge: r.badge ?? undefined,
    featured: r.featured ?? false,
    deliveryCharge: r.delivery_charge ?? null,
    inStock: r.in_stock,
    isService: r.is_service || undefined,
    description: r.description || "",
    specs: r.specs || {},
    sellerId: r.seller_id ?? undefined,
    sellerStore: r.seller_store ?? undefined,
    sellerCity: r.seller_city ?? undefined,
    sellerWhatsapp: r.seller_whatsapp ?? undefined,
    sellerJazzcashNumber: r.seller_jazzcash_number ?? undefined,
    sellerJazzcashTitle: r.seller_jazzcash_title ?? undefined,
  };
}

// Sales analytics for one seller, computed entirely in Pakistan time
// (Asia/Karachi) so "today", "this week" and "this month" line up with the
// seller's real calendar days. Earnings count only approved orders.
//   joinedAt  — when the seller joined (ms)
//   daily     — last 30 Pakistan-days, each { day:'YYYY-MM-DD', orders, sales }
//   week/month — totals over the last 7 / 30 days
//   totals    — all-time { ordersPlaced (any status), orders (approved), sales }
//   since     — when fromDate is given: totals on/after that Pakistan date
export async function sellerAnalytics(sql, sellerId, fromDate = null) {
  const urows = await sql`select created_at, earnings_reset_at from users where id = ${sellerId}`;
  const joinedAt = urows.length ? new Date(urows[0].created_at).getTime() : null;
  // A seller can reset their earnings when clearing delivered-order history — from
  // that point on, all earnings figures (but not the lifetime "orders placed"
  // count) only count orders placed after the reset.
  const resetAt = urows.length ? urows[0].earnings_reset_at : null;

  const daily = await sql`
    select to_char((created_at at time zone 'Asia/Karachi')::date, 'YYYY-MM-DD') as day,
           count(*)::int as orders,
           coalesce(sum(total), 0)::int as sales
    from orders
    where seller_id = ${sellerId}
      and status in ('Payment Received', 'Confirmed (COD)', 'Shipped', 'Delivered')
      and created_at >= coalesce(${resetAt}, '-infinity'::timestamptz)
      and (created_at at time zone 'Asia/Karachi')::date >= (now() at time zone 'Asia/Karachi')::date - 29
    group by 1 order by 1 desc`;

  const [tot] = await sql`
    select
      count(*)::int as orders_placed,
      count(*) filter (where status in ('Payment Received', 'Confirmed (COD)', 'Shipped', 'Delivered')
                          and created_at >= coalesce(${resetAt}, '-infinity'::timestamptz))::int as orders,
      coalesce(sum(total) filter (where status in ('Payment Received', 'Confirmed (COD)', 'Shipped', 'Delivered')
                                     and created_at >= coalesce(${resetAt}, '-infinity'::timestamptz)), 0)::int as sales
    from orders where seller_id = ${sellerId}`;

  const [wk] = await sql`
    select count(*)::int as orders, coalesce(sum(total), 0)::int as sales
    from orders where seller_id = ${sellerId}
      and status in ('Payment Received', 'Confirmed (COD)', 'Shipped', 'Delivered')
      and created_at >= coalesce(${resetAt}, '-infinity'::timestamptz)
      and (created_at at time zone 'Asia/Karachi')::date >= (now() at time zone 'Asia/Karachi')::date - 6`;

  const [mo] = await sql`
    select count(*)::int as orders, coalesce(sum(total), 0)::int as sales
    from orders where seller_id = ${sellerId}
      and status in ('Payment Received', 'Confirmed (COD)', 'Shipped', 'Delivered')
      and created_at >= coalesce(${resetAt}, '-infinity'::timestamptz)
      and (created_at at time zone 'Asia/Karachi')::date >= (now() at time zone 'Asia/Karachi')::date - 29`;

  let since = null;
  if (fromDate) {
    const [s] = await sql`
      select count(*)::int as orders_placed,
             count(*) filter (where status in ('Payment Received', 'Confirmed (COD)', 'Shipped', 'Delivered')
                                 and created_at >= coalesce(${resetAt}, '-infinity'::timestamptz))::int as orders,
             coalesce(sum(total) filter (where status in ('Payment Received', 'Confirmed (COD)', 'Shipped', 'Delivered')
                                            and created_at >= coalesce(${resetAt}, '-infinity'::timestamptz)), 0)::int as sales
      from orders where seller_id = ${sellerId}
        and (created_at at time zone 'Asia/Karachi')::date >= ${fromDate}::date`;
    since = { from: fromDate, ordersPlaced: s.orders_placed, orders: s.orders, sales: s.sales };
  }

  return {
    joinedAt,
    daily: daily.map(d => ({ day: d.day, orders: d.orders, sales: d.sales })),
    totals: { ordersPlaced: tot.orders_placed, orders: tot.orders, sales: tot.sales },
    week: { orders: wk.orders, sales: wk.sales },
    month: { orders: mo.orders, sales: mo.sales },
    since,
  };
}

// Permanently delete a seller and every record tied to them: their orders,
// products (which cascades messages on those products), any remaining messages,
// then the user row. Refuses to delete an admin account.
export async function deleteSellerCascade(sql, sellerId) {
  const [u] = await sql`select role from users where id = ${sellerId}`;
  if (!u) return { ok: false, code: 404, error: "Seller not found." };
  if (u.role === "admin") return { ok: false, code: 403, error: "An admin account cannot be deleted here." };
  await sql`delete from orders where seller_id = ${sellerId}`;
  await sql`delete from products where seller_id = ${sellerId}`;
  await sql`delete from messages where buyer_id = ${sellerId} or seller_id = ${sellerId} or sender_id = ${sellerId}`;
  await sql`delete from users where id = ${sellerId}`;
  return { ok: true };
}

// Vercel parses JSON bodies into req.body automatically, but fall back to
// reading the stream just in case the content-type is missing.
export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}
