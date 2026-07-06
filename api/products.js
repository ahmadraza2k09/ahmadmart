// GET /api/products — public list of all products for the storefront.
import { getSql, rowToProduct, ensureAccountTypeColumn } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const sql = getSql();
    // "sold" is computed once across all orders (not per-product — a correlated
    // subquery here would re-scan and re-unnest every order for every single
    // product row) then joined in, so this stays a single cheap pass regardless
    // of how many products exist.
    const query = () => sql`
      select p.*,
             u.store_name      as seller_store,
             u.whatsapp        as seller_whatsapp,
             u.city            as seller_city,
             u.jazzcash_number as seller_jazzcash_number,
             u.jazzcash_title  as seller_jazzcash_title,
             u.account_type    as seller_account_type,
             coalesce(sold.qty, 0)::int as sold
      from products p
      left join users u on u.id = p.seller_id
      left join (
        select (item->>'id')::int as product_id, sum((item->>'qty')::int) as qty
        from orders o, jsonb_array_elements(o.items) as item
        where o.status in ('Payment Received', 'Confirmed (COD)', 'Shipped', 'Delivered')
        group by 1
      ) sold on sold.product_id = p.id
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
    // Cached at Vercel's edge for 30s (serving stale for up to 5 min while
    // revalidating in the background), so most visitors get the catalog from
    // the CDN in ~50ms instead of waiting on a serverless cold start + DB
    // query. Writers (seller/admin saves) bypass this with a ?fresh=<ts>
    // query param, which is its own cache key, so they always see their
    // change immediately.
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
    res.status(200).json({ products: rows.map(rowToProduct) });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
