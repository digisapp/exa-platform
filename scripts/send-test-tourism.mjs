import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const brandName = "Your Tourism Board";
const contactName = "Miriam";

const subject = "Influencer Partnership Opportunity";

const bodyText = `Hi ${contactName},

I'm Nathan, COO of EXA Models — a platform with 500+ vetted U.S.-based content creators producing high-engagement content across Instagram, TikTok, and YouTube.

Our creators specialize in destination storytelling that drives real results — bookings, traffic, and brand exposure.

WHAT WE OFFER

We can bring creators directly to your destination to produce high-quality content tailored to your marketing goals. Whether you need one creator for a focused campaign or a full group for a large-scale push, we match the right talent to your audience.

CREATOR DELIVERABLES CAN INCLUDE
• Instagram Reels, TikToks, Stories, and YouTube features
• Destination itineraries highlighting hotels, restaurants, and experiences
• High-quality licensed content for your marketing channels
• Detailed performance reporting on reach and engagement

HOW IT WORKS

You share your campaign goals

We match creators aligned with your destination and audience

Our team handles travel coordination, content direction, and publishing

You receive premium content and measurable exposure

I'd love to learn what ${brandName} is looking to achieve and see if this could be a fit.

Would you be available for a quick call sometime this week or next?

Best,
Nathan`;

const htmlBody = bodyText
  .split("\n")
  .map((line) => {
    const t = line.trim();
    if (t === "") return '<tr><td style="height:12px;"></td></tr>';
    const escaped = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (t.startsWith("\u2022") || t.startsWith("-")) {
      return `<tr><td style="padding:5px 0 5px 20px;color:#94a3b8;font-size:14px;line-height:1.6;"><span style="color:#38bdf8;margin-right:8px;">&#10022;</span>${escaped.replace(/^[\u2022\-]\s*/, "")}</td></tr>`;
    }
    if (t === t.toUpperCase() && t.length > 3 && !t.includes(".")) {
      return `<tr><td style="padding:20px 0 8px;color:#38bdf8;font-size:11px;font-weight:700;letter-spacing:3px;">${escaped}</td></tr>`;
    }
    return `<tr><td style="padding:3px 0;color:#cbd5e1;font-size:15px;line-height:1.75;">${escaped}</td></tr>`;
  })
  .join("\n");

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background-color:#020817;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#020817;padding:40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;"><tr><td style="background:linear-gradient(90deg,#0ea5e9 0%,#6366f1 50%,#0ea5e9 100%);height:4px;border-radius:4px 4px 0 0;"></td></tr><tr><td style="background:linear-gradient(145deg,#0c1a2e 0%,#0f172a 60%,#0c1a2e 100%);padding:44px 40px 0;"><h1 style="margin:0;color:#f8fafc;font-size:30px;font-weight:800;line-height:1.2;">Influencer Partnership</h1></td></tr><tr><td style="background:#0f172a;padding:20px 40px 4px;"><table width="100%" cellpadding="0" cellspacing="0">${htmlBody}</table></td></tr><tr><td style="background:#0f172a;padding:24px 40px 48px;text-align:center;"><a href="https://www.examodels.com/travel" style="display:inline-block;padding:15px 40px;background:linear-gradient(90deg,#0ea5e9,#6366f1);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:50px;letter-spacing:0.5px;">View EXA Travel &rarr;</a><p style="margin:16px 0 0;color:#334155;font-size:13px;">Simply reply to this email to start the conversation.</p></td></tr><tr><td style="background:#030d1a;padding:22px 40px;border-top:1px solid #0f1f33;border-radius:0 0 16px 16px;text-align:center;"><p style="margin:0 0 3px;color:#1e3a5f;font-size:12px;">EXA Models &nbsp;&middot;&nbsp; nathan@examodels.com</p><p style="margin:0;color:#1e3a5f;font-size:12px;">www.examodels.com/travel</p></td></tr></table></td></tr></table></body></html>`;

console.log("Sending test tourism email to miriam@examodels.com...");
const { data, error } = await resend.emails.send({
  from: "EXA Travel <nathan@examodels.com>",
  to: "miriam@examodels.com",
  subject,
  html,
});

if (error) {
  console.error("Failed:", error);
  process.exit(1);
}
console.log("Sent successfully! Message ID:", data?.id);
