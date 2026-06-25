// ─── Customer Reviews Store ───────────────────────────────────────────────────
// Client-side persistence for reviews that customers submit themselves on a
// product page. Each review is tied to a product id and may include a photo of
// the received product (compressed to a data URL so it fits in localStorage).

export interface UserReview {
  id: string;
  productId: number;
  name: string;
  rating: number;        // 1–5 stars
  text: string;
  image?: string;        // optional compressed data URL of the received product
  createdAt: number;
}

const STORAGE_KEY = "ahmadmart_reviews_v1";

export function getReviews(): UserReview[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserReview[]) : [];
  } catch {
    return [];
  }
}

/** Reviews for a single product, newest first. */
export function getProductReviews(productId: number): UserReview[] {
  return getReviews()
    .filter(r => r.productId === productId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Persist a new review at the top of the list. Returns true if it was stored. */
export function saveReview(review: UserReview): boolean {
  try {
    const all = getReviews();
    all.unshift(review);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch {
    // Most likely a localStorage quota error from a large image.
    return false;
  }
}

export function newReviewId(): string {
  return `R${Date.now().toString().slice(-8)}`;
}
