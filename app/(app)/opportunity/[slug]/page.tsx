// Placeholder — will be rebuilt in Phase 3
export default function OpportunityPage({ params }: { params: { slug: string } }) {
  return (
    <main className="min-h-dvh bg-aos-bg p-6">
      <p className="font-serif text-aos-secondary italic">Opportunity: {params.slug}</p>
    </main>
  );
}
