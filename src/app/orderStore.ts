// ─── Manual JazzCash Order Store ──────────────────────────────────────────────
// Client-side order persistence + email delivery for the manual JazzCash payment
// flow. This is a MANUAL verification system: orders are always created with the
// status "Pending Verification" and are NEVER auto-marked as paid. An admin must
// review the uploaded payment screenshot and approve each order manually.

// ─── Config ───────────────────────────────────────────────────────────────────
export const JAZZCASH_NUMBER = "03085560981";
export const JAZZCASH_TITLE = "M. Faizan Ali";
export const ORDER_EMAIL = "tryahmadmart.store@gmail.com";

// Store owner's WhatsApp. WHATSAPP_NUMBER must be international format with no "+",
// spaces or leading zero (used to build wa.me click-to-chat links).
export const WHATSAPP_NUMBER = "923405463601";
export const WHATSAPP_DISPLAY = "+92 340 5463601";

// Web3Forms lets a static site email order details + the screenshot attachment to
// ORDER_EMAIL with no backend. Create a FREE access key at https://web3forms.com
// (sign up with tryahmadmart.store@gmail.com so order emails land in that inbox),
// then paste the key below. Until it is set, orders still save to the admin panel
// and the customer still gets the confirmation — only the email is skipped.
export const WEB3FORMS_ACCESS_KEY = "";

// Basic client-side gate for the /admin page. NOTE: this is light obfuscation, not
// real security (anyone with the code in their browser could bypass it). For a
// public store, protect the admin behind a real backend login later.
export const ADMIN_PASSCODE = "ahmadmart-admin";

// ─── Types ────────────────────────────────────────────────────────────────────
export const ORDER_STATUSES = [
  "Pending Approval",
  "Payment Received",
  "Confirmed (COD)",
  "Shipped",
  "Delivered",
  "Cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  id: number;
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  userId?: number;
  createdAt: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount?: number;   // legacy / reserved; no discounts are applied currently
  promoCode?: string;  // legacy / reserved
  total: number;
  proofImage?: string; // optional — payment proof is sent/verified on WhatsApp
  proofName?: string;
  paymentMethod: string;
  status: OrderStatus;
  // Marketplace: the seller this order belongs to, and the seller's contact used
  // for checkout/WhatsApp. Absent = official Ahmad Mart order.
  sellerId?: number;
  sellerStore?: string;
  sellerWhatsapp?: string;
  sellerJazzcashNumber?: string;
  sellerJazzcashTitle?: string;
  // Set once a seller downloads + clears a Delivered order from their Past Orders
  // history — the row is kept (for earnings accuracy) but no longer shown to them.
  archived?: boolean;
}

// ─── localStorage persistence ─────────────────────────────────────────────────
const STORAGE_KEY = "ahmadmart_orders_v1";

export function getOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

/** Persist a new order at the top of the list. Returns true if it was stored. */
export function saveOrder(order: Order): boolean {
  try {
    const all = getOrders();
    all.unshift(order);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch {
    // Most likely a localStorage quota error from a large image — fail soft so the
    // checkout still completes (the order email already carries the full proof).
    return false;
  }
}

export function updateOrderStatus(id: string, status: OrderStatus): Order[] {
  const all = getOrders().map(o => (o.id === id ? { ...o, status } : o));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
  return all;
}

export function newOrderId(): string {
  return `AM${Date.now().toString().slice(-6)}`;
}

// ─── WhatsApp delivery (wa.me deep link) ──────────────────────────────────────
/** Normalise a local PK number (e.g. 03001234567) to wa.me format (923001234567). */
export function toWaNumber(local: string): string {
  const digits = (local || "").replace(/\D/g, "");
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  if (digits.startsWith("92")) return digits;
  if (digits.length === 10) return `92${digits}`; // bare 3001234567
  return digits;
}

/** True when the order is a Cash-on-Delivery order (vs. manual JazzCash). */
export function isCashOnDelivery(order: Pick<Order, "paymentMethod">): boolean {
  return /cash on delivery|\bcod\b/i.test(order.paymentMethod);
}

/** Build the pre-filled order message the customer sends to the store on WhatsApp. */
export function buildWhatsAppText(order: Order): string {
  const products = order.items
    .map(i => `• ${i.name} × ${i.qty} = Rs. ${i.price * i.qty}`)
    .join("\n");
  const cod = isCashOnDelivery(order);
  const jazzNumber = order.sellerJazzcashNumber || JAZZCASH_NUMBER;
  const jazzTitle = order.sellerJazzcashTitle || JAZZCASH_TITLE;
  const paymentLine = cod
    ? `Payment: Cash on Delivery (Multan)`
    : `Payment: JazzCash to ${jazzNumber} (${jazzTitle})`;
  const closingLine = cod
    ? `Please confirm my order — I'll pay cash on delivery. 🚚`
    : `I'll send the payment to the JazzCash number above and attach the screenshot here. 👇`;
  return [
    `*New Order — Ahmad Mart*`,
    order.sellerStore ? `Store: ${order.sellerStore}` : ``,
    `Order ID: ${order.id}`,
    `Date: ${new Date(order.createdAt).toLocaleString()}`,
    ``,
    `*Customer*`,
    `Name: ${order.name}`,
    `WhatsApp: ${order.phone}`,
    order.email ? `Email: ${order.email}` : ``,
    `Address: ${order.address}`,
    order.notes ? `Notes: ${order.notes}` : ``,
    ``,
    `*Products*`,
    products,
    ``,
    `Subtotal: Rs. ${order.subtotal}`,
    `Delivery: ${order.shipping === 0 ? "Free" : `Rs. ${order.shipping}`}`,
    order.discount ? `Promo (${order.promoCode || "discount"}): -Rs. ${order.discount}` : ``,
    `*Total: Rs. ${order.total}*`,
    ``,
    paymentLine,
    `Status: ${order.status}`,
    ``,
    closingLine,
  ]
    .filter(Boolean)
    .join("\n");
}

/** wa.me link pre-filled with the order — to the seller's WhatsApp when present,
 *  otherwise to the official Ahmad Mart number. */
export function whatsappOrderUrl(order: Order): string {
  const number = order.sellerWhatsapp ? toWaNumber(order.sellerWhatsapp) : WHATSAPP_NUMBER;
  return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppText(order))}`;
}

/** wa.me link, pre-filled with a delivery confirmation, to the BUYER's WhatsApp —
 *  opened automatically when a seller/admin marks an order "Delivered". */
export function whatsappDeliveredUrl(order: Order): string {
  const text = [
    `Assalam-o-Alaikum ${order.name}! 👋`,
    ``,
    `Aapka order *#${order.id}* deliver ho chuka hai. Ahmad Mart se kharidari karne ka shukriya! 🙏`,
    ``,
    ...order.items.map(i => `• ${i.name} × ${i.qty}`),
    ``,
    `Total: Rs. ${order.total}`,
  ].join("\n");
  return `https://wa.me/${toWaNumber(order.phone)}?text=${encodeURIComponent(text)}`;
}

