// Consolidated admin routes (one serverless function for all of /api/admin/*).
// Vercel dynamic route: req.query.resource is "products" | "analytics" | "seed"
// | "sellers". Paths stay the same: /api/admin/products, etc.
// Note: admin has no orders endpoint — orders are managed entirely by the seller
// (or the buyer, for their own history); admin only sees aggregate counts and
// earnings per seller via the "sellers" resource below.
import { getSql, requireAdmin, rowToProduct, readJsonBody, sellerAnalytics, deleteSellerCascade, ensureOrderHistoryColumns } from "../_db.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  const resource = req.query.resource;
  try {
    if (resource === "products") return await products(req, res);
    if (resource === "analytics") return await analytics(req, res);
    if (resource === "seed") return await seed(req, res);
    if (resource === "sellers") return await sellers(req, res);
    res.status(404).json({ error: "Unknown admin resource." });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}

async function products(req, res) {
  const sql = getSql();
  if (req.method !== "GET") await sql`alter table products add column if not exists delivery_charge integer`;
  if (req.method === "POST") {
    const p = await readJsonBody(req);
    if (!p.name || p.price == null) { res.status(400).json({ error: "Name and price are required." }); return; }
    const rows = await sql`
      insert into products
        (name, price, original_price, price_note, category, subcategory, image, images,
         rating, reviews, badge, in_stock, is_service, description, specs, delivery_charge)
      values
        (${p.name}, ${p.price}, ${p.originalPrice ?? null}, ${p.priceNote ?? null},
         ${p.category ?? ""}, ${p.subcategory ?? ""}, ${p.image ?? ""},
         ${JSON.stringify(p.images ?? [])}::jsonb, ${p.rating ?? 0}, ${p.reviews ?? 0},
         ${p.badge ?? null}, ${p.inStock ?? true}, ${p.isService ?? false},
         ${p.description ?? ""}, ${JSON.stringify(p.specs ?? {})}::jsonb, ${p.deliveryCharge ?? null})
      returning *`;
    res.status(201).json({ product: rowToProduct(rows[0]) });
    return;
  }
  if (req.method === "PUT") {
    const p = await readJsonBody(req);
    if (!p.id) { res.status(400).json({ error: "Missing product id." }); return; }
    const rows = await sql`
      update products set
        name=${p.name}, price=${p.price}, original_price=${p.originalPrice ?? null},
        price_note=${p.priceNote ?? null}, category=${p.category ?? ""}, subcategory=${p.subcategory ?? ""},
        image=${p.image ?? ""}, images=${JSON.stringify(p.images ?? [])}::jsonb,
        rating=${p.rating ?? 0}, reviews=${p.reviews ?? 0}, badge=${p.badge ?? null},
        in_stock=${p.inStock ?? true}, is_service=${p.isService ?? false},
        description=${p.description ?? ""}, specs=${JSON.stringify(p.specs ?? {})}::jsonb,
        delivery_charge=${p.deliveryCharge ?? null}, updated_at=now()
      where id=${p.id}
      returning *`;
    if (!rows.length) { res.status(404).json({ error: "Product not found." }); return; }
    res.status(200).json({ product: rowToProduct(rows[0]) });
    return;
  }
  if (req.method === "DELETE") {
    const body = await readJsonBody(req);
    const id = body.id ?? req.query?.id;
    if (!id) { res.status(400).json({ error: "Missing product id." }); return; }
    await sql`delete from products where id=${id}`;
    res.status(200).json({ ok: true });
    return;
  }
  // Feature / un-feature any product (admin only). Featured products are
  // prioritised across the storefront. The column is ensured here so this works
  // even if the schema migration hasn't been run yet.
  if (req.method === "PATCH") {
    const body = await readJsonBody(req);
    if (!body.id) { res.status(400).json({ error: "Missing product id." }); return; }
    await sql`alter table products add column if not exists featured boolean not null default false`;
    const rows = await sql`update products set featured = ${!!body.featured}, updated_at = now() where id = ${body.id} returning *`;
    if (!rows.length) { res.status(404).json({ error: "Product not found." }); return; }
    res.status(200).json({ product: rowToProduct(rows[0]) });
    return;
  }
  res.status(405).json({ error: "Method not allowed" });
}

