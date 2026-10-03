-- ─────────────────────────────────────────────────────────────────────────
-- Expo QR Registration System — Supabase schema (Phase 1)
-- Run this once in the Supabase dashboard → SQL Editor (or via `supabase db push`).
-- ─────────────────────────────────────────────────────────────────────────

-- visitors: one row per registered visitor. qr_token is the gate badge.
create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null unique,          -- E.164 digits, no "+" (e.g. 919876543210)
  company text,
  occupation text,
  qr_token uuid not null unique default gen_random_uuid(),
  checked_in boolean not null default false
);

create index if not exists idx_visitors_qr_token on public.visitors (qr_token);
create index if not exists idx_visitors_checked_in on public.visitors (checked_in);

-- Row Level Security: locked down. No anon/authenticated grants at all —
-- the Next.js API routes and the feedback script use the service-role key,
-- which bypasses RLS by design. Visitors never touch the table directly.
alter table public.visitors enable row level security;

-- (Service role bypasses RLS automatically; these policies are not needed,
--  but the table must have RLS enabled so no direct row access is possible.)