// ─── Image handling ───────────────────────────────────────────────────────────
export const ACCEPTED_PROOF_TYPES = ["image/jpeg", "image/jpg", "image/png"];
export const MAX_PROOF_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateProofFile(file: File): string | null {
  const typeOk =
    ACCEPTED_PROOF_TYPES.includes(file.type) || /\.(jpe?g|png)$/i.test(file.name);
  if (!typeOk) return "Only JPG, JPEG, or PNG files are allowed.";
  if (file.size > MAX_PROOF_BYTES) return "File is too large. Maximum size is 10 MB.";
  return null;
}

/**
 * Downscale + JPEG-compress an image file into a data URL. Keeps the admin
 * preview small enough for localStorage while the full-resolution original is
 * what gets attached to the order email.
 */
export function fileToCompressedDataURL(
  file: File,
  maxDim = 1280,
  quality = 0.72,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not load image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Email delivery (Web3Forms) ───────────────────────────────────────────────
export type EmailResult = { ok: boolean; skipped?: boolean; error?: string };

export async function sendOrderEmail(order: Order, file: File | null): Promise<EmailResult> {
  if (!WEB3FORMS_ACCESS_KEY) return { ok: false, skipped: true };
  try {
    const fd = new FormData();
    fd.append("access_key", WEB3FORMS_ACCESS_KEY);
    fd.append("from_name", "Ahmad Mart Orders");
    fd.append("subject", `New Order ${order.id} — Awaiting Payment Verification`);

    const productLines = order.items
      .map(i => `  • ${i.name} — Qty ${i.qty} × Rs. ${i.price} = Rs. ${i.price * i.qty}`)
      .join("\n");

    const message = [
      `NEW ORDER — PAYMENT VERIFICATION REQUIRED`,
      `Order ID: ${order.id}`,
      `Date & Time: ${new Date(order.createdAt).toLocaleString()}`,
      ``,
      `CUSTOMER`,
      `  Name: ${order.name}`,
      `  Phone: ${order.phone}`,
      `  Email: ${order.email}`,
      `  Shipping Address: ${order.address}`,
      order.notes ? `  Notes: ${order.notes}` : ``,
      ``,
      `PRODUCTS`,
      productLines,
      ``,
      `  Subtotal: Rs. ${order.subtotal}`,
      `  Delivery: ${order.shipping === 0 ? "Free" : `Rs. ${order.shipping}`}`,
      order.discount ? `  Promo (${order.promoCode || "discount"}): -Rs. ${order.discount}` : ``,
      `  TOTAL AMOUNT: Rs. ${order.total}`,
      ``,
      `PAYMENT`,
      `  Method: JazzCash (Manual)`,
      `  Pay-to Number: ${JAZZCASH_NUMBER} (${JAZZCASH_TITLE})`,
      `  Status: ${order.status}`,
      ``,
      `>> Verify the attached payment screenshot before approving this order.`,
    ]
      .filter(Boolean)
      .join("\n");

    fd.append("message", message);
    if (file) fd.append("attachment", file, file.name);

    const res = await fetch("https://api.web3forms.com/submit", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({} as { success?: boolean }));
    return { ok: res.ok && (data as { success?: boolean }).success !== false };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
