// Placeholder — Phase 4: The Ceremony
export default function CeremonyPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-dvh bg-black flex items-center justify-center">
      <p className="font-serif text-aos-gold italic">The Ceremony — {params.id}</p>
    </main>
  );
}
