import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

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

async function searchXForQuery(query: string): Promise<XResult[]> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY not configured");

  // Use Responses API (/v1/responses) with x_search tool
  const response = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-4",
      input: `Search X for recent posts about: "${query}". Find up to 8 brand or business accounts posting about this topic. Return ONLY a valid JSON array with no other text. Each item: { tweet_id, handle, name, tweet_text, tweet_url, followers_count }. Brand/business accounts only. If nothing found, return [].`,
      tools: [{ type: "x_search" }],
    }),
  });

  if (!response.ok) {
    logger.error("xAI API error for query", undefined, { query, responseBody: await response.text() });
    return [];
  }

  const data = await response.json();

  // Responses API: output is an array of items; find the message text
  const outputItems: any[] = data?.output ?? [];
  let content = "";
  for (const item of outputItems) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const block of item.content) {
        if (block.type === "output_text") content += block.text;
      }
    }
  }

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    logger.error("Failed to parse xAI response for query", undefined, { query, content });
    return [];
  }
}

async function runCategory(
  db: any,
  cat: "swimwear_brand" | "hotel_resort",
  queries: string[]
): Promise<{ inserted: number; errors: string[] }> {
  let inserted = 0;
  const errors: string[] = [];

  for (const query of queries) {
    try {
      const results = await searchXForQuery(query);
      for (const r of results) {
        if (!r.tweet_text) continue;
        const { error } = await db.from("x_leads").insert({
          category: cat,
          brand_name: r.name ?? null,
          x_handle: r.handle ?? null,
          tweet_text: r.tweet_text,
          tweet_url: r.tweet_url ?? null,
          tweet_id: r.tweet_id ?? null,
          author_followers: r.followers_count ?? null,
          search_query: query,
        });
        if (error && error.code !== "23505") {
          errors.push(`${r.handle}: ${error.message}`);
        } else if (!error) {
          inserted++;
        }
      }
    } catch (err: any) {
      errors.push(`Query "${query}": ${err.message}`);
    }
    await new Promise((res) => setTimeout(res, 500));
  }

  return { inserted, errors };
}

// GET /api/cron/x-leads-collect
// Runs daily at 9 AM via Vercel cron
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createServiceRoleClient() as any;

    const [swimwear, hotels] = await Promise.all([
      runCategory(db, "swimwear_brand", SWIMWEAR_QUERIES),
      runCategory(db, "hotel_resort", HOTEL_QUERIES),
    ]);

    logger.info("x-leads-collect cron complete", { swimwearInserted: swimwear.inserted, hotelsInserted: hotels.inserted });

    return NextResponse.json({
      message: "X lead collection complete",
      swimwear_inserted: swimwear.inserted,
      hotels_inserted: hotels.inserted,
      errors: [...swimwear.errors, ...hotels.errors],
    });
  } catch (error: any) {
    logger.error("x-leads-collect cron error", error);
    return NextResponse.json({ error: "Lead collection failed" }, { status: 500 });
  }
}
