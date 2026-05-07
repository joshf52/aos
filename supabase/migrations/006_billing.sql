-- Billing fields on profiles for the Stripe Pro tier.
--
-- tier:                'free' (default) or 'pro'.
-- pro_until:           timestamptz the current paid period covers through.
--                      Pro is "active" iff pro_until is in the future. We
--                      check this explicitly rather than trusting tier alone
--                      so a missed renewal naturally demotes the user.
-- stripe_customer_id:  Stripe Customer for billing portal lookups + reuse
--                      across Checkout sessions.

alter table public.profiles
  add column if not exists tier               text default 'free' not null
                              check (tier in ('free', 'pro')),
  add column if not exists pro_until          timestamptz,
  add column if not exists stripe_customer_id text;

-- Webhook handler dispatches by customer id, so an index helps when traffic
-- ramps up. Partial since most rows will be null at MVP.
create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;
