// GET /api/products — public list of all products for the storefront.
import { getSql, rowToProduct } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const sql = getSql();
    const rows = await sql`
      select p.*,
             u.store_name      as seller_store,
             u.whatsapp        as seller_whatsapp,
             u.jazzcash_number as seller_jazzcash_number,
             u.jazzcash_title  as seller_jazzcash_title
      from products p
      left join users u on u.id = p.seller_id
      order by p.id`;
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ products: rows.map(rowToProduct) });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
