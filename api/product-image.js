// GET /api/product-image?id=N&i=M&v=T — serves one product photo as a real
// binary image. Seller-uploaded photos are stored in the DB as base64 data
// URLs; embedding those directly in the /api/products JSON made the whole
// catalog a multi-megabyte download on every visit. Instead the catalog now
// references photos through this endpoint and each image loads lazily, cached
// hard at the CDN (the v= param carries the product's updated_at, so an edited
// photo gets a brand-new URL and never shows stale).
import { getSql } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
  try {
    const id = Number(req.query.id);
    const i = req.query.i == null ? -1 : Number(req.query.i);
    if (!id) { res.status(400).json({ error: "Missing product id." }); return; }

    const sql = getSql();
    // Select only the ONE photo being asked for. Reading `image, images` here
    // pulled every photo of the product out of Neon to serve a single one, so a
    // six-photo product page moved the whole set six times over — the second
    // largest drain on the network-transfer allowance after the catalog query.
    // coalesce runs inside Postgres, so falling back to the main photo when the
    // index is out of range costs nothing extra on the wire.
    //
    // ($2)::int is load-bearing: the driver sends parameters untyped and jsonb
    // has both ->>(int) and ->>(text) overloads, so left to infer Postgres
    // resolves the text one — "look up this object key" — and quietly returns
    // NULL for every array, i.e. no gallery photo would ever load.
    const rows = i >= 0
      ? await sql(
          `select coalesce(
             case when jsonb_typeof(images) = 'array' then images ->> ($2)::int end,
             image) as src
           from products where id = $1`, [id, i])
      : await sql(`select image as src from products where id = $1`, [id]);
    if (!rows.length) { res.status(404).json({ error: "Product not found." }); return; }

    const src = rows[0].src;
    if (!src) { res.status(404).json({ error: "Image not found." }); return; }

    // Guard against self-reference (an internal URL accidentally saved into the
    // DB) — redirecting to ourselves would loop forever.
    if (src.startsWith("/api/product-image")) { res.status(404).json({ error: "Image not found." }); return; }

    if (src.startsWith("data:")) {
      const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(src);
      if (!m) { res.status(404).json({ error: "Image not found." }); return; }
      const mime = m[1] || "image/jpeg";
      const buf = m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]), "utf8");
      res.setHeader("Content-Type", mime);
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=31536000, immutable");
      res.status(200).send(buf);
      return;
    }

    // External/local URL — just point the browser at it.
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=31536000, immutable");
    res.redirect(302, src);
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
