// Frontend auth client. The JWT is kept in localStorage and sent as a Bearer
// token on authenticated requests.
export type Role = "buyer" | "seller" | "admin";
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  // Seller store details (only present for sellers).
  storeName?: string;
  whatsapp?: string;
  jazzcashNumber?: string;
  jazzcashTitle?: string;
}

export interface SellerSignup {
  storeName: string;
  whatsapp: string;
  jazzcashNumber?: string;
  jazzcashTitle?: string;
}

const TOKEN_KEY = "ahmadmart_token";
export const getToken = (): string => localStorage.getItem(TOKEN_KEY) || "";
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function postJson(url: string, body: unknown, auth = false) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = `Bearer ${getToken()}`;
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  } catch {
    throw new Error("Cannot reach the server. Check your connection and try again.");
  }
  if (res.status === 404) {
    throw new Error("Sign-in service is unavailable. The app must be deployed on Vercel with the database connected.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data;
}

export async function apiSignup(name: string, email: string, password: string, role: Role, seller?: SellerSignup) {
  return postJson("/api/auth/signup", { name, email, password, role, ...(seller || {}) }) as Promise<{ token: string; user: AuthUser }>;
}
export async function apiLogin(email: string, password: string) {
  return postJson("/api/auth/login", { email, password }) as Promise<{ token: string; user: AuthUser }>;
}
export async function apiChangeRole(role: Role) {
  return postJson("/api/auth/role", { role }, true) as Promise<{ token: string; user: AuthUser }>;
}
export async function apiMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: AuthUser };
    return data.user;
  } catch {
    return null;
  }
}
