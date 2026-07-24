import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { sendMediaBlastEmail } from "@/lib/email";

// Mass email to the media roster (media_contacts) — announce upcoming tour
// stops/events. Client-driven batching, same pattern as /api/admin/gigs/
// mass-email: GET fetches the recipient list, then the client POSTs batches.
// SMS is intentionally NOT wired up — Twilio isn't configured in Vercel, so
// any send would silently no-op. Phones are collected for when it is.

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", user.id)
    .single();
  if (!actor || actor.type !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase, user };
}

// GET — recipient list. audience=roster (full media roster, minus opt-outs)
// or audience=tour (only people who applied as media to a tour stop).
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const audience = new URL(request.url).searchParams.get("audience") || "roster";
    const adminClient: any = createServiceRoleClient();

    let recipients: { id: string | null; name: string; email: string }[] = [];

    if (audience === "tour") {
      const { data } = await adminClient
        .from("tour_applications")
        .select("name, email")
        .eq("role", "media")
        .neq("status", "declined")
        .order("created_at", { ascending: false });
      const seen = new Set<string>();
      for (const row of data || []) {
        const email = (row.email || "").toLowerCase();
        if (!email || seen.has(email)) continue;
        seen.add(email);
        recipients.push({ id: null, name: row.name, email });
      }
      // Resolve roster ids so sends still stamp last_contacted_at
      if (recipients.length > 0) {
        const { data: contacts } = await adminClient
          .from("media_contacts")
          .select("id, email, status")
          .in("email", recipients.map((r) => r.email));
        const byEmail = new Map(
          (contacts || []).map((c: any) => [(c.email || "").toLowerCase(), c])
        );
        recipients = recipients
          .filter((r) => {
            const c: any = byEmail.get(r.email);
            return !c || c.status !== "do_not_contact";
          })
          .map((r) => {
            const c: any = byEmail.get(r.email);
            return { ...r, id: c?.id ?? null };
          });
      }
    } else {
      const { data } = await adminClient
        .from("media_contacts")
        .select("id, name, email")
        .not("email", "is", null)
        .not("status", "in", '("do_not_contact","not_interested")')
        .order("created_at", { ascending: false });
      recipients = (data || [])
        .filter((c: any) => c.email)
        .map((c: any) => ({ id: c.id, name: c.name, email: c.email.toLowerCase() }));
    }

    return NextResponse.json({ recipients });
  } catch (error) {
    logger.error("Media blast GET error", error);
    return NextResponse.json({ error: "Failed to fetch recipients" }, { status: 500 });
  }
}

const batchSchema = z.object({
  recipients: z
    .array(
      z.object({
        id: z.string().uuid().nullable().optional(),
        name: z.string().max(200),
        email: z.string().email().max(200),
      })
    )
    .min(1)
    .max(500),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
});

// POST — send one batch (≤10 emails; the client loops over the full list)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const parsed = batchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { subject, message } = parsed.data;
    const batch = parsed.data.recipients.slice(0, 10);
    let emailsSent = 0;
    let emailsSkipped = 0;
    let emailsFailed = 0;
    const sentContactIds: string[] = [];
    const failedDetails: { email: string; reason: string }[] = [];

    async function sendOne(r: { id?: string | null; name: string; email: string }): Promise<void> {
      try {
        const result = await sendMediaBlastEmail({
          to: r.email,
          name: r.name || "there",
          subject,
          message,
        });
        if (result.success) {
          if ((result as any).skipped) {
            emailsSkipped++;
          } else {
            emailsSent++;
            if (r.id) sentContactIds.push(r.id);
          }
        } else {
          emailsFailed++;
          const reason =
            (result as any).error?.message || JSON.stringify((result as any).error) || "Unknown error";
          failedDetails.push({ email: r.email, reason });
        }
      } catch (err: any) {
        emailsFailed++;
        failedDetails.push({ email: r.email, reason: err?.message || String(err) });
      }
    }

    // Process 2 at a time with 1.1s delay (Resend rate limit)
    for (let i = 0; i < batch.length; i += 2) {
      const pair = batch.slice(i, i + 2);
      await Promise.all(pair.map(sendOne));
      if (i + 2 < batch.length) {
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    }

    // Stamp the roster so outreach history stays accurate
    if (sentContactIds.length > 0) {
      const adminClient: any = createServiceRoleClient();
      await adminClient
        .from("media_contacts")
        .update({ last_contacted_at: new Date().toISOString() })
        .in("id", sentContactIds);
      await adminClient
        .from("media_contacts")
        .update({ status: "contacted" })
        .in("id", sentContactIds)
        .eq("status", "new");
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      emailsSkipped,
      emailsFailed,
      batchSize: batch.length,
      failedDetails: failedDetails.length > 0 ? failedDetails : undefined,
    });
  } catch (error) {
    logger.error("Media blast POST error", error);
    return NextResponse.json({ error: "Failed to send batch" }, { status: 500 });
  }
}
