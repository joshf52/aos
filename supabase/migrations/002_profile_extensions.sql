-- Extend profiles with onboarding fields added in Phase 2
alter table public.profiles
  add column if not exists domains         text[],
  add column if not exists audience        text,
  add column if not exists commitment_level text,
  add column if not exists build_mode      text default null
    check (build_mode in ('self', 'ai'));
