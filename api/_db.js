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
    accountNumber: row.jazzcash_number ?? undefined,
    accountTitle: row.jazzcash_title ?? undefined,
    accountType: row.account_type || "JazzCash",
    paymentMethods: row.payment_methods || "both",
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
// Seller-uploaded photos live in the DB as base64 data URLs; sending those
// inline made the catalog JSON megabytes big, so they're rewritten here to
// tiny /api/product-image URLs that load lazily and cache hard at the CDN
// (v= is the row's updated_at, so an edited photo gets a fresh URL).
export function rowToProduct(r) {
  const ver = r.updated_at ? new Date(r.updated_at).getTime() : 0;
  const lazy = (u, i) =>
    typeof u === "string" && u.startsWith("data:")
      ? `/api/product-image?id=${r.id}&i=${i}&v=${ver}`
      : u;
  return {
    id: r.id,
    name: r.name,
    price: r.price,
    originalPrice: r.original_price ?? undefined,
    priceNote: r.price_note ?? undefined,
    category: r.category,
    subcategory: r.subcategory,
    image: lazy(r.image, -1),
    images: (r.images || []).map(lazy),
    rating: r.rating ?? 0,
    reviews: r.reviews ?? 0,
    sold: r.sold ?? 0,
    badge: r.badge ?? undefined,
    featured: r.featured ?? false,
    deliveryCharge: r.delivery_charge ?? null,
    inStock: r.in_stock,
    isService: r.is_service || undefined,
    description: r.description || "",
    specs: r.specs || {},
    sizes: r.sizes || [],
    colors: r.colors || [],
    sellerId: r.seller_id ?? undefined,
    sellerStore: r.seller_store ?? undefined,
    sellerCity: r.seller_city ?? undefined,
    sellerWhatsapp: r.seller_whatsapp ?? undefined,
    sellerAccountNumber: r.seller_jazzcash_number ?? undefined,
    sellerAccountTitle: r.seller_jazzcash_title ?? undefined,
    sellerAccountType: r.seller_account_type || "JazzCash",
    sellerPaymentMethods: r.seller_payment_methods || "both",
  };
}

// ─── Reading products without moving the photos ───────────────────────────────
// The image/images columns hold base64 data URLs — often several hundred KB
// each, up to six per product. rowToProduct never passes those to the browser
// (it rewrites them to /api/product-image URLs), but a `select *` still drags
// every one of them out of Neon on its way here. That read was by far the
// biggest consumer of the project's network-transfer allowance: one catalog
// fetch moved the entire photo library, and the storefront refetches whenever
// the edge cache expires.
//
// So Postgres now builds the /api/product-image URL itself and returns that
// instead of the photo. A data-URL photo only ever crosses the wire when the
// browser asks for that single image. Everything downstream is unchanged —
// rowToProduct's `lazy()` passes a non-data string through untouched, so it
// produces the exact same JSON either way, and callers that legitimately need
// the raw photo (resolveInternalImages) still read the columns directly.
//
// `ord - 1` converts with-ordinality's 1-based counter to the 0-based index
// that /api/product-image?i= expects, and the jsonb_typeof guard keeps a
// malformed images value from failing the whole storefront query.
const PRODUCT_IMAGE_COLUMNS = `
      case when p.image like 'data:%'
           then '/api/product-image?id=' || p.id || '&i=-1&v=' || v.ver
           else p.image end as image,
      coalesce((
        select jsonb_agg(to_jsonb(
                 case when e like 'data:%'
                      then '/api/product-image?id=' || p.id || '&i=' || (ord - 1) || '&v=' || v.ver
                      else e end) order by ord)
        from jsonb_array_elements_text(
               case when jsonb_typeof(p.images) = 'array' then p.images else '[]'::jsonb end
             ) with ordinality as t(e, ord)
      ), '[]'::jsonb) as images`;

// Every non-photo column rowToProduct reads. Listed explicitly because `p.*`
// would pull the photos back in.
const PRODUCT_SCALAR_COLUMNS = `
      p.id, p.name, p.price, p.original_price, p.price_note, p.category, p.subcategory,
      p.rating, p.reviews, p.badge, p.featured, p.in_stock, p.is_service, p.description,
      p.specs, p.sizes, p.colors, p.delivery_charge, p.seller_id, p.created_at, p.updated_at`;

// `v.ver` — the row's updated_at in epoch milliseconds, matching the value
// rowToProduct derives in JS, so a photo's URL changes the moment it is edited
// and the immutable CDN entry for the old one is never reused.
const PRODUCT_VERSION_JOIN = `
      cross join lateral (select floor(extract(epoch from p.updated_at) * 1000)::bigint as ver) v`;

// Naming columns explicitly means a column that predates a migration is now a
// hard error rather than something `p.*` quietly omitted — so callers ensure
// the late-added ones before falling back to a retry.
export async function ensureProductColumns(sql) {
  await sql`alter table products add column if not exists delivery_charge integer`;
  await sql`alter table products add column if not exists featured boolean not null default false`;
  await sql`alter table products add column if not exists sizes  jsonb not null default '[]'::jsonb`;
  await sql`alter table products add column if not exists colors jsonb not null default '[]'::jsonb`;
  await sql`alter table products add column if not exists price_note text`;
  await sql`alter table products add column if not exists seller_id integer references users(id) on delete set null`;
}

