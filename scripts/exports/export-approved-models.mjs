import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { config } from "dotenv";

config({ path: "/Users/examodels/Desktop/exa-platform/.env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SINCE = "2026-01-01T00:00:00.000Z";

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function instagramUrl(model) {
  if (model.instagram_url) return model.instagram_url;
  const h = (model.instagram_name || "").trim().replace(/^@/, "");
  if (!h) return "";
  return `https://instagram.com/${h}`;
}

async function fetchApprovedApplicationsSince(since) {
  let all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("model_applications")
      .select("user_id, status, reviewed_at, phone, height, instagram_username")
      .eq("status", "approved")
      .gte("reviewed_at", since)
      .order("reviewed_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function fetchModelsByUserIds(userIds) {
  const map = {};
  const BATCH = 200;
  for (let i = 0; i < userIds.length; i += BATCH) {
    const slice = userIds.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from("models")
      .select(
        "id, user_id, first_name, last_name, username, email, phone, height, waist, hips, bust, instagram_name, instagram_url, instagram_followers, is_approved"
      )
      .in("user_id", slice);
    if (error) throw error;
    for (const m of data) map[m.user_id] = m;
  }
  return map;
}

async function main() {
  console.log(`Fetching approved model applications since ${SINCE}...`);
  const approvedApps = await fetchApprovedApplicationsSince(SINCE);
  console.log(`Approved applications since Jan 1 2026: ${approvedApps.length}`);

  const appByUser = {};
  for (const a of approvedApps) {
    const existing = appByUser[a.user_id];
    if (!existing || new Date(a.reviewed_at) > new Date(existing.reviewed_at)) {
      appByUser[a.user_id] = a;
    }
  }
  const userIds = Object.keys(appByUser);
  console.log(`Unique approved users: ${userIds.length}`);

  console.log("Fetching matching models...");
  const modelByUser = await fetchModelsByUserIds(userIds);
  console.log(`Models found: ${Object.keys(modelByUser).length}`);

  const rows = [];
  for (const uid of userIds) {
    const app = appByUser[uid];
    const m = modelByUser[uid];
    if (!m) continue;
    if (m.is_approved === false) continue;

    rows.push({
      name:
        [m.first_name, m.last_name].filter(Boolean).join(" ") ||
        m.username ||
        "",
      instagram_url: instagramUrl(m),
      instagram_followers: m.instagram_followers ?? 0,
      height: m.height || "",
      waist: m.waist || "",
      hips: m.hips || "",
      email: m.email || "",
      phone: m.phone || app.phone || "",
      approved_at: app.reviewed_at,
    });
  }

  rows.sort((a, b) => new Date(b.approved_at) - new Date(a.approved_at));

  const header = [
    "Name",
    "Instagram URL",
    "Instagram Followers",
    "Height",
    "Waist",
    "Hips",
    "Email",
    "Phone",
    "Approved At",
  ];

  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.name),
        csvEscape(r.instagram_url),
        csvEscape(r.instagram_followers),
        csvEscape(r.height),
        csvEscape(r.waist),
        csvEscape(r.hips),
        csvEscape(r.email),
        csvEscape(r.phone),
        csvEscape(
          r.approved_at
            ? new Date(r.approved_at).toISOString().split("T")[0]
            : ""
        ),
      ].join(",")
    );
  }

  const outPath = "/Users/examodels/Desktop/approved-models-since-2026-01-01.csv";
  writeFileSync(outPath, lines.join("\n") + "\n");
  console.log(`\nWrote ${rows.length} rows to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
