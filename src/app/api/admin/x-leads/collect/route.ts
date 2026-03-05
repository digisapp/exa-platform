import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

const SWIMWEAR_QUERIES = [
  "swimwear collection 2026",
  "resort wear collection launch",
  "#miamiswimweek",
  "miami swim week brand",
  "bikini brand new collection",
  "resortwear campaign 2026",
];

const HOTEL_QUERIES = [
  "hotel influencer program",
  "resort content creator stay",
  "hotel looking for influencers",
  "influencer hotel collab",
  "resort model photoshoot",
  "luxury hotel ambassador program",
];

interface XResult {
  tweet_id?: string;
  handle?: string;
  name?: string;
  tweet_text?: string;
  tweet_url?: string;
  followers_count?: number;
}

async function searchXForQuery(query: string): Promise<{ results: XResult[]; rawContent: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY not configured");

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-3-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a lead research assistant. Search X (Twitter) for the given query and return results as a JSON array ONLY — no explanation, no markdown, just the raw JSON array. Each item: { tweet_id, handle, name, tweet_text, tweet_url, followers_count }. Brand/business accounts only. If nothing found, return [].",
        },
        {
          role: "user",
          content: `Search X for: "${query}". Return up to 8 brand/business accounts posting about this topic as a JSON array.`,
        },
      ],
      tools: [{ type: "x_search" }],
      tool_choice: "required",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`xAI API error for query "${query}":`, text);
    return { results: [], rawContent: text };
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message;
  const content = message?.content ?? "";
  const toolCalls = message?.tool_calls ?? [];

  // Full debug dump for first call
  const debugDump = JSON.stringify({ content: content.slice(0, 800), toolCalls: toolCalls.slice(0, 2) });
  console.log(`xAI full response for "${query}":`, debugDump);

  const rawContent = debugDump.slice(0, 600);

  // Extract JSON array from the response content
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { results: [], rawContent };
    const parsed = JSON.parse(jsonMatch[0]);
    return { results: Array.isArray(parsed) ? parsed : [], rawContent };
  } catch {
    console.error(`Failed to parse xAI response for query "${query}":`, content);
    return { results: [], rawContent };
  }
}

// POST /api/admin/x-leads/collect
// Body: { category: 'swimwear_brand' | 'hotel_resort' | 'all' }
export async function POST(request: NextRequest) {
  // Admin auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", user.id)
    .single() as { data: { type: string } | null };
  if (actor?.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const category: string = body.category ?? "all";

  const db = createServiceRoleClient() as any;

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];
  const debugSamples: string[] = [];

  const runCategory = async (cat: "swimwear_brand" | "hotel_resort", queries: string[]) => {
    for (const query of queries) {
      try {
        const { results, rawContent } = await searchXForQuery(query);

        // Capture first raw response for debugging
        if (debugSamples.length === 0 && rawContent) {
          debugSamples.push(`Query: "${query}" → ${rawContent}`);
        }

        for (const r of results) {
          if (!r.tweet_text) continue;

          const row = {
            category: cat,
            brand_name: r.name ?? null,
            x_handle: r.handle ?? null,
            tweet_text: r.tweet_text,
            tweet_url: r.tweet_url ?? null,
            tweet_id: r.tweet_id ?? null,
            author_followers: r.followers_count ?? null,
            search_query: query,
          };

          const { error } = await db.from("x_leads").insert(row);

          if (error) {
            if (error.code === "23505") {
              skipped++;
            } else {
              errors.push(`Insert error for ${r.handle}: ${error.message}`);
            }
          } else {
            inserted++;
          }
        }
      } catch (err: any) {
        errors.push(`Query "${query}" failed: ${err.message}`);
      }

      await new Promise((res) => setTimeout(res, 500));
    }
  };

  if (category === "all" || category === "swimwear_brand") {
    await runCategory("swimwear_brand", SWIMWEAR_QUERIES);
  }
  if (category === "all" || category === "hotel_resort") {
    await runCategory("hotel_resort", HOTEL_QUERIES);
  }

  return NextResponse.json({ inserted, skipped, errors, debugSamples });
}
