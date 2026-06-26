// Consolidated auth routes (one serverless function for all of /api/auth/*).
// Vercel dynamic route: req.query.action is "signup" | "login" | "me" | "role".
// Paths stay the same for the frontend: /api/auth/login, /api/auth/signup, etc.
import bcrypt from "bcryptjs";
import { getSql, getAuthUser, signToken, userPublic, readJsonBody } from "../_db.js";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "ahmadmart@mail.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ahmadmart@123";

export default async function handler(req, res) {
  const action = req.query.action;
  try {
    if (action === "signup") return await signup(req, res);
    if (action === "login") return await login(req, res);
    if (action === "me") return await me(req, res);
    if (action === "role") return await role(req, res);
    if (action === "store") return await store(req, res);
    res.status(404).json({ error: "Unknown auth action." });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}

async function signup(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  const { name, email, password, role, storeName, whatsapp, jazzcashNumber, jazzcashTitle } = await readJsonBody(req);
  if (!name || !email || !password) { res.status(400).json({ error: "Name, email and password are required." }); return; }
  if (String(password).length < 6) { res.status(400).json({ error: "Password must be at least 6 characters." }); return; }
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
}

async function login(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  const { email, password } = await readJsonBody(req);
  if (!email || !password) { res.status(400).json({ error: "Email and password are required." }); return; }
  const sql = getSql();
  const emailLc = String(email).toLowerCase();
  let rows = await sql`select * from users where lower(email) = ${emailLc}`;
  let row = rows[0];
  // First-time admin bootstrap.
  if (!row && emailLc === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const ins = await sql`
      insert into users (name, email, password_hash, role)
      values ('Administrator', ${ADMIN_EMAIL}, ${hash}, 'admin')
      on conflict (email) do update set role = 'admin'
      returning *`;
    row = ins[0];
  }
  if (!row) { res.status(401).json({ error: "Invalid email or password." }); return; }
  const ok = await bcrypt.compare(String(password), row.password_hash);
  if (!ok) { res.status(401).json({ error: "Invalid email or password." }); return; }
  const user = userPublic(row);
  res.status(200).json({ token: signToken(user), user });
}

async function me(req, res) {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }
  const sql = getSql();
  const rows = await sql`select * from users where id = ${auth.id}`;
  if (!rows.length) { res.status(401).json({ error: "User not found" }); return; }
  res.status(200).json({ user: userPublic(rows[0]) });
}

async function role(req, res) {
  if (req.method !== "POST" && req.method !== "PATCH") { res.status(405).json({ error: "Method not allowed" }); return; }
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { role: newRole } = await readJsonBody(req);
  if (newRole !== "buyer" && newRole !== "seller") { res.status(400).json({ error: "Role must be buyer or seller." }); return; }
  const sql = getSql();
  const current = await sql`select role from users where id = ${auth.id}`;
  if (!current.length) { res.status(401).json({ error: "User not found" }); return; }
  if (current[0].role === "admin") { res.status(403).json({ error: "The admin role cannot be changed here." }); return; }
  const rows = await sql`update users set role = ${newRole}, updated_at = now() where id = ${auth.id} returning *`;
  const user = userPublic(rows[0]);
  res.status(200).json({ token: signToken(user), user });
}

// Seller updates their own store details (name, WhatsApp, JazzCash).
async function store(req, res) {
  if (req.method !== "POST" && req.method !== "PATCH") { res.status(405).json({ error: "Method not allowed" }); return; }
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }
  if (auth.role !== "seller" && auth.role !== "admin") { res.status(403).json({ error: "Only sellers have a store." }); return; }
  const { storeName, whatsapp, jazzcashNumber, jazzcashTitle } = await readJsonBody(req);
  if (!storeName || !String(storeName).trim()) { res.status(400).json({ error: "Store name is required." }); return; }
  if (!whatsapp || !String(whatsapp).trim()) { res.status(400).json({ error: "WhatsApp number is required." }); return; }
  const sql = getSql();
  const rows = await sql`
    update users set store_name = ${storeName}, whatsapp = ${whatsapp},
      jazzcash_number = ${jazzcashNumber ?? null}, jazzcash_title = ${jazzcashTitle ?? null}, updated_at = now()
    where id = ${auth.id} returning *`;
  if (!rows.length) { res.status(404).json({ error: "User not found." }); return; }
  res.status(200).json({ user: userPublic(rows[0]) });
}
