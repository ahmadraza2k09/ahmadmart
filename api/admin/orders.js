// /api/admin/orders — admin lists every order (GET) and updates status (PATCH).
// Admin "approve" sets "Payment Received" (JazzCash) or "Confirmed (COD)" (COD).
import { getSql, requireAdmin, rowToOrder, readJsonBody } from "../_db.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  try {
    const sql = getSql();

    if (req.method === "GET") {
      const rows = await sql`select * from orders order by created_at desc`;
      res.status(200).json({ orders: rows.map(rowToOrder) });
      return;
    }

    if (req.method === "PATCH" || req.method === "PUT") {
      const { id, status } = await readJsonBody(req);
      if (!id || !status) { res.status(400).json({ error: "Missing order id or status." }); return; }
      const rows = await sql`update orders set status = ${status}, updated_at = now() where id = ${id} returning *`;
      if (!rows.length) { res.status(404).json({ error: "Order not found." }); return; }
      res.status(200).json({ order: rowToOrder(rows[0]) });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
