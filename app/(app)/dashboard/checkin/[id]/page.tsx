// Placeholder — will be rebuilt in Phase 3
export default function CheckinPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-dvh bg-aos-bg p-6">
      <p className="font-serif text-aos-secondary italic">Check-in: {params.id}</p>
    </main>
  );
}
