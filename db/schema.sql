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
