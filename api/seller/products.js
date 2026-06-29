// /api/seller/products — a seller manages ONLY their own products.
// GET (own list), POST (create), PUT (update own), DELETE (delete own).
// Requires a Bearer token with role "seller" (admins may also use it).
import { getSql, getAuthUser, rowToProduct, readJsonBody } from "../_db.js";

export default async function handler(req, res) {
  const auth = getAuthUser(req);
  if (!auth || (auth.role !== "seller" && auth.role !== "admin")) {
    res.status(401).json({ error: "Seller login required." });
    return;
  }
  try {
    const sql = getSql();
    if (req.method !== "GET") await sql`alter table products add column if not exists delivery_charge integer`;

    if (req.method === "GET") {
      const rows = await sql`select * from products where seller_id = ${auth.id} order by id desc`;
      res.status(200).json({ products: rows.map(rowToProduct) });
      return;
    }

    // Bulk: apply one delivery charge to ALL of this seller's products.
    if (req.method === "PATCH") {
      const body = await readJsonBody(req);
      const dc = body.deliveryCharge == null || body.deliveryCharge === "" ? null : Math.max(0, Math.round(Number(body.deliveryCharge)) || 0);
      const updated = await sql`update products set delivery_charge = ${dc}, updated_at = now() where seller_id = ${auth.id} returning id`;
      res.status(200).json({ ok: true, updated: updated.length });
      return;
    }

    if (req.method === "POST") {
      const p = await readJsonBody(req);
      if (!p.name || p.price == null) { res.status(400).json({ error: "Name and price are required." }); return; }
      // Sellers cannot set a badge — only the admin curates badges. Always null on create.
      const rows = await sql`
        insert into products
          (name, price, original_price, price_note, category, subcategory, image, images,
           rating, reviews, badge, in_stock, is_service, description, specs, seller_id, delivery_charge)
        values
          (${p.name}, ${p.price}, ${p.originalPrice ?? null}, ${p.priceNote ?? null}, ${p.category ?? ""},
           ${p.subcategory ?? ""}, ${p.image ?? ""}, ${JSON.stringify(p.images ?? [])}::jsonb, ${p.rating ?? 0},
           ${p.reviews ?? 0}, ${null}, ${p.inStock ?? true}, ${p.isService ?? false},
           ${p.description ?? ""}, ${JSON.stringify(p.specs ?? {})}::jsonb, ${auth.id}, ${p.deliveryCharge ?? null})
        returning *`;
      res.status(201).json({ product: rowToProduct(rows[0]) });
      return;
    }

    if (req.method === "PUT" || req.method === "DELETE") {
      const body = await readJsonBody(req);
      const id = body.id ?? req.query?.id;
      if (!id) { res.status(400).json({ error: "Missing product id." }); return; }
      const own = await sql`select seller_id from products where id = ${id}`;
      if (!own.length) { res.status(404).json({ error: "Product not found." }); return; }
      if (auth.role !== "admin" && own[0].seller_id !== auth.id) {
        res.status(403).json({ error: "You can only manage your own products." });
        return;
      }
      if (req.method === "DELETE") {
        await sql`delete from products where id = ${id}`;
        res.status(200).json({ ok: true });
        return;
      }
      const p = body;
      // Note: badge is intentionally NOT updated here — only the admin controls badges,
      // so a seller's edit preserves whatever badge the admin set.
      const rows = await sql`
        update products set
          name=${p.name}, price=${p.price}, original_price=${p.originalPrice ?? null}, price_note=${p.priceNote ?? null},
          category=${p.category ?? ""}, subcategory=${p.subcategory ?? ""}, image=${p.image ?? ""},
          images=${JSON.stringify(p.images ?? [])}::jsonb, rating=${p.rating ?? 0}, reviews=${p.reviews ?? 0},
          in_stock=${p.inStock ?? true}, is_service=${p.isService ?? false},
          description=${p.description ?? ""}, specs=${JSON.stringify(p.specs ?? {})}::jsonb,
          delivery_charge=${p.deliveryCharge ?? null}, updated_at=now()
        where id=${id}
        returning *`;
      res.status(200).json({ product: rowToProduct(rows[0]) });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
