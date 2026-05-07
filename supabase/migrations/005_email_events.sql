-- Email observability: a single append-only log of every outbound send and
-- every inbound delivery/bounce/complaint event from Resend. Joining
-- outbound sends to inbound webhooks via resend_id gives full lifecycle.
--
-- This is the foundation for /api/webhooks/resend and for skipping
-- known-bad addresses in the nudge cron.

create table public.email_events (
  id          uuid default uuid_generate_v4() primary key,
  created_at  timestamptz default now() not null,
  user_id     uuid references auth.users(id) on delete set null,
  email       text not null,
  kind        text not null
                check (kind in ('welcome', 'checkin_nudge')),
  status      text not null
                check (status in (
                  'sent', 'failed',
                  'delivered', 'opened', 'clicked',
                  'bounced', 'complained', 'delivery_delayed'
                )),
  resend_id   text,
  metadata    jsonb
);

-- Looking up by recipient address (bounce/complaint suppression checks).
create index email_events_email_idx
  on public.email_events (email);

-- Joining outbound sends to inbound webhook events.
create index email_events_resend_id_idx
  on public.email_events (resend_id)
  where resend_id is not null;

-- Time-ordered scans (cron freshness, founder analytics).
create index email_events_created_at_idx
  on public.email_events (created_at desc);

alter table public.email_events enable row level security;

-- No client-facing policy: writes happen only via service role from server
-- routes (send.ts, webhook handler). Reads are server-only too. RLS being
-- enabled with no policy means anon/authenticated requests are denied,
-- which is what we want.
