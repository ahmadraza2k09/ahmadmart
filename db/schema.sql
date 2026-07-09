-- Ahmad Mart — products schema for Neon Postgres.
-- Run this once in the Neon SQL Editor (or psql) before using the admin panel.

create table if not exists products (
  id             serial primary key,
  name           text    not null,
  price          integer not null,
  original_price integer,
  price_note     text,
  category       text    not null,
  subcategory    text    not null,
  image          text    not null default '',
  images         jsonb   not null default '[]'::jsonb,
  rating         real    not null default 0,
  reviews        integer not null default 0,
  badge          text,
  in_stock       boolean not null default true,
  is_service     boolean not null default false,
  description    text    not null default '',
  specs          jsonb   not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists products_category_idx    on products (category);
create index if not exists products_subcategory_idx on products (subcategory);

-- ─── Users / authentication ───────────────────────────────────────────────────
-- Passwords are stored as bcrypt hashes (never plaintext). The admin account is
-- created automatically on first login using ADMIN_EMAIL / ADMIN_PASSWORD.
create table if not exists users (
  id            serial primary key,
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  role          text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists users_email_idx on users (lower(email));

-- ─── Orders ───────────────────────────────────────────────────────────────────
-- Every checkout creates an order tied to the signed-in user. New orders start as
-- "Pending Approval" and only move forward once the admin approves them.
create table if not exists orders (
  id             text primary key,         -- e.g. AM123456
  user_id        integer references users(id) on delete set null,
  name           text not null,
  phone          text not null,
  email          text,
  address        text not null,
  notes          text,
  items          jsonb not null default '[]'::jsonb,
  subtotal       integer not null,
  shipping       integer not null default 0,
  discount       integer not null default 0,
  promo_code     text,
  total          integer not null,
  payment_method text not null,
  status         text not null default 'Pending Approval',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists orders_user_idx   on orders (user_id);
create index if not exists orders_status_idx on orders (status);

-- ─── Marketplace (sellers) ────────────────────────────────────────────────────
-- Run this block again any time — every statement is idempotent.

-- Seller store details (filled in when a seller signs up).
alter table users add column if not exists store_name      text;
alter table users add column if not exists whatsapp        text;
alter table users add column if not exists city            text;
-- Payment account for manual wallet-transfer orders. Columns are still named
-- jazzcash_* (kept as-is to avoid a data migration on existing sellers) but hold
-- whichever wallet the seller actually picked, recorded in account_type.
alter table users add column if not exists jazzcash_number text;
alter table users add column if not exists jazzcash_title  text;
alter table users add column if not exists account_type    text not null default 'JazzCash'; -- 'JazzCash' | 'SadaPay' | 'NayaPay' | 'Easypaisa'
-- Which checkout options this seller offers buyers:
-- 'both' (default) | 'online' (wallet transfer only) | 'cod' (cash on delivery only)
alter table users add column if not exists payment_methods text not null default 'both';

-- Per-product delivery charge set by the seller (NULL = use the platform default).
alter table products add column if not exists delivery_charge integer;

-- Which seller owns a product. NULL = official Ahmad Mart (admin) product.
alter table products add column if not exists seller_id integer references users(id) on delete set null;
create index if not exists products_seller_idx on products (seller_id);

-- Admin-curated featured products (prioritised across the storefront).
alter table products add column if not exists featured boolean not null default false;

-- With split-per-seller checkout every order belongs to one seller (NULL = official).
alter table orders add column if not exists seller_id integer references users(id) on delete set null;
create index if not exists orders_seller_idx on orders (seller_id);

-- A seller "clears" their delivered-order history after downloading it as a PDF —
-- archived orders drop out of their Past Orders list but the row is kept (never
-- deleted), so earnings totals stay accurate unless the seller also resets them.
alter table orders add column if not exists archived boolean not null default false;

-- When a seller resets earnings during a history clear, earnings aggregates only
-- count orders created on or after this timestamp. NULL = never reset (count all).
alter table users add column if not exists earnings_reset_at timestamptz;

-- ─── Messages (buyer ↔ seller chat) ───────────────────────────────────────────
-- A conversation thread = (product_id, buyer_id, seller_id). sender_id is whoever
-- sent each message. read = whether the OTHER party has seen it.
create table if not exists messages (
  id         serial primary key,
  product_id integer references products(id) on delete cascade,
  buyer_id   integer not null references users(id) on delete cascade,
  seller_id  integer not null references users(id) on delete cascade,
  sender_id  integer not null references users(id) on delete cascade,
  body       text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_thread_idx    on messages (product_id, buyer_id, seller_id, created_at);
create index if not exists messages_recipient_idx on messages (buyer_id, seller_id);
