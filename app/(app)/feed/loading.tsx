function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ""}`}
      style={{ background: "rgba(245,242,237,0.05)", ...style }}
    />
  );
}

export default function FeedLoading() {
  return (
    <main className="min-h-dvh bg-aos-bg">
      <div className="px-6 pt-16 pb-28 max-w-lg mx-auto">
        {/* Date + title */}
        <Bone className="h-3 w-28 mb-3" />
        <Bone className="h-9 w-52 mb-2" style={{ borderRadius: 8 }} />
        <Bone className="h-3.5 w-60" />

        {/* Featured card */}
        <div
          className="mt-7 rounded-3xl p-[22px]"
          style={{
            background: "rgba(245,242,237,0.02)",
            border: "1px solid rgba(245,242,237,0.04)",
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <Bone className="h-6 w-20 rounded-full" />
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Bone key={i} className="w-[5px] h-[5px] rounded-full" />
              ))}
            </div>
          </div>
          <Bone className="h-3 w-16 mb-2" />
          <Bone className="h-7 w-3/4 mb-1" style={{ borderRadius: 6 }} />
          <Bone className="h-7 w-1/2 mb-4" style={{ borderRadius: 6 }} />
          <Bone className="h-3.5 w-full mb-1.5" />
          <Bone className="h-3.5 w-5/6 mb-1.5" />
          <Bone className="h-3.5 w-4/6 mb-5" />
          <div
            className="flex items-center justify-between pt-4"
            style={{ borderTop: "1px solid rgba(245,242,237,0.04)" }}
          >
            <Bone className="h-3 w-28" />
            <Bone className="h-3 w-16" />
          </div>
        </div>

        {/* Also for you */}
        <div className="mt-9">
          <Bone className="h-3 w-20 mb-4" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3.5 p-4 rounded-[18px] mb-2"
              style={{
                background: "rgba(245,242,237,0.02)",
                border: "1px solid rgba(245,242,237,0.04)",
              }}
            >
              <div className="flex-1">
                <Bone className="h-2.5 w-12 mb-2" />
                <Bone className="h-5 w-40" style={{ borderRadius: 6 }} />
              </div>
              <Bone className="h-4 w-4 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
