// GET /api/products — public list of all products for the storefront.
import { getSql, rowToProduct, ensureAccountTypeColumn } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const sql = getSql();
    const query = () => sql`
      select p.*,
             u.store_name      as seller_store,
             u.whatsapp        as seller_whatsapp,
             u.city            as seller_city,
             u.jazzcash_number as seller_jazzcash_number,
             u.jazzcash_title  as seller_jazzcash_title,
             u.account_type    as seller_account_type
      from products p
      left join users u on u.id = p.seller_id
      order by p.id`;
    let rows;
    try {
      rows = await query();
    } catch {
      // The seller "city"/"account_type" columns may not exist yet (created lazily
      // on first seller signup / store edit). Ensure them once, then retry — so the
      // storefront never breaks just because no seller has set them yet.
      await sql`alter table users add column if not exists city text`;
      await ensureAccountTypeColumn(sql);
      rows = await query();
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ products: rows.map(rowToProduct) });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
