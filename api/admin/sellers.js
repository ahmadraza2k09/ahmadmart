// GET /api/admin/sellers — admin view of every seller with their analytics:
// product count, order count, and earnings (sum of approved/fulfilled orders).
import { getSql, requireAdmin } from "../_db.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
  try {
    const sql = getSql();
    const rows = await sql`
      select
        u.id, u.name, u.email, u.store_name, u.whatsapp, u.jazzcash_number, u.jazzcash_title, u.created_at,
        (select count(*)::int from products p where p.seller_id = u.id) as product_count,
        (select count(*)::int from orders o where o.seller_id = u.id) as order_count,
        (select coalesce(sum(o.total), 0)::int from orders o
           where o.seller_id = u.id
             and o.status in ('Payment Received', 'Confirmed (COD)', 'Shipped', 'Delivered')) as earnings
      from users u
      where u.role = 'seller'
      order by u.created_at desc`;
    const sellers = rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      storeName: r.store_name ?? "",
      whatsapp: r.whatsapp ?? "",
      jazzcashNumber: r.jazzcash_number ?? "",
      jazzcashTitle: r.jazzcash_title ?? "",
      productCount: r.product_count,
      orderCount: r.order_count,
      earnings: r.earnings,
    }));
    res.status(200).json({ sellers });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
