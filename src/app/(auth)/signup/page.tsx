import { redirect } from "next/navigation";

// The next.config.ts redirect (/signup → /apply, permanent) fires before
// routing ever reaches this file — kept as a defense-in-depth fallback.
export default function SignupPage() {
  redirect("/apply");
}
