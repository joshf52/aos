insert into public.opportunities (title, slug, capability, gap, signal, wedge, example_customer, why_now, confidence, builder_count)
values
(
  'Notion Template Analytics',
  'notion-template-analytics',
  'software',
  'Notion template creators sell on Gumroad but have zero insight into how customers actually use their templates. Top creators have publicly asked for this.',
  '340+ creators making $1K+/month
450K members in r/Notion
8,100 monthly searches for "Notion template analytics"',
  'Notion won''t build it. Generic analytics don''t understand Notion''s structure. A solo dev who knows both creator economics and the Notion API can own this.',
  'Priya, 28. Sells 4 Notion templates. Makes $3,200/month. Has no idea which sections people use. Would pay $29/month to know.',
  'Notion API matured in 2023. Template selling is now a legitimate business model. Window is open before a well-funded startup notices.',
  5,
  12
),
(
  'Invoice Dispute Assistant',
  'invoice-dispute-assistant',
  'software',
  'Freelancers and small agencies spend hours crafting dispute emails for late or short payments. There''s no tool that knows the right tone, the right legal framing, or what leverage they actually have.',
  '2.3M freelancers in the US report payment disputes annually
"invoice not paid" has 18K monthly searches
r/freelance has 400K members with payment dispute as a top recurring complaint',
  'Lawyers are too expensive. Templates are generic. An AI that understands freelance contracts, jurisdiction basics, and escalation paths can write what a lawyer would charge $300 to write.',
  'Marcus, 34. Runs a 3-person design studio. Lost $8,400 last year to clients who underpaid or ghosted. Spends 4 hours per dispute. Would pay $19/month to never draft those emails again.',
  'AI writing tools are normalized. Freelance economy is growing. Late payment is a structural problem with no incumbent solution below $200/month.',
  4,
  7
),
(
  'GDPR Cleanup Tool',
  'gdpr-cleanup-tool',
  'software',
  'Small SaaS companies know they''re non-compliant with GDPR data deletion requests but don''t have the engineering bandwidth to build proper deletion workflows. They ignore requests and hope nothing happens.',
  'GDPR fines hit record €2.2B in 2023
"GDPR delete user data" has 12K monthly searches
Y Combinator companies frequently list GDPR compliance as a Q3/Q4 engineering burden',
  'Enterprise compliance tools cost $2K+/month and require implementation teams. A tool that connects via API, maps where user data lives, and generates deletion audit trails — at $49/month — has no real competition below $500/month.',
  'Anika, CTO at a 12-person SaaS. Has 47 unanswered deletion requests. Knows she''s technically violating GDPR. Has no budget for Transcend or OneTrust. Would pay $49/month to make the legal risk go away.',
  'GDPR enforcement is ramping up on smaller companies. The "we''re too small to be targeted" assumption is breaking down post-2023.',
  4,
  8
),
(
  'Micro-SaaS Valuation Calculator',
  'micro-saas-valuation',
  'software',
  'Indie hackers selling their SaaS on Acquire.com or MicroAcquire have no idea what their business is actually worth. They either underprice by 40% or overprice and never sell.',
  'Acquire.com had 50K+ listings in 2023
"how much is my saas worth" has 6,200 monthly searches
IndieHackers valuation threads routinely get 200+ comments',
  'Brokers charge 10% and only take businesses over $100K ARR. Spreadsheets don''t capture the nuance. A calculator that inputs MRR, churn, growth rate, CAC, and comp multiples — and outputs a range with explanation — fills a gap that has a clear, willing audience.',
  'Jamie, 31. Built a $2,400 MRR Zapier alternative for real estate agents. Wants to sell and travel for a year. Has no idea if it''s worth $50K or $150K. Would pay $29 one-time to find out.',
  'The micro-SaaS acquisition market matured significantly 2021–2023. More sellers exist than ever. Valuation anxiety is now a documented, recurring pain in every indie hacker community.',
  4,
  5
),
(
  'Conference Talk Submission Assistant',
  'conference-talk-assistant',
  'content',
  'Technical speakers spend 3–6 hours per CFP submission crafting abstracts that committees actually accept. Rejection rates above 90% are normal. There''s no tool that teaches you what works.',
  '1,200+ tech conferences accept CFP submissions annually
"how to write a conference abstract" has 4,400 monthly searches
Speakers who submit 10+ CFPs per year are a known, vocal community on Twitter/X',
  'Conference organizers won''t build this — they benefit from selectivity. Speaking coaches charge $200/hour. An AI trained on accepted abstracts from major conferences (JSConf, PyCon, Strange Loop) that rewrites your draft and explains why — at $15/month — has no real competition.',
  'Sarah, 29. Senior engineer. Has spoken at 2 local meetups. Wants to break into conference speaking to grow her reputation. Submitted to 8 CFPs this year. Got rejected from all 8. Would pay $15/month during conference season.',
  'Remote work normalized conference speaking as a career lever. The speaker → consultant pipeline is well understood now. More engineers want in than ever before.',
  3,
  4
);
