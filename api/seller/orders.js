// /api/seller/orders — a seller manages ONLY their own orders.
// GET (own list), PATCH (update status of an order they own).
// Requires a Bearer token with role "seller" (admins may also use it).
import { getSql, getAuthUser, rowToOrder, readJsonBody } from "../_db.js";

export default async function handler(req, res) {
  const auth = getAuthUser(req);
  if (!auth || (auth.role !== "seller" && auth.role !== "admin")) {
    res.status(401).json({ error: "Seller login required." });
    return;
  }
  try {
    const sql = getSql();

    if (req.method === "GET") {
      // Archived (cleared) delivered orders are excluded — once a seller downloads
      // and clears their history those orders no longer show up anywhere for them.
      const rows = await sql`select * from orders where seller_id = ${auth.id} and archived = false order by created_at desc`;
      res.status(200).json({ orders: rows.map(rowToOrder) });
      return;
    }

    if (req.method === "PATCH" || req.method === "PUT") {
      const { id, status } = await readJsonBody(req);
      if (!id || !status) { res.status(400).json({ error: "Missing order id or status." }); return; }
      const own = await sql`select seller_id from orders where id = ${id}`;
      if (!own.length) { res.status(404).json({ error: "Order not found." }); return; }
      if (auth.role !== "admin" && own[0].seller_id !== auth.id) {
        res.status(403).json({ error: "You can only manage your own orders." });
        return;
      }
      const rows = await sql`update orders set status = ${status}, updated_at = now() where id = ${id} returning *`;
      res.status(200).json({ order: rowToOrder(rows[0]) });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
