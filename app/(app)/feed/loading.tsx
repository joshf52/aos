function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ""}`}
      style={{ background: "rgba(245,242,237,0.05)", ...style }}
    />
  );
}

const CARD_SHELL: React.CSSProperties = {
  background: "linear-gradient(160deg, #1A1A22 0%, #15151A 55%, #12121A 100%)",
  border: "1px solid rgba(245,242,237,0.06)",
};

export default function FeedLoading() {
  return (
    <main className="min-h-dvh bg-aos-bg">
      <div className="px-6 pt-20 pb-32 max-w-5xl mx-auto">
        {/* Date + title */}
        <Bone className="h-3 w-16 mb-5" />
        <Bone className="h-14 w-[26rem] max-w-full mb-4" style={{ borderRadius: 10 }} />
        <Bone className="h-4 w-72 max-w-full" />

        {/* editorial spine */}
        <div className="mt-12 h-px bg-gradient-to-r from-transparent via-aos-border-strong to-transparent" />

        {/* Hero opportunity card */}
        <div className="mt-12 rounded-[26px] p-12 sm:p-14" style={CARD_SHELL}>
          <div className="flex items-center gap-3 mb-8">
            <Bone className="h-3 w-24" />
            <Bone className="h-6 w-28 rounded-full" />
          </div>
          <Bone className="h-12 w-3/4 mb-2" style={{ borderRadius: 8 }} />
          <Bone className="h-12 w-1/2 mb-7" style={{ borderRadius: 8 }} />
          <Bone className="h-3.5 w-full max-w-2xl mb-1.5" />
          <Bone className="h-3.5 w-5/6 mb-10" />
          <div
            className="flex items-center justify-between pt-6"
            style={{ borderTop: "1px solid rgba(245,242,237,0.06)" }}
          >
            <Bone className="h-3 w-40" />
            <Bone className="h-3 w-24" />
          </div>
        </div>

        {/* Also this week */}
        <div className="mt-20">
          <Bone className="h-3 w-28 mb-6" />
          <div className="grid md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-[26px] p-7" style={CARD_SHELL}>
                <div className="flex items-center gap-3 mb-6">
                  <Bone className="h-2.5 w-20" />
                  <Bone className="h-2.5 w-24" />
                </div>
                <Bone className="h-6 w-5/6 mb-2" style={{ borderRadius: 6 }} />
                <Bone className="h-6 w-3/5 mb-4" style={{ borderRadius: 6 }} />
                <Bone className="h-3.5 w-full mb-1.5" />
                <Bone className="h-3.5 w-4/6 mb-6" />
                <div
                  className="flex items-center justify-between pt-5"
                  style={{ borderTop: "1px solid rgba(245,242,237,0.06)" }}
                >
                  <Bone className="h-3 w-28" />
                  <Bone className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
