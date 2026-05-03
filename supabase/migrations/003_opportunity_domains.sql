-- Add domain tags to opportunities so the feed can personalize by user interests.
-- Domains use the same vocabulary as profiles.domains (12 worlds chosen at onboarding).
alter table public.opportunities
  add column if not exists domains text[] default '{}'::text[];

-- Tag the five seeded opportunities. Safe to re-run via where-clauses on slug.
update public.opportunities
   set domains = array['creator', 'productivity']
 where slug = 'notion-template-analytics';

update public.opportunities
   set domains = array['creator', 'productivity', 'b2b']
 where slug = 'invoice-dispute-assistant';

update public.opportunities
   set domains = array['b2b', 'devtools']
 where slug = 'gdpr-cleanup-tool';

update public.opportunities
   set domains = array['b2b', 'finance']
 where slug = 'micro-saas-valuation';

update public.opportunities
   set domains = array['ai', 'creator', 'productivity']
 where slug = 'conference-talk-assistant';

-- Index for fast overlap queries when the catalog grows
create index if not exists opportunities_domains_idx
  on public.opportunities using gin (domains);
