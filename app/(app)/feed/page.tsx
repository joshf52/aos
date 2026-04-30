import { createClient } from "@/lib/supabase/server";
import { FeedContent } from "./feed-content";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(): string {
  const d = new Date();
  return `${DAYS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export default async function FeedPage() {
  const supabase = createClient();
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("*")
    .eq("is_active", true)
    .order("confidence", { ascending: false })
    .limit(5);

  return (
    <FeedContent
      opportunities={opportunities ?? []}
      dateLabel={formatDate()}
    />
  );
}
