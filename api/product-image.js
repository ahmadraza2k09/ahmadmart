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
    const [row] = await sql`select image, images from products where id = ${id}`;
    if (!row) { res.status(404).json({ error: "Product not found." }); return; }

    const src = i >= 0 ? ((row.images || [])[i] ?? row.image) : row.image;
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
