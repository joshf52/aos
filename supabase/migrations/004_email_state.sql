-- Track which transactional emails have been sent so we can keep them
-- idempotent without a separate sends/log table at MVP scale.
alter table public.profiles
  add column if not exists welcomed_at        timestamptz,
  add column if not exists last_nudged_at     timestamptz;
