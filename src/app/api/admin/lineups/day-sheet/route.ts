import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

// GET /api/admin/lineups/day-sheet?event_id=xxx — full schedule PDF with all designers
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("event_id");
  if (!eventId) {
    return NextResponse.json({ error: "event_id required" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  // Fetch event
  const { data: event } = await supabase
    .from("events")
    .select("id, name, year, start_date, end_date")
    .eq("id", eventId)
    .single();

  // Fetch all lineups with models
  const { data: lineups, error } = await supabase
    .from("show_lineups")
    .select(`
      *,
      designer:designers(id, first_name, last_name, brand_name),
      models:show_lineup_models(
        id,
        model_id,
        walk_order,
        outfit_notes,
        status,
        model:models(id, username, first_name, last_name, profile_photo_url, height, bust, hips, dress_size, shoe_size, instagram_url)
      )
    `)
    .eq("event_id", eventId)
    .order("show_date", { ascending: true })
    .order("show_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by date
  const days: Record<string, any[]> = {};
  (lineups || []).forEach((l: any) => {
    const key = l.show_date || "Unscheduled";
    if (!days[key]) days[key] = [];
    l.models = (l.models || []).sort((a: any, b: any) => a.walk_order - b.walk_order);
    days[key].push(l);
  });

  const sortedDays = Object.entries(days).sort(([a], [b]) => a.localeCompare(b));

  const eventName = event?.name || "Event";
  const eventYear = event?.year || "";
  const totalLineups = lineups?.length || 0;
  const totalSlots = (lineups || []).reduce((s: number, l: any) => s + (l.models?.length || 0), 0);
  const uniqueModels = new Set((lineups || []).flatMap((l: any) => (l.models || []).map((m: any) => m.model_id))).size;

  const dayBlocks = sortedDays.map(([date, dayLineups]) => {
    const dateLabel = date === "Unscheduled"
      ? "Unscheduled"
      : new Date(date + "T00:00:00").toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });

    const lineupBlocks = dayLineups.map((l: any) => {
      const designer = l.designer;
      const designerName = designer?.brand_name || `${designer?.first_name || ""} ${designer?.last_name || ""}`;
      const modelRows = (l.models || []).map((lm: any, i: number) => {
        const m = lm.model;
        const measurements = [m?.bust, m?.hips].filter(Boolean).join(" / ") || "\u2014";
        const ig = m?.instagram_url
          ? m.instagram_url.replace(/https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "")
          : "\u2014";
        return `
          <tr>
            <td class="walk-num">${i + 1}</td>
            <td><strong>${m?.first_name || ""} ${m?.last_name || ""}</strong><br><span class="muted">@${m?.username || "\u2014"}</span></td>
            <td>${m?.height || "\u2014"}</td>
            <td>${measurements}</td>
            <td>${m?.shoe_size || "\u2014"}</td>
            <td>${ig}</td>
            <td class="notes">${lm.outfit_notes || ""}</td>
          </tr>`;
      }).join("");

      const statusBadge = l.status === "confirmed"
        ? '<span class="badge confirmed">CONFIRMED</span>'
        : l.status === "completed"
        ? '<span class="badge completed">COMPLETED</span>'
        : '<span class="badge draft">DRAFT</span>';

      return `
        <div class="lineup-block">
          <div class="lineup-header">
            <h3>${designerName} ${statusBadge}</h3>
            <p>${l.name}${l.show_time ? " \u00b7 " + l.show_time : ""} \u00b7 ${l.models?.length || 0} models</p>
          </div>
          <table class="models-table">
            <thead>
              <tr>
                <th style="width:35px">#</th>
                <th>Model</th>
                <th>Height</th>
                <th>Measurements</th>
                <th>Shoe</th>
                <th>Instagram</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>${modelRows}</tbody>
          </table>
        </div>`;
    }).join("");

    return `
      <div class="day-section">
        <h2 class="day-header">${dateLabel}</h2>
        <p class="day-meta">${dayLineups.length} show${dayLineups.length > 1 ? "s" : ""} \u00b7 ${dayLineups.reduce((s: number, l: any) => s + (l.models?.length || 0), 0)} model slots</p>
        ${lineupBlocks}
      </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${eventName} ${eventYear} - Full Schedule</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; padding: 32px; max-width: 1000px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 28px; border-bottom: 3px solid #111; padding-bottom: 16px; }
    .header h1 { font-size: 32px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }
    .header p { font-size: 14px; color: #666; margin-top: 6px; }
    .stats { display: flex; justify-content: center; gap: 32px; margin-top: 10px; font-size: 13px; color: #888; }
    .day-section { margin-bottom: 32px; }
    .day-header { font-size: 20px; font-weight: 700; border-bottom: 2px solid #333; padding-bottom: 6px; margin-bottom: 4px; }
    .day-meta { font-size: 12px; color: #888; margin-bottom: 16px; }
    .lineup-block { margin-bottom: 24px; page-break-inside: avoid; }
    .lineup-header { margin-bottom: 8px; }
    .lineup-header h3 { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 8px; }
    .lineup-header p { font-size: 12px; color: #666; }
    .badge { font-size: 9px; padding: 2px 8px; border-radius: 4px; font-weight: 600; letter-spacing: 0.5px; }
    .badge.confirmed { background: #dcfce7; color: #166534; }
    .badge.completed { background: #dbeafe; color: #1e40af; }
    .badge.draft { background: #fef9c3; color: #854d0e; }
    .models-table { width: 100%; border-collapse: collapse; }
    .models-table th { text-align: left; padding: 5px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; border-bottom: 1px solid #ddd; }
    .models-table td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 12px; vertical-align: middle; }
    .walk-num { font-weight: 700; text-align: center; color: #444; }
    .muted { color: #999; font-size: 11px; }
    .notes { font-style: italic; color: #666; font-size: 11px; }
    .footer { margin-top: 28px; text-align: center; font-size: 10px; color: #bbb; border-top: 1px solid #eee; padding-top: 12px; }
    @media print { body { padding: 16px; } .day-section { page-break-before: auto; } .lineup-block { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${eventName} ${eventYear}</h1>
    <p>Full Show Schedule</p>
    <div class="stats">
      <span>${totalLineups} designers</span>
      <span>${uniqueModels} unique models</span>
      <span>${totalSlots} total walk slots</span>
    </div>
  </div>

  ${dayBlocks}

  <div class="footer">
    Generated by EXA Platform \u00b7 ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="full-schedule-${eventName.replace(/\s+/g, "-").toLowerCase()}.html"`,
    },
  });
}
