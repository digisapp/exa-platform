import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ username: string }>;
}

// Redirect old /models/username URLs to clean /username URLs
export default async function ModelProfileRedirect({ params }: Props) {
  const { username } = await params;
  redirect(`/${username}`);
}
