function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ""}`}
      style={{ background: "rgba(245,242,237,0.05)", ...style }}
    />
  );
}

export default function DashboardLoading() {
  return (
    <main className="min-h-dvh bg-aos-bg">
      <div className="px-6 pt-16 pb-28 max-w-lg mx-auto">
        {/* Eyebrow + title */}
        <Bone className="h-3 w-28 mb-2" />
        <Bone className="h-9 w-56 mb-8" style={{ borderRadius: 8 }} />

        {/* Constellation card */}
        <div
          className="rounded-3xl p-6"
          style={{
            background: "rgba(245,242,237,0.02)",
            border: "1px solid rgba(245,242,237,0.04)",
          }}
        >
          {/* SVG area placeholder */}
          <Bone className="w-full mb-4" style={{ height: 180, borderRadius: 12 }} />

          {/* Stats row */}
          <div
            className="flex justify-between pt-4"
            style={{ borderTop: "1px solid rgba(245,242,237,0.04)" }}
          >
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <Bone className="h-2.5 w-12 mb-2" />
                <Bone className="h-7 w-8" style={{ borderRadius: 6 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Covenant card */}
        <div
          className="mt-4 p-[18px] rounded-[18px]"
          style={{
            background: "rgba(245,242,237,0.02)",
            border: "1px solid rgba(245,242,237,0.04)",
          }}
        >
          <Bone className="h-2.5 w-24 mb-3" />
          <Bone className="h-3.5 w-full mb-1.5" />
          <Bone className="h-3.5 w-4/5 mb-3" />
          <Bone className="h-3 w-28" />
        </div>
      </div>
    </main>
  );
}
