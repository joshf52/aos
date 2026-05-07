import { BottomNav } from "./bottom-nav";
import { GrainOverlay } from "@/components/ui/grain-overlay";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GrainOverlay />
      {children}
      <BottomNav />
    </>
  );
}
