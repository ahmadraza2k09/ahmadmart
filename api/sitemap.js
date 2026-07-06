// GET /sitemap.xml (rewritten here via vercel.json) — sitemap generated live
// from the catalog, so every category, sub-category and product page a seller
// adds is submitted to Google automatically, no manual updates. This is what
// lets category pages surface in search (and become sitelink candidates).
import { getSql } from "./_db.js";

const SITE = "https://www.ahmadmart.store";
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export default async function handler(req, res) {
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
  try {
    const sql = getSql();
    const rows = await sql`select id, category, subcategory, updated_at from products`;

    const now = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: `${SITE}/`, priority: "1.0", changefreq: "daily", lastmod: now },
      { loc: `${SITE}/shop`, priority: "0.9", changefreq: "daily", lastmod: now },
    ];

    const cats = [...new Set(rows.map(r => r.category).filter(Boolean))];
    for (const c of cats) {
      urls.push({ loc: `${SITE}/shop?cat=${encodeURIComponent(c)}`, priority: "0.8", changefreq: "daily", lastmod: now });
    }
    const subs = [...new Set(rows.map(r => r.subcategory).filter(Boolean))];
    for (const s of subs) {
      urls.push({ loc: `${SITE}/shop?sub=${encodeURIComponent(s)}`, priority: "0.7", changefreq: "daily", lastmod: now });
    }
    for (const r of rows) {
      urls.push({
        loc: `${SITE}/product/${r.id}`,
        priority: "0.6",
        changefreq: "weekly",
        lastmod: r.updated_at ? new Date(r.updated_at).toISOString().slice(0, 10) : now,
      });
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map(u =>
        `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
      ).join("\n") +
      `\n</urlset>\n`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).send(xml);
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
