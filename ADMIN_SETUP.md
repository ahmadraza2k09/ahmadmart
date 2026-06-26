# Ahmad Mart — Admin Panel + User Auth + Neon Database Setup

The site uses **Neon Postgres** for products AND user accounts, served through
**Vercel serverless functions** in `/api`. Secrets (DB string, JWT secret, admin
password) live ONLY in environment variables — never in code.

- **/admin** — admin dashboard: manage products by category, analytics, orders.
- **/register** — sign up as **buyer** or **seller**; **/login** — sign in.
- **/account** — profile; buyers/sellers can switch role here anytime.
- Passwords are stored as **bcrypt hashes**; logins return a **JWT** (30-day).

## 1. Rotate your Neon password (important)

You shared your connection string in chat, so reset the `neondb_owner` password in
the Neon Console (Project → Roles → Reset password) and use the NEW string below.

## 2. Run the database schema (once)

In the Neon Console → **SQL Editor**, paste and run the contents of
[`db/schema.sql`](db/schema.sql). This creates the `products` AND `users` tables.

## 3. Set environment variables in Vercel

Vercel → your project → **Settings → Environment Variables** → add for
Production (and Preview):

| Name             | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`   | your **new** Neon connection string (keep `?sslmode=require`)          |
| `JWT_SECRET`     | a long random string (e.g. from `openssl rand -hex 32`) for login tokens |
| `ADMIN_EMAIL`    | `ahmadmart@mail.com` (optional — this is the default)                 |
| `ADMIN_PASSWORD` | `ahmadmart@123` (the admin login password — **change it!**)           |

Then **redeploy** so the functions pick up the variables.

## Admin login

Go to **/admin** (or /login) and sign in with `ADMIN_EMAIL` + `ADMIN_PASSWORD`
(default `ahmadmart@mail.com` / `ahmadmart@123`). On first login the admin account
is **created automatically in the Neon `users` table** (password hashed), and you
get full access to the dashboard. To change the admin password later, update
`ADMIN_PASSWORD` and the row, or just update the user's `password_hash` in Neon.

## 4. Seed your existing catalog

1. Open `https://your-site/admin`.
2. Log in with `ADMIN_PASSWORD`.
3. Go to the **Products** tab → click **Seed database**.
   This imports the built-in catalog (all current products + earbuds + services)
   into Neon. It only runs while the table is empty.

## 5. Use it

- **Products tab** — filter by category, **Add Product**, **Edit**, **Delete**.
  Changes save to Neon and show on the storefront on next load.
- **Analytics tab** — totals, in/out of stock, services, discounts, catalog value,
  and product counts by category and sub-category.
- **Orders tab** — every order from the database, with **Approve** + status controls.

## 6. Accounts & roles

- Visitors **/register** as **buyer** or **seller** (admin is never self-assigned).
- Accounts and hashed passwords are stored in the Neon `users` table.
- In **/account**, a buyer can switch to seller and back at any time.
- (Seller-specific tools, e.g. sellers listing their own products, are a future
  phase — for now the role is stored and shown.)

## 7. Orders (approval flow)

- Checkout **requires sign-in**, so every order is tied to the user's account and
  shows in **/account → Orders** with its live status.
- New orders are created in the `orders` table as **Pending Approval**.
- In **/admin → Orders**, the admin clicks **Approve**:
  - JazzCash orders → **Payment Received**
  - Cash on Delivery orders → **Confirmed (COD)** (cash collected on delivery)
- The admin can then move the order to **Shipped** / **Delivered** / **Cancelled**;
  the customer sees each change in their profile.
- ⚠️ **Re-run [`db/schema.sql`](db/schema.sql) in Neon** — it now also creates the
  `orders` table (safe to run again; everything is `create table if not exists`).

## How security works

- Passwords are hashed with **bcrypt**; we never store plaintext.
- Login/signup return a **JWT** (signed with `JWT_SECRET`) kept in the browser and
  sent as `Authorization: Bearer …`.
- Every write (`POST/PUT/DELETE /api/admin/*`) requires a valid token whose role is
  **admin** — otherwise the API returns 401, so no visitor can change your catalog.
- `GET /api/products` is public (the storefront needs it); it only reads.

## Local development

`npm run dev` runs only the Vite frontend (no `/api` functions, no database), so
the store falls back to the built-in seed catalog; auth and the admin panel need
the functions. To test functions locally use `vercel dev` with a `.env` file
containing `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
(never commit that file).

## Files

- `db/schema.sql` — `products` + `users` + `orders` tables
- `api/products.js` — public product list
- `api/admin/products.js` / `analytics.js` / `seed.js` / `orders.js` — admin-only (JWT role admin)
- `api/orders.js` — place an order / list my orders (signed-in users)
- `api/auth/signup.js` / `login.js` / `me.js` / `role.js` — accounts, login, role switch
- `api/_db.js` — Neon client + JWT / auth helpers
- `vercel.json` — SPA routing that leaves `/api` to the functions
- `src/app/auth.ts`, `src/app/adminApi.ts`, `src/app/ordersApi.ts`, `src/app/types.ts` — frontend clients + types
