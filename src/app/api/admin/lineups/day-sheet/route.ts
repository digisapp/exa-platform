import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

// GET /api/admin/lineups/day-sheet?event_id=xxx — full event schedule
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("event_id");
  if (!eventId) {
    return NextResponse.json({ error: "event_id required" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, year")
    .eq("id", eventId)
    .single();

  const { data: shows, error } = await supabase
    .from("event_shows")
    .select(`
      *,
      designers:event_show_designers(
        id, designer_name, designer_order,
        models:event_show_models(
          id, model_id, walk_order, outfit_notes, status,
          model:models(id, username, first_name, last_name, height, bust, hips, shoe_size, instagram_url)
        )
      )
    `)
    .eq("event_id", eventId)
    .order("show_date", { ascending: true })
    .order("show_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group shows by date
  const days: Record<string, any[]> = {};
  (shows || []).forEach((s: any) => {
    const key = s.show_date || "Unscheduled";
    if (!days[key]) days[key] = [];
    s.designers = (s.designers || []).sort((a: any, b: any) => a.designer_order - b.designer_order);
    s.designers.forEach((d: any) => {
      d.models = (d.models || []).sort((a: any, b: any) => a.walk_order - b.walk_order);
    });
    days[key].push(s);
  });

  const sortedDays = Object.entries(days).sort(([a], [b]) => a.localeCompare(b));
  const eventName = event?.name || "Event";
  const eventYear = event?.year || "";

  const allModels = new Set<string>();
  let totalSlots = 0;
  let totalDesigners = 0;
  (shows || []).forEach((s: any) => {
    (s.designers || []).forEach((d: any) => {
      totalDesigners++;
      (d.models || []).forEach((m: any) => {
        allModels.add(m.model_id);
        totalSlots++;
      });
    });
  });

  const dayBlocks = sortedDays.map(([date, dayShows]) => {
    const dateLabel = date === "Unscheduled" ? "Unscheduled"
      : new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    const showBlocks = dayShows.map((s: any) => {
      const designerBlocks = (s.designers || []).map((d: any) => {
        const rows = (d.models || []).map((lm: any, i: number) => {
          const m = lm.model;
          const measurements = [m?.bust, m?.hips].filter(Boolean).join(" / ") || "\u2014";
          const ig = m?.instagram_url
            ? m.instagram_url.replace(/https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "")
            : "\u2014";
          return `<tr>
            <td class="walk-num">${i + 1}</td>
            <td><strong>${m?.first_name || ""} ${m?.last_name || ""}</strong><br><span class="muted">@${m?.username || "\u2014"}</span></td>
            <td>${m?.height || "\u2014"}</td>
            <td>${measurements}</td>
            <td>${m?.shoe_size || "\u2014"}</td>
            <td>${ig}</td>
            <td class="notes">${lm.outfit_notes || ""}</td>
          </tr>`;
        }).join("");

        return `<div class="designer-block">
          <h4>${d.designer_name} <span class="model-count">${d.models?.length || 0} models</span></h4>
          <table class="models-table">
            <thead><tr><th style="width:30px">#</th><th>Model</th><th>Height</th><th>Measurements</th><th>Shoe</th><th>IG</th><th>Notes</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
      }).join("");

      const statusBadge = s.status === "confirmed" ? '<span class="badge confirmed">CONFIRMED</span>'
        : s.status === "completed" ? '<span class="badge completed">COMPLETED</span>'
        : '<span class="badge draft">DRAFT</span>';

      return `<div class="show-block">
        <h3>${s.name} ${statusBadge}</h3>
        <p class="show-meta">${s.show_time || ""} \u00b7 ${s.designers?.length || 0} designers \u00b7 ${s.designers?.reduce((sum: number, d: any) => sum + (d.models?.length || 0), 0)} models</p>
        ${designerBlocks}
      </div>`;
    }).join("");

    return `<div class="day-section">
      <h2 class="day-header">${dateLabel}</h2>
      ${showBlocks}
    </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${eventName} ${eventYear} - Full Schedule</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; padding: 32px; max-width: 1000px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #111; padding-bottom: 14px; }
  .header h1 { font-size: 30px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }
  .header p { font-size: 13px; color: #666; margin-top: 4px; }
  .stats { display: flex; justify-content: center; gap: 28px; margin-top: 8px; font-size: 12px; color: #888; }
  .day-section { margin-bottom: 28px; }
  .day-header { font-size: 18px; font-weight: 700; border-bottom: 2px solid #333; padding-bottom: 4px; margin-bottom: 12px; }
  .show-block { margin-bottom: 20px; padding-left: 12px; border-left: 3px solid #ddd; }
  .show-block h3 { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
  .show-meta { font-size: 11px; color: #888; margin-bottom: 10px; }
  .badge { font-size: 9px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
  .badge.confirmed { background: #dcfce7; color: #166534; }
  .badge.completed { background: #dbeafe; color: #1e40af; }
  .badge.draft { background: #fef9c3; color: #854d0e; }
  .designer-block { margin-bottom: 14px; page-break-inside: avoid; }
  .designer-block h4 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .model-count { font-weight: 400; color: #888; font-size: 11px; text-transform: none; letter-spacing: 0; }
  .models-table { width: 100%; border-collapse: collapse; }
  .models-table th { text-align: left; padding: 4px 6px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; border-bottom: 1px solid #ddd; }
  .models-table td { padding: 5px 6px; border-bottom: 1px solid #eee; font-size: 11px; }
  .walk-num { font-weight: 700; text-align: center; color: #444; }
  .muted { color: #999; font-size: 10px; }
  .notes { font-style: italic; color: #666; font-size: 10px; }
  .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #bbb; border-top: 1px solid #eee; padding-top: 10px; }
  @media print { body { padding: 16px; } .show-block { page-break-inside: avoid; } }
</style></head>
<body>
  <div class="header">
    <h1>${eventName} ${eventYear}</h1>
    <p>Full Show Schedule</p>
    <div class="stats">
      <span>${shows?.length || 0} shows</span>
      <span>${totalDesigners} designers</span>
      <span>${allModels.size} unique models</span>
      <span>${totalSlots} total walk slots</span>
    </div>
  </div>
  ${dayBlocks}
  <div class="footer">Generated by EXA Platform \u00b7 ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="schedule-${eventName.replace(/\s+/g, "-").toLowerCase()}.html"`,
    },
  });
}
