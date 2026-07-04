// Customer Care policy documents, rendered to a branded Ahmad Mart PDF on demand.
// jsPDF is imported dynamically so it only loads when a buyer opens a policy,
// keeping the main store bundle small and fast.
import ahmadMartLogo from "@/imports/ahmad-logo.png";
import { WHATSAPP_DISPLAY } from "./orderStore";

const SUPPORT_EMAIL = "tryahmadmart.store@gmail.com";
const SITE = "ahmadmart.store";

export type PolicyId = "track-order" | "returns" | "privacy" | "terms" | "faq";

export interface PolicySection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  faqs?: { q: string; a: string }[];
}
export interface PolicyDoc {
  id: PolicyId;
  label: string;   // shown in the footer
  title: string;   // shown on the PDF
  sections: PolicySection[];
}

// The footer Customer Care links, in order.
export const POLICY_LINKS: { id: PolicyId; label: string }[] = [
  { id: "track-order", label: "Track Your Order" },
  { id: "returns", label: "Return Policy" },
  { id: "privacy", label: "Privacy Policy" },
  { id: "terms", label: "Terms & Conditions" },
  { id: "faq", label: "FAQ" },
];

export const POLICY_DOCS: Record<PolicyId, PolicyDoc> = {
  "track-order": {
    id: "track-order", label: "Track Your Order", title: "Track Your Order",
    sections: [
      { paragraphs: ["At Ahmad Mart every order is confirmed and handled over WhatsApp, so you always know exactly where your order stands. This guide explains how to follow your order from the moment you place it until it reaches your door."] },
      {
        heading: "Order Status Stages",
        bullets: [
          "Pending Approval: your order has been placed and is waiting for the seller or admin to confirm it on WhatsApp.",
          "Payment Received: for mobile wallet orders (JazzCash, SadaPay, NayaPay, or Easypaisa), your payment has been verified and the order is being prepared.",
          "Confirmed (COD): for Cash on Delivery orders in Multan, your order is confirmed and being prepared.",
          "Shipped: your order has been handed to the courier and is on its way.",
          "Delivered: your order has reached you. Enjoy your purchase.",
        ],
      },
      {
        heading: "How to Track",
        bullets: [
          "Sign in to your Ahmad Mart account, open My Orders, and view the live status of every order.",
          "Each order has a unique Order ID (for example AM123456). Keep it handy.",
          `Message us on WhatsApp at ${WHATSAPP_DISPLAY} with your Order ID and we will share the latest update.`,
        ],
      },
      {
        heading: "Estimated Delivery Times",
        bullets: [
          "Multan region: usually 1 to 2 working days.",
          "Rest of Pakistan: usually 3 to 5 working days.",
          "Times may vary on weekends, public holidays, and during high demand.",
        ],
      },
      { heading: "Need Help", paragraphs: [`Our team is here to help. Contact us on WhatsApp at ${WHATSAPP_DISPLAY} or email ${SUPPORT_EMAIL} with your Order ID and we will assist you right away.`] },
    ],
  },

  returns: {
    id: "returns", label: "Return Policy", title: "Return & Refund Policy",
    sections: [
      { paragraphs: ["Your satisfaction matters to us. If something is not right with your order, this policy explains how returns, replacements, and refunds work at Ahmad Mart."] },
      { heading: "Return Window", paragraphs: ["You may request a return within 7 days of receiving your order. Requests made after 7 days cannot be accepted."] },
      {
        heading: "Conditions for a Return",
        bullets: [
          "The item must be unused, in its original condition, with all packaging, accessories, and tags.",
          "You must provide your Order ID and a clear photo or short video of the item.",
          "Items that show signs of use, damage caused after delivery, or missing parts cannot be returned.",
        ],
      },
      {
        heading: "How to Request a Return",
        bullets: [
          `Message us on WhatsApp at ${WHATSAPP_DISPLAY} within 7 days of delivery.`,
          "Share your Order ID, the reason for the return, and photos or a video of the product.",
          "Our team will review your request and guide you through the next steps.",
        ],
      },
      {
        heading: "Refunds",
        bullets: [
          "Approved refunds are processed by mobile wallet transfer (JazzCash, SadaPay, NayaPay, or Easypaisa) or by bank transfer after the returned item is received and inspected.",
          "You may also choose a replacement of the same item where stock allows.",
          "Delivery charges are non refundable unless the return is due to our error, a wrong item, or a faulty product.",
        ],
      },
      {
        heading: "Damaged, Wrong, or Faulty Items",
        paragraphs: ["If you receive a damaged, wrong, or faulty item, please report it within 48 hours of delivery with photos. In these cases we arrange a free replacement or a full refund, including any delivery charges."],
      },
      {
        heading: "Non Returnable Items",
        bullets: [
          "Digital services (for example website development, social media management, and graphic designing).",
          "Personal use items such as earbuds once the seal is opened, for hygiene reasons, unless the item is faulty or dead on arrival.",
          "Items damaged due to misuse, mishandling, or normal wear.",
        ],
      },
    ],
  },

  privacy: {
    id: "privacy", label: "Privacy Policy", title: "Privacy Policy",
    sections: [
      { paragraphs: ["Ahmad Mart respects your privacy. This policy explains what information we collect, how we use it, and the choices you have. By using our store you agree to this policy."] },
      {
        heading: "Information We Collect",
        bullets: [
          "Your name, WhatsApp number, and delivery address, which are needed to process and deliver your order.",
          "Your email address, if you choose to provide it.",
          "Order details such as the items you buy, totals, and order status.",
          "If you sell on Ahmad Mart, your store name, WhatsApp number, and payment account (JazzCash, SadaPay, NayaPay, or Easypaisa) details.",
        ],
      },
      {
        heading: "How We Use Your Information",
        bullets: [
          "To confirm, prepare, and deliver your orders.",
          "To verify payments and contact you on WhatsApp about your order.",
          "To provide customer support and respond to your questions.",
          "To improve our products, service, and the store experience.",
        ],
      },
      {
        heading: "Payment Information",
        paragraphs: ["Payments are made by mobile wallet transfer (JazzCash, SadaPay, NayaPay, or Easypaisa — whichever the seller accepts) through WhatsApp, or by Cash on Delivery in the Multan region. We do not collect or store your card or banking passwords. Wallet transfers are completed by you directly and verified from your screenshot."],
      },
      {
        heading: "How We Share Information",
        bullets: [
          "With the seller who is fulfilling your order, so they can prepare and deliver it.",
          "With our delivery partners, so your order can reach you.",
          "We never sell your personal information to anyone.",
        ],
      },
      {
        heading: "Cookies and Local Storage",
        paragraphs: ["Your cart, wishlist, and sign in session are saved on your own device using browser storage, so your experience stays smooth. This data stays on your device."],
      },
      {
        heading: "Your Rights and Contact",
        paragraphs: [`You may ask us to access, update, or delete your personal information at any time. Contact us on WhatsApp at ${WHATSAPP_DISPLAY} or by email at ${SUPPORT_EMAIL}.`],
      },
    ],
  },

  terms: {
    id: "terms", label: "Terms & Conditions", title: "Terms & Conditions",
    sections: [
      { paragraphs: ["These terms govern your use of Ahmad Mart. By placing an order or using our store, you agree to the terms below. Please read them carefully."] },
      {
        heading: "About Ahmad Mart",
        paragraphs: ["Ahmad Mart is a Pakistani online marketplace. Products are offered both by Ahmad Mart and by independent sellers who run their own stores on our platform."],
      },
      {
        heading: "Orders and Pricing",
        bullets: [
          "All prices are shown in Pakistani Rupees and may change without prior notice.",
          "Every order is confirmed with you on WhatsApp before it is processed.",
          "Orders begin as Pending Approval and move forward only after they are confirmed.",
          "We may decline or cancel any order in case of pricing errors, stock issues, or suspected fraud.",
        ],
      },
      {
        heading: "Payment",
        bullets: [
          "Mobile wallet transfer (JazzCash, SadaPay, NayaPay, or Easypaisa, depending on the seller) through WhatsApp is available across Pakistan. You send the payment and share your screenshot for verification.",
          "Cash on Delivery is available in the Multan region only. Orders outside Multan must pay by wallet transfer.",
        ],
      },
      {
        heading: "Delivery and Charges",
        bullets: [
          "Delivery charges are set by each seller and may differ from product to product.",
          "Your exact delivery charge is shown clearly at checkout before you place the order.",
          "Delivery times are estimates and may vary.",
        ],
      },
      {
        heading: "Sellers",
        paragraphs: ["Independent sellers are responsible for their own products, descriptions, pricing, stock, and order fulfillment. Ahmad Mart connects buyers and sellers and charges sellers 0% commission."],
      },
      {
        heading: "Acceptable Use",
        bullets: [
          "Provide accurate details when placing an order.",
          "Do not place fake or fraudulent orders or misuse the platform.",
          "Do not attempt to disrupt, damage, or gain unauthorised access to the store.",
        ],
      },
      {
        heading: "Limitation of Liability",
        paragraphs: ["Ahmad Mart is not liable for delays or issues outside our reasonable control, including courier delays and incorrect details provided at checkout. Our responsibility for any order is limited to the value of that order."],
      },
      {
        heading: "Contact",
        paragraphs: [`For any question about these terms, contact us on WhatsApp at ${WHATSAPP_DISPLAY} or email ${SUPPORT_EMAIL}.`],
      },
    ],
  },

  faq: {
    id: "faq", label: "FAQ", title: "Frequently Asked Questions",
    sections: [
      {
        faqs: [
          { q: "What payment methods do you accept?", a: `We accept mobile wallet transfer — JazzCash, SadaPay, NayaPay, or Easypaisa depending on the seller (paid through WhatsApp) — across Pakistan, and Cash on Delivery in the Multan region only. Contact us on WhatsApp at ${WHATSAPP_DISPLAY} if you need help.` },
          { q: "What are the delivery charges?", a: "Delivery charges are set by each seller and can vary by product. You always see the exact delivery charge at checkout before placing your order." },
          { q: "Where is Cash on Delivery available?", a: "Cash on Delivery is available in the Multan region only. For all other areas, please pay by mobile wallet transfer through WhatsApp." },
          { q: "How long does delivery take?", a: "Multan usually takes 1 to 2 working days, and the rest of Pakistan usually takes 3 to 5 working days. Times may vary on holidays and busy periods." },
          { q: "How do I place an order?", a: "Add items to your cart or tap Buy Now, fill in your details at checkout, choose wallet transfer or Cash on Delivery, then place the order. It opens on WhatsApp so you can complete payment and confirm." },
          { q: "How do I track my order?", a: "Sign in and open My Orders to see the live status, or message us on WhatsApp with your Order ID." },
          { q: "Can I return a product?", a: "Yes. You can request a return within 7 days of delivery if the item is unused and in its original condition. See our Return and Refund Policy for full details." },
          { q: "How do I become a seller?", a: "Register as a seller, add your store name, WhatsApp, and payment account (JazzCash, SadaPay, NayaPay, or Easypaisa) details, then list your products. Ahmad Mart charges 0% commission." },
          { q: "How can I contact Ahmad Mart?", a: `Message us on WhatsApp at ${WHATSAPP_DISPLAY} or email ${SUPPORT_EMAIL}. We are happy to help.` },
        ],
      },
    ],
  },
};

