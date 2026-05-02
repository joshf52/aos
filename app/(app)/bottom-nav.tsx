"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Target, User } from "lucide-react";

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
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around pt-2 pb-7"
      style={{
        background: "rgba(10, 10, 12, 0.88)",
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
        borderTop: "1px solid var(--aos-border)",
      }}
    >
      {TABS.map(({ label, href, Icon }) => {
        const isActive =
          pathname === href ||
          (href !== "/feed" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-[3px] px-6 py-1"
          >
            <Icon
              size={22}
              color={isActive ? "#F5F2ED" : "#5A5650"}
              strokeWidth={isActive ? 2 : 1.5}
            />
            <span
              className="text-[10px] tracking-[-0.01em]"
              style={{
                color: isActive ? "#F5F2ED" : "#5A5650",
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
