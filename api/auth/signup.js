// POST /api/auth/signup — create a buyer or seller account.
// Body: { name, email, password, role }. Returns { token, user }.
import bcrypt from "bcryptjs";
import { getSql, signToken, userPublic, readJsonBody } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  try {
    const { name, email, password, role, storeName, whatsapp, jazzcashNumber, jazzcashTitle } = await readJsonBody(req);
    if (!name || !email || !password) { res.status(400).json({ error: "Name, email and password are required." }); return; }
    if (String(password).length < 6) { res.status(400).json({ error: "Password must be at least 6 characters." }); return; }
    // Only buyer/seller can be chosen at signup — admin is never self-assigned.
    const safeRole = role === "seller" ? "seller" : "buyer";
    if (safeRole === "seller") {
      if (!storeName || !String(storeName).trim()) { res.status(400).json({ error: "Store name is required for sellers." }); return; }
      if (!whatsapp || !String(whatsapp).trim()) { res.status(400).json({ error: "WhatsApp number is required for sellers." }); return; }
    }

    const sql = getSql();
    const existing = await sql`select id from users where lower(email) = lower(${email})`;
    if (existing.length) { res.status(409).json({ error: "An account with this email already exists." }); return; }

    const hash = await bcrypt.hash(String(password), 10);
    const rows = await sql`
      insert into users (name, email, password_hash, role, store_name, whatsapp, jazzcash_number, jazzcash_title)
      values (${name}, ${String(email).toLowerCase()}, ${hash}, ${safeRole},
              ${safeRole === "seller" ? storeName : null}, ${safeRole === "seller" ? whatsapp : null},
              ${safeRole === "seller" ? (jazzcashNumber ?? null) : null}, ${safeRole === "seller" ? (jazzcashTitle ?? null) : null})
      returning *`;
    const user = userPublic(rows[0]);
    res.status(201).json({ token: signToken(user), user });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