// The public storefront catalog. "sold" is computed once across all orders (not
// as a correlated subquery, which would re-unnest every order for every product)
// then joined in, so this stays a single cheap pass however many products exist.
export function listStoreProducts(sql) {
  return sql(`
    select
      ${PRODUCT_SCALAR_COLUMNS},
      ${PRODUCT_IMAGE_COLUMNS},
      u.store_name      as seller_store,
      u.whatsapp        as seller_whatsapp,
      u.city            as seller_city,
      u.jazzcash_number as seller_jazzcash_number,
      u.jazzcash_title  as seller_jazzcash_title,
      u.account_type    as seller_account_type,
      u.payment_methods as seller_payment_methods,
      coalesce(sold.qty, 0)::int as sold
    from products p
    ${PRODUCT_VERSION_JOIN}
    left join users u on u.id = p.seller_id
    left join (
      select (item->>'id')::int as product_id, sum((item->>'qty')::int) as qty
      from orders o, jsonb_array_elements(o.items) as item
      where o.status in ('Payment Received', 'Confirmed (COD)', 'Shipped', 'Delivered')
      group by 1
    ) sold on sold.product_id = p.id
    order by p.id`);
}

// One seller's own products, for their dashboard.
export function listSellerProducts(sql, sellerId) {
  return sql(`
    select ${PRODUCT_SCALAR_COLUMNS}, ${PRODUCT_IMAGE_COLUMNS}
    from products p ${PRODUCT_VERSION_JOIN}
    where p.seller_id = $1
    order by p.id desc`, [sellerId]);
}

// A single product, read back after a write. Writes used to `returning *`,
// which echoed every uploaded photo straight back to the client that had just
// sent it — this costs one extra (tiny) round trip instead.
export async function getProductRow(sql, id) {
  const rows = await sql(`
    select ${PRODUCT_SCALAR_COLUMNS}, ${PRODUCT_IMAGE_COLUMNS}
    from products p ${PRODUCT_VERSION_JOIN}
    where p.id = $1`, [id]);
  return rows[0] ?? null;
}

// When a product is edited, the form round-trips the /api/product-image URLs
// that rowToProduct generated (the seller sees those instead of the raw base64
// originals). Saving them as-is would overwrite the stored photos with
// self-referential URLs and break them — so before any update, swap each
// internal URL back to the original stored value it points at.
export async function resolveInternalImages(sql, productId, image, images) {
  const isInternal = (s) => typeof s === "string" && s.startsWith("/api/product-image");
  const list = images ?? [];
  if (!isInternal(image) && !list.some(isInternal)) return { image, images: list };
  const [row] = await sql`select image, images from products where id = ${productId}`;
  const stored = row?.images || [];
  const fix = (s) => {
    if (!isInternal(s)) return s;
    const m = /[?&]i=(-?\d+)/.exec(s);
    const i = m ? parseInt(m[1], 10) : -1;
    const orig = i >= 0 ? (stored[i] ?? row?.image) : row?.image;
    // Never resolve to another internal URL (would self-reference at serve time).
    return orig && !isInternal(orig) ? orig : "";
  };
  return { image: fix(image), images: list.map(fix).filter(Boolean) };
}

// Self-healing schema for the columns the order-history/earnings-reset feature
// depends on — run before any query that touches them, so no manual migration
// step is required (mirrors the pattern already used for e.g. delivery_charge).
export async function ensureOrderHistoryColumns(sql) {
  await sql`alter table orders add column if not exists archived boolean not null default false`;
  await sql`alter table users add column if not exists earnings_reset_at timestamptz`;
  // Lets a buyer remove an order from their own "My Orders" history at any time —
  // independent of the seller's archived flag, so hiding it from the buyer never
  // hides it from the seller (who still needs to fulfil it) or vice versa.
  await sql`alter table orders add column if not exists buyer_hidden boolean not null default false`;
}

// A seller (or the official store) can accept JazzCash, SadaPay, NayaPay, or
// Easypaisa — this column records which one the jazzcash_number/jazzcash_title
// columns (kept as-is to avoid a data migration) actually belong to. Existing
// sellers default to 'JazzCash', which matches what those columns already held.
// payment_methods records WHICH checkout options the seller offers:
// 'both' (default) | 'online' (wallet transfer only) | 'cod' (cash on delivery only).
export async function ensureAccountTypeColumn(sql) {
  await sql`alter table users add column if not exists account_type text not null default 'JazzCash'`;
  await sql`alter table users add column if not exists payment_methods text not null default 'both'`;
}

// Sales analytics for one seller, computed entirely in Pakistan time
// (Asia/Karachi) so "today", "this week" and "this month" line up with the
// seller's real calendar days. Earnings count only approved orders.
//   joinedAt  — when the seller joined (ms)
//   daily     — last 30 Pakistan-days, each { day:'YYYY-MM-DD', orders, sales }
//   week/month — totals over the last 7 / 30 days
//   totals    — all-time { ordersPlaced (any status, excluding cleared/archived), orders (approved), sales }
//   since     — when fromDate is given: totals on/after that Pakistan date
export async function sellerAnalytics(sql, sellerId, fromDate = null) {
  await ensureOrderHistoryColumns(sql);
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
      count(*) filter (where archived = false)::int as orders_placed,
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
      select count(*) filter (where archived = false)::int as orders_placed,
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
