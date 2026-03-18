import { redirect } from "next/navigation";

export default function BrandOutreachPage() {
  redirect("/admin/crm?tab=brands");
}
