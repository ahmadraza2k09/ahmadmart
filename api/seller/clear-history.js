// /api/seller/clear-history — a seller clears their Delivered-order history after
// downloading it as a PDF (done client-side, before calling this).
// POST { resetEarnings: boolean }:
//   - Always archives every currently-visible Delivered order for this seller, so
//     they drop out of the Past Orders list (the row itself is kept, never deleted).
//   - If resetEarnings is true, also stamps the seller's earnings_reset_at to now,
//     so every earnings figure (dashboard totals, admin's seller earnings) starts
//     counting from zero going forward. Lifetime "orders placed" is unaffected.
import { getSql, getAuthUser, readJsonBody, ensureOrderHistoryColumns } from "../_db.js";

export default async function handler(req, res) {
  const auth = getAuthUser(req);
  if (!auth || (auth.role !== "seller" && auth.role !== "admin")) {
    res.status(401).json({ error: "Seller login required." });
    return;
  }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  try {
    const sql = getSql();
    await ensureOrderHistoryColumns(sql);
    const { resetEarnings } = await readJsonBody(req);

    const archived = await sql`
      update orders set archived = true, updated_at = now()
      where seller_id = ${auth.id} and status = 'Delivered' and archived = false
      returning id`;

    if (resetEarnings) {
      await sql`update users set earnings_reset_at = now(), updated_at = now() where id = ${auth.id}`;
    }

    res.status(200).json({ ok: true, archived: archived.length });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
