import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-auth";

export const POST = withAuth(
  async ({ request }) => {
    const revalidateSchema = z.object({ path: z.string().min(1, "path is required") });
    const parsed = revalidateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const { path } = parsed.data;

    revalidatePath(path);
    return NextResponse.json({ success: true, revalidated: path });
  },
  { requireType: "admin" }
);
