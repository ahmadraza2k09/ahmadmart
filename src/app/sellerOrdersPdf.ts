// Delivered-order history, rendered to a branded Ahmad Mart PDF (spreadsheet-style
// table) so a seller has a complete permanent record before clearing their Past
// Orders list. jsPDF is imported dynamically so it only loads when actually used.
import ahmadMartLogo from "@/imports/ahmad-logo.png";
import type { Order } from "./orderStore";

const PAGE_W = 841.89, PAGE_H = 595.28, M = 32; // landscape A4
const CONTENT_W = PAGE_W - M * 2;
const BLUE: [number, number, number] = [30, 64, 175];
const ORANGE: [number, number, number] = [249, 115, 22];
const DARK: [number, number, number] = [17, 24, 39];
const GRAY: [number, number, number] = [55, 65, 81];
const MUTED: [number, number, number] = [107, 114, 128];
const STRIPE: [number, number, number] = [248, 249, 251];

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

const COLS = [
  { key: "id", label: "Order ID", w: 66 },
  { key: "date", label: "Date", w: 62 },
  { key: "name", label: "Customer", w: 100 },
  { key: "phone", label: "WhatsApp", w: 78 },
  { key: "products", label: "Products", w: 280 },
  { key: "total", label: "Total (Rs.)", w: 68 },
  { key: "payment", label: "Payment", w: 122 },
] as const;

/** Builds the branded, table-style PDF of a seller's delivered order history. */
export async function buildOrderHistoryPdf(orders: Order[], storeName: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const logo = await loadImage(ahmadMartLogo);
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  let page = 1;
  let y = 0;

  const header = () => {
    pdf.setFillColor(...BLUE);
    pdf.rect(0, 0, PAGE_W, 70, "F");
    pdf.setFillColor(...ORANGE);
    pdf.rect(0, 70, PAGE_W, 3, "F");
    if (logo) { try { pdf.addImage(logo, "PNG", M, 15, 38, 38); } catch { /* skip logo */ } }
    const tx = logo ? M + 48 : M;
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(17);
    pdf.text("Ahmad Mart", tx, 35);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
    pdf.setTextColor(253, 186, 116);
    pdf.text(`Delivered Order History — ${storeName || "Seller"}`, tx, 51);
    pdf.setTextColor(219, 234, 254); pdf.setFontSize(8);
    pdf.text(`Generated ${today}`, PAGE_W - M, 30, { align: "right" });
    pdf.text(`${orders.length} order${orders.length === 1 ? "" : "s"}`, PAGE_W - M, 44, { align: "right" });
  };

  const footer = () => {
    const fy = PAGE_H - 26;
    pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.5);
    pdf.line(M, fy, PAGE_W - M, fy);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); pdf.setTextColor(...MUTED);
    pdf.text("Ahmad Mart · Seller order history", M, fy + 12);
    pdf.text(`Page ${page}`, PAGE_W - M, fy + 12, { align: "right" });
  };

  const tableHeader = () => {
    pdf.setFillColor(...BLUE);
    pdf.rect(M, y, CONTENT_W, 20, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(255, 255, 255);
    let x = M + 6;
    for (const c of COLS) { pdf.text(c.label, x, y + 13); x += c.w; }
    y += 20;
  };

  const need = (h: number) => {
    if (y + h > PAGE_H - 40) { footer(); pdf.addPage(); page++; header(); y = 90; tableHeader(); }
  };

  header();
  y = 90;
  tableHeader();

  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  orders.forEach((o, i) => {
    const productsText = o.items.map(it => `${it.name} ×${it.qty}`).join(", ");
    const prodLines = pdf.splitTextToSize(productsText, COLS[4].w - 10) as string[];
    const rowH = Math.max(18, prodLines.length * 9.5 + 8);
    need(rowH);

    if (i % 2 === 1) { pdf.setFillColor(...STRIPE); pdf.rect(M, y, CONTENT_W, rowH, "F"); }
    pdf.setTextColor(...GRAY);
    let x = M + 6;
    pdf.text(o.id, x, y + 12); x += COLS[0].w;
    pdf.text(new Date(o.createdAt).toLocaleDateString("en-GB"), x, y + 12); x += COLS[1].w;
    pdf.text(o.name, x, y + 12, { maxWidth: COLS[2].w - 8 }); x += COLS[2].w;
    pdf.text(o.phone, x, y + 12); x += COLS[3].w;
    prodLines.forEach((line, li) => pdf.text(line, x, y + 12 + li * 9.5)); x += COLS[4].w;
    pdf.setFont("helvetica", "bold"); pdf.text(`Rs. ${o.total}`, x, y + 12); pdf.setFont("helvetica", "normal"); x += COLS[5].w;
    pdf.text(o.paymentMethod, x, y + 12, { maxWidth: COLS[6].w - 8 });

    y += rowH;
  });

  need(30);
  y += 10;
  const total = orders.reduce((s, o) => s + o.total, 0);
  pdf.setDrawColor(...ORANGE); pdf.setLineWidth(1.2); pdf.line(M, y - 6, M + 200, y - 6);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10.5); pdf.setTextColor(...DARK);
  pdf.text(`Total Delivered Orders: ${orders.length}`, M, y + 8);
  pdf.text(`Total Earnings: Rs. ${total}`, M + 230, y + 8);

  footer();
  return pdf.output("blob");
}

/** Builds and downloads the PDF (opens a blank tab synchronously so pop-up
 *  blockers allow it, matching the pattern used for policy documents). */
export function downloadOrderHistoryPdf(orders: Order[], storeName: string): void {
  const win = window.open("", "_blank");
  buildOrderHistoryPdf(orders, storeName)
    .then(blob => {
      const url = URL.createObjectURL(blob);
      if (win) { win.location.href = url; }
      else {
        const a = document.createElement("a");
        a.href = url; a.download = `Ahmad-Mart-Order-History-${storeName || "seller"}.pdf`; a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    })
    .catch(() => { if (win) win.close(); });
}
