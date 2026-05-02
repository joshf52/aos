"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, Target, User } from "lucide-react";

const SPRING = [0.22, 1, 0.36, 1] as const;

const TABS = [
  { label: "Today",  href: "/feed",      Icon: Compass },
  { label: "Sprint", href: "/dashboard", Icon: Target  },
  { label: "You",    href: "/profile",   Icon: User    },
] as const;

// Full-screen routes that shouldn't show the nav
const HIDDEN: string[] = ["/lens/", "/commit/", "/opportunity/", "/checkin/"];

export function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN.some((p) => pathname.includes(p))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(10,10,12,0.82)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        borderTop: "1px solid rgba(245,242,237,0.05)",
      }}
    >
      <div className="flex justify-around px-2 pt-2 pb-7">
        {TABS.map(({ label, href, Icon }) => {
          const isActive =
            pathname === href || (href !== "/feed" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center gap-[5px] px-7 py-1"
            >
              {/* Active top-line indicator */}
              <motion.div
                className="absolute -top-2 left-1/2 -translate-x-1/2 h-[2px] rounded-full"
                animate={{ width: isActive ? 20 : 0, opacity: isActive ? 1 : 0 }}
                transition={{ duration: 0.35, ease: SPRING }}
                style={{ background: "#3DB87A" }}
              />
              <motion.div
                animate={{ y: isActive ? -1 : 0 }}
                transition={{ duration: 0.3, ease: SPRING }}
              >
                <Icon
                  size={22}
                  color={isActive ? "#F5F2ED" : "#3A3A42"}
                  strokeWidth={isActive ? 1.75 : 1.5}
                />
              </motion.div>
              <span
                className="text-[10px] tracking-[0.01em]"
                style={{ color: isActive ? "#F5F2ED" : "#3A3A42", fontWeight: isActive ? 600 : 400 }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
