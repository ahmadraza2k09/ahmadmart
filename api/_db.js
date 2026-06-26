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
  return { id: row.id, name: row.name, email: row.email, role: row.role };
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
  };
}

// Map a DB row (snake_case) to the Product shape the frontend uses (camelCase).
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
    inStock: r.in_stock,
    isService: r.is_service || undefined,
    description: r.description || "",
    specs: r.specs || {},
  };
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
