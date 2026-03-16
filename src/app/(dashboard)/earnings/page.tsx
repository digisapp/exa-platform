import { redirect } from "next/navigation";

// Earnings page consolidated into /wallet — redirect for backwards compatibility
export default function EarningsPage() {
  redirect("/wallet");
}
