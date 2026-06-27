// /api/seller/analytics — a seller's own sales analytics (week / month by date),
// computed in Pakistan time. Requires a Bearer token with role "seller" (admins
// may also call it, though admins have no seller orders of their own).
import { getSql, getAuthUser, sellerAnalytics } from "../_db.js";

export default async function handler(req, res) {
  const auth = getAuthUser(req);
  if (!auth || (auth.role !== "seller" && auth.role !== "admin")) {
    res.status(401).json({ error: "Seller login required." });
    return;
  }
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
  try {
    const sql = getSql();
    const data = await sellerAnalytics(sql, auth.id);
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
