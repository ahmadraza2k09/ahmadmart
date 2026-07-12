// /api/category-image — category photo management. Combined into one file
// (rather than a separate list endpoint) to stay within Vercel Hobby's
// 12-serverless-function-per-deployment cap.
//   GET (no ?cat)     (public)     list every category with an uploaded photo,
//                                  as lazy /api/category-image?cat=... URLs.
//   GET ?cat=NAME     (public)     serves that category's photo as a real
//                                  binary image, cached hard at the CDN
//                                  (mirrors /api/product-image).
//   PUT ?cat=NAME     (admin only) upload/replace the photo for a category.
//   DELETE ?cat=NAME  (admin only) remove the override (storefront falls back
//                                  to a product photo from that category).
import { getSql, requireAdmin, readJsonBody } from "./_db.js";

async function ensureTable(sql) {
  await sql`create table if not exists category_images (
    category   text primary key,
    image      text not null,
    updated_at timestamptz not null default now()
  )`;
}

export default async function handler(req, res) {
  try {
    const sql = getSql();
    const cat = (req.query.cat || "").toString();

    if (req.method === "GET" && !cat) {
      await ensureTable(sql);
      const rows = await sql`select category, updated_at from category_images`;
      const images = Object.fromEntries(rows.map(r => {
        const v = new Date(r.updated_at).getTime();
        return [r.category, `/api/category-image?cat=${encodeURIComponent(r.category)}&v=${v}`];
      }));
      res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
      res.status(200).json({ images });
      return;
    }

    if (!cat) { res.status(400).json({ error: "Missing category." }); return; }

    if (req.method === "GET") {
      await ensureTable(sql);
      const [row] = await sql`select image from category_images where category = ${cat}`;
      if (!row) { res.status(404).json({ error: "No photo set for this category." }); return; }
      const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(row.image);
      if (!m) { res.status(404).json({ error: "Image not found." }); return; }
      const mime = m[1] || "image/jpeg";
      const buf = m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]), "utf8");
      res.setHeader("Content-Type", mime);
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=31536000, immutable");
      res.status(200).send(buf);
      return;
    }

    if (!requireAdmin(req, res)) return;
    await ensureTable(sql);

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      const image = (body.image || "").toString();
      if (!image.startsWith("data:")) { res.status(400).json({ error: "Image must be an uploaded photo." }); return; }
      await sql`
        insert into category_images (category, image, updated_at) values (${cat}, ${image}, now())
        on conflict (category) do update set image = excluded.image, updated_at = now()`;
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === "DELETE") {
      await sql`delete from category_images where category = ${cat}`;
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