// ─── PDF rendering ────────────────────────────────────────────────────────────
const PAGE_W = 595.28, PAGE_H = 841.89, M = 48;
const CONTENT_W = PAGE_W - M * 2;
const BLUE: [number, number, number] = [30, 64, 175];
const ORANGE: [number, number, number] = [249, 115, 22];
const DARK: [number, number, number] = [17, 24, 39];
const GRAY: [number, number, number] = [55, 65, 81];
const MUTED: [number, number, number] = [107, 114, 128];

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function buildPolicyPdf(id: PolicyId): Promise<Blob> {
  const doc = POLICY_DOCS[id];
  const { jsPDF } = await import("jspdf");
  const logo = await loadImage(ahmadMartLogo);
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  let page = 1;
  let y = 0;

  const header = () => {
    pdf.setFillColor(...BLUE);
    pdf.rect(0, 0, PAGE_W, 96, "F");
    pdf.setFillColor(...ORANGE);
    pdf.rect(0, 96, PAGE_W, 4, "F");
    if (logo) { try { pdf.addImage(logo, "PNG", M, 26, 44, 44); } catch { /* skip logo */ } }
    const tx = logo ? M + 58 : M;
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(22);
    pdf.text("Ahmad Mart", tx, 50);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
    pdf.setTextColor(253, 186, 116);
    pdf.text("Quality You Can Trust", tx, 67);
    pdf.setTextColor(219, 234, 254); pdf.setFontSize(8.5);
    const r = PAGE_W - M;
    pdf.text(SITE, r, 34, { align: "right" });
    pdf.text(`WhatsApp ${WHATSAPP_DISPLAY}`, r, 48, { align: "right" });
    pdf.text(SUPPORT_EMAIL, r, 62, { align: "right" });
  };

  const footer = () => {
    const fy = PAGE_H - 38;
    pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.5);
    pdf.line(M, fy, PAGE_W - M, fy);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(...MUTED);
    pdf.text("Ahmad Mart · Pakistan's trusted online store", M, fy + 14);
    pdf.text(`Page ${page}`, PAGE_W - M, fy + 14, { align: "right" });
  };

  const need = (h: number) => {
    if (y + h > PAGE_H - 64) { footer(); pdf.addPage(); page++; header(); y = 132; }
  };
  const heading = (text: string) => {
    need(34); y += 6;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(12.5); pdf.setTextColor(...BLUE);
    pdf.text(text, M, y); y += 7;
    pdf.setDrawColor(...ORANGE); pdf.setLineWidth(1.5); pdf.line(M, y, M + 30, y); y += 16;
  };
  const para = (text: string, indent = 0, color = GRAY) => {
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, CONTENT_W - indent) as string[];
    for (const line of lines) { need(14); pdf.text(line, M + indent, y); y += 14; }
  };
  const bullet = (text: string) => {
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(text, CONTENT_W - 16) as string[];
    need(14);
    pdf.setFont("helvetica", "bold"); pdf.setTextColor(...ORANGE); pdf.text("•", M, y);
    pdf.setFont("helvetica", "normal"); pdf.setTextColor(...GRAY); pdf.text(lines[0], M + 16, y); y += 14;
    for (let i = 1; i < lines.length; i++) { need(14); pdf.text(lines[i], M + 16, y); y += 14; }
  };

  // Title block
  header();
  y = 130;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(...ORANGE);
  pdf.text("CUSTOMER CARE", M, y); y += 20;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(20); pdf.setTextColor(...DARK);
  pdf.text(doc.title, M, y); y += 6;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(...MUTED);
  pdf.text(`Last updated ${today}`, M, y + 11); y += 30;

  for (const s of doc.sections) {
    if (s.heading) heading(s.heading);
    if (s.paragraphs) for (const p of s.paragraphs) { para(p); y += 6; }
    if (s.bullets) { for (const b of s.bullets) bullet(b); y += 6; }
    if (s.faqs) for (const f of s.faqs) {
      need(20); y += 2;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(...DARK);
      const ql = pdf.splitTextToSize(f.q, CONTENT_W) as string[];
      for (const line of ql) { need(15); pdf.text(line, M, y); y += 15; }
      y += 2;
      para(f.a);
      y += 10;
    }
  }
  footer();

  return pdf.output("blob");
}

// Opens the branded policy PDF. A blank tab is opened synchronously inside the
// click so pop-up blockers allow it; the PDF is loaded into it once ready. Falls
// back to a download if the tab was blocked.
export function openPolicyPdf(id: PolicyId): void {
  const win = window.open("", "_blank");
  buildPolicyPdf(id)
    .then(blob => {
      const url = URL.createObjectURL(blob);
      if (win) { win.location.href = url; }
      else {
        const a = document.createElement("a");
        a.href = url; a.download = `Ahmad-Mart-${id}.pdf`; a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    })
    .catch(() => { if (win) win.close(); });
}
