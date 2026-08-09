// GET /api/products — public list of all products for the storefront.
import { getSql, rowToProduct, ensureAccountTypeColumn, ensureProductColumns, listStoreProducts } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const sql = getSql();
    let rows;
    try {
      rows = await listStoreProducts(sql);
    } catch {
      // Columns added by a later migration (seller city/account_type, product
      // featured/sizes/colors) may not exist yet on a database that predates
      // them. Ensure them once, then retry — so the storefront never breaks
      // just because a migration hasn't been run.
      await sql`alter table users add column if not exists city text`;
      await ensureAccountTypeColumn(sql);
      await ensureProductColumns(sql);
      rows = await listStoreProducts(sql);
    }
    // Cached at Vercel's edge so most visitors get the catalog from the CDN in
    // ~50ms instead of waiting on a serverless cold start + DB query. The long
    // stale-while-revalidate window means a visitor is served instantly from
    // cache even after the 60s freshness window closes, while the refresh
    // happens in the background — nobody ever waits on the database. Writers
    // (seller/admin saves) bypass this with a ?fresh=<ts> query param, which is
    // its own cache key, so they always see their change immediately.
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=86400");
    res.status(200).json({ products: rows.map(rowToProduct) });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
