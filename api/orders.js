// /api/orders — signed-in users place orders (POST) and list their own (GET).
// New orders are created as "Pending Approval"; the admin moves them forward.
import { getSql, getAuthUser, rowToOrder, readJsonBody } from "./_db.js";

export default async function handler(req, res) {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Please sign in to place or view orders." }); return; }
  try {
    const sql = getSql();

    if (req.method === "GET") {
      const rows = await sql`
        select o.*, su.store_name as seller_store
        from orders o left join users su on su.id = o.seller_id
        where o.user_id = ${auth.id} order by o.created_at desc`;
      res.status(200).json({ orders: rows.map(rowToOrder) });
      return;
    }

    if (req.method === "POST") {
      const o = await readJsonBody(req);
      if (!o.id || !o.name || !o.phone || !o.address || !Array.isArray(o.items) || !o.items.length) {
        res.status(400).json({ error: "Missing required order fields." });
        return;
      }
      const rows = await sql`
        insert into orders
          (id, user_id, seller_id, name, phone, email, address, notes, items, subtotal, shipping, discount, promo_code, total, payment_method, status)
        values
          (${o.id}, ${auth.id}, ${o.sellerId ?? null}, ${o.name}, ${o.phone}, ${o.email ?? null}, ${o.address}, ${o.notes ?? null},
           ${JSON.stringify(o.items)}::jsonb, ${o.subtotal ?? 0}, ${o.shipping ?? 0}, ${o.discount ?? 0},
           ${o.promoCode ?? null}, ${o.total ?? 0}, ${o.paymentMethod ?? "JazzCash (Manual)"}, 'Pending Approval')
        on conflict (id) do nothing
        returning *`;
      if (!rows.length) { res.status(409).json({ error: "Order id already exists. Please try again." }); return; }
      res.status(201).json({ order: rowToOrder(rows[0]) });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
