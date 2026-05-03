"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, Target, User } from "lucide-react";

const SPRING = [0.22, 1, 0.36, 1] as const;

const TABS = [
  { id: "today",  label: "Today",  href: "/feed",      Icon: Compass },
  { id: "sprint", label: "Sprint", href: "/dashboard", Icon: Target  },
  { id: "you",    label: "You",    href: "/profile",   Icon: User    },
] as const;

// Full-screen routes that shouldn't show the nav
const HIDDEN: string[] = ["/lens/", "/commit/", "/opportunity/", "/checkin/"];

export function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN.some((p) => pathname.includes(p))) return null;

  const activeId =
    TABS.find(
      ({ href }) => pathname === href || (href !== "/feed" && pathname.startsWith(href))
    )?.id ?? "today";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(10,10,12,0.78)",
        backdropFilter: "blur(40px) saturate(140%)",
        WebkitBackdropFilter: "blur(40px) saturate(140%)",
        borderTop: "1px solid rgba(245,242,237,0.05)",
      }}
    >
      {/* Top hairline highlight (premium glass effect) */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 10%, rgba(245,242,237,0.10) 50%, transparent 90%)",
        }}
      />

      <div className="flex justify-around items-center px-2 pt-2 pb-7 max-w-md mx-auto">
        {TABS.map(({ id, label, href, Icon }) => {
          const isActive = activeId === id;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center justify-center gap-[5px] px-7 py-2"
            >
              {/* Pill backdrop — shared layout animates between tabs */}
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  transition={{ duration: 0.45, ease: SPRING }}
                  className="absolute inset-0 rounded-[16px]"
                  style={{
                    background: "rgba(245,242,237,0.05)",
                    border: "1px solid rgba(245,242,237,0.08)",
                    boxShadow:
                      "0 -8px 24px rgba(61,184,122,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                />
              )}

              {/* Icon with subtle lift */}
              <motion.div
                animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.04 : 1 }}
                transition={{ duration: 0.3, ease: SPRING }}
                className="relative z-10"
              >
                <Icon
                  size={21}
                  color={isActive ? "#F5F2ED" : "#3A3A42"}
                  strokeWidth={isActive ? 1.9 : 1.5}
                />
              </motion.div>
              <span
                className="relative z-10 text-[10px] tracking-[0.01em] transition-colors"
                style={{
                  color: isActive ? "#F5F2ED" : "#3A3A42",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {label}
              </span>

              {/* Tiny green accent dot under active label */}
              {isActive && (
                <motion.div
                  layoutId="nav-dot"
                  transition={{ duration: 0.45, ease: SPRING }}
                  className="absolute bottom-[10px] w-1 h-1 rounded-full z-10"
                  style={{
                    background: "#3DB87A",
                    boxShadow: "0 0 6px rgba(61,184,122,0.6)",
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
