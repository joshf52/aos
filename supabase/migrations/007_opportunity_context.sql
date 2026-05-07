-- Opportunity detail enrichment: market sizing hint + curated source links.
-- Both are optional — content keeps reading legibly when null.

alter table public.opportunities
  add column if not exists market_hint  text,
  add column if not exists source_links jsonb default '[]'::jsonb;

-- source_links shape: [{"label": "Hacker News thread", "url": "https://..."}]
