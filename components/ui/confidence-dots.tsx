/**
 * 5-dot confidence indicator. When wrapped in a `.group` ancestor, the empty
 * dots subtly fill in stagger on hover — a small "this responds to me" cue
 * on opportunity cards. Pure CSS, no JS needed.
 */
export function ConfidenceDots({
  count,
  size = "md",
}: {
  count: number;
  size?: "sm" | "md";
}) {
  const dotClass = size === "sm" ? "w-[4px] h-[4px]" : "w-[5px] h-[5px]";
  return (
    <div className="flex gap-[3px] items-center">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= count;
        return (
          <span
            key={i}
            data-confidence-dot={filled ? "filled" : "empty"}
            className={`${dotClass} rounded-full transition-colors duration-500 ease-out`}
            style={{
              background: filled ? "#D4A574" : "rgba(245,242,237,0.12)",
              transitionDelay: filled ? "0ms" : `${(i - count - 1) * 80}ms`,
            }}
          />
        );
      })}
    </div>
  );
}
