import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const VALID_CATEGORIES = [
  "fashion", "lifestyle", "entertainment", "sports",
  "photography", "videography", "blog", "podcast",
  "news", "tv", "swimwear", "beauty", "other",
] as const;

const VALID_STATUSES = [
  "new", "contacted", "responded", "interested",
  "not_interested", "do_not_contact",
] as const;

const contactSchema = z.object({
  name: z.string().min(1).max(200),
  title: z.string().max(200).optional().nullable(),
  media_company: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  instagram_handle: z.string().max(100).optional().nullable(),
  website_url: z.string().url().optional().nullable().or(z.literal("")),
  category: z.enum(VALID_CATEGORIES).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(VALID_STATUSES).optional(),
  last_contacted_at: z.string().datetime().optional().nullable(),
});

async function getAdminClient(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };

  const { data: actor } = await (supabase as any)
    .from("actors")
    .select("type")
    .eq("user_id", user.id)
    .single() as { data: { type: string } | null };

  if (!actor || actor.type !== "admin") return { error: "Forbidden", status: 403 };

  return { adminClient: createServiceRoleClient() };
}

// GET - list all media contacts with optional search/filter
export async function GET(request: NextRequest) {
  const auth = await getAdminClient(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { adminClient } = auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";
  const category = searchParams.get("category") || "all";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (adminClient as any)
    .from("media_contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,media_company.ilike.%${search}%,email.ilike.%${search}%,instagram_handle.ilike.%${search}%`
    );
  }
  if (status !== "all") query = query.eq("status", status);
  if (category !== "all") query = query.eq("category", category);

  const { data, error } = await query.limit(500);

  if (error) {
    console.error("Media contacts fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }

  return NextResponse.json({ contacts: data || [] });
}

// POST - create a new media contact
export async function POST(request: NextRequest) {
  const auth = await getAdminClient(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { adminClient } = auth;

  const body = await request.json();
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminClient as any)
    .from("media_contacts")
    .insert({
      ...parsed.data,
      email: parsed.data.email || null,
      website_url: parsed.data.website_url || null,
      status: parsed.data.status || "new",
    })
    .select()
    .single();

  if (error) {
    console.error("Media contact create error:", error);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }

  return NextResponse.json({ contact: data });
}

// PATCH - update a media contact
export async function PATCH(request: NextRequest) {
  const auth = await getAdminClient(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { adminClient } = auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const body = await request.json();
  const parsed = contactSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminClient as any)
    .from("media_contacts")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Media contact update error:", error);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }

  return NextResponse.json({ contact: data });
}

// DELETE - delete a media contact
export async function DELETE(request: NextRequest) {
  const auth = await getAdminClient(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { adminClient } = auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("media_contacts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Media contact delete error:", error);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
