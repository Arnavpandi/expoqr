-- 002: track when each visitor checked in (powers the live dashboard feed).
-- Run once in Supabase dashboard → SQL Editor.
alter table public.visitors
  add column if not exists checked_in_at timestamptz;