async function analytics(req, res) {
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
  const sql = getSql();
  const totalsRows = await sql`
    select
      count(*)::int                                            as total,
      (count(*) filter (where in_stock))::int                  as in_stock,
      (count(*) filter (where not in_stock))::int              as out_of_stock,
      (count(*) filter (where is_service))::int                as services,
      (count(*) filter (where original_price is not null
                               and original_price > price))::int as discounted,
      coalesce(sum(price), 0)::int                             as inventory_value,
      coalesce(round(avg(price))::int, 0)                      as avg_price
    from products`;
  const byCategory = await sql`
    select category, count(*)::int as count, coalesce(sum(price),0)::int as value
    from products group by category order by count desc`;
  const bySubcategory = await sql`
    select subcategory, count(*)::int as count
    from products group by subcategory order by count desc`;
  res.status(200).json({ totals: totalsRows[0] || {}, byCategory, bySubcategory });
}

async function seed(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  const sql = getSql();
  const body = await readJsonBody(req);
  const force = body.force === true;
  const items = Array.isArray(body.products) ? body.products : [];
  const [{ count }] = await sql`select count(*)::int as count from products`;
  if (count > 0 && !force) {
    res.status(200).json({ seeded: 0, skipped: true, message: "Products already exist. Pass force to replace." });
    return;
  }
  if (force) await sql`delete from products`;
  let seeded = 0;
  for (const p of items) {
    await sql`
      insert into products
        (id, name, price, original_price, price_note, category, subcategory, image, images,
         rating, reviews, badge, in_stock, is_service, description, specs)
      values
        (${p.id}, ${p.name}, ${p.price}, ${p.originalPrice ?? null}, ${p.priceNote ?? null},
         ${p.category ?? ""}, ${p.subcategory ?? ""}, ${p.image ?? ""},
         ${JSON.stringify(p.images ?? [])}::jsonb, ${p.rating ?? 0}, ${p.reviews ?? 0},
         ${p.badge ?? null}, ${p.inStock ?? true}, ${p.isService ?? false},
         ${p.description ?? ""}, ${JSON.stringify(p.specs ?? {})}::jsonb)
      on conflict (id) do nothing`;
    seeded++;
  }
  await sql`select setval(pg_get_serial_sequence('products', 'id'), coalesce((select max(id) from products), 1))`;
  res.status(200).json({ seeded });
}

async function sellers(req, res) {
  const sql = getSql();
  await ensureOrderHistoryColumns(sql);

  // Permanently delete a seller and all of their data (asked for via the admin UI
  // only after an explicit confirmation).
  if (req.method === "DELETE") {
    const body = await readJsonBody(req);
    const id = Number(body.id ?? req.query?.id);
    if (!id) { res.status(400).json({ error: "Missing seller id." }); return; }
    const result = await deleteSellerCascade(sql, id);
    if (!result.ok) { res.status(result.code || 400).json({ error: result.error }); return; }
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }

  // Detailed view of a single seller: profile + full sales analytics. An optional
  // ?from=YYYY-MM-DD returns earnings/orders placed on or after that date.
  const detailId = req.query.id;
  if (detailId) {
    const id = Number(detailId);
    const [u] = await sql`
      select id, name, email, store_name, whatsapp, jazzcash_number, jazzcash_title, created_at
      from users where id = ${id} and role = 'seller'`;
    if (!u) { res.status(404).json({ error: "Seller not found." }); return; }
    const from = req.query.from || null;
    const analytics = await sellerAnalytics(sql, id, from);
    res.status(200).json({
      seller: {
        id: u.id, name: u.name, email: u.email,
        storeName: u.store_name ?? "", whatsapp: u.whatsapp ?? "",
        jazzcashNumber: u.jazzcash_number ?? "", jazzcashTitle: u.jazzcash_title ?? "",
        joinedAt: new Date(u.created_at).getTime(),
      },
      analytics,
    });
    return;
  }

  const rows = await sql`
    select
      u.id, u.name, u.email, u.store_name, u.whatsapp, u.jazzcash_number, u.jazzcash_title, u.created_at,
      (select count(*)::int from products p where p.seller_id = u.id) as product_count,
      (select count(*)::int from orders o where o.seller_id = u.id and o.archived = false) as order_count,
      (select coalesce(sum(o.total), 0)::int from orders o
         where o.seller_id = u.id
           and o.status in ('Payment Received', 'Confirmed (COD)', 'Shipped', 'Delivered')
           and o.created_at >= coalesce(u.earnings_reset_at, '-infinity'::timestamptz)) as earnings
    from users u
    where u.role = 'seller'
    order by u.created_at desc`;
  const list = rows.map(r => ({
    id: r.id, name: r.name, email: r.email,
    storeName: r.store_name ?? "", whatsapp: r.whatsapp ?? "",
    jazzcashNumber: r.jazzcash_number ?? "", jazzcashTitle: r.jazzcash_title ?? "",
    productCount: r.product_count, orderCount: r.order_count, earnings: r.earnings,
    joinedAt: new Date(r.created_at).getTime(),
  }));
  res.status(200).json({ sellers: list });
}
