import OpenAI from "openai";
import { Resend } from "resend";

const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

export interface EmailClassification {
  category: string;
  confidence: number;
  summary: string;
  draftHtml: string;
  draftText: string;
  autoSendable: boolean;
}

const SYSTEM_PROMPT = `You are the AI email assistant for EXA Models — a creator-to-fan marketplace and talent management platform. EXA Models connects models/influencers with brands and fans through content monetization, professional bookings, events, and education.

Your job: Read inbound emails, classify them, summarize them, and draft professional replies.

## About EXA Models
- Platform for models, influencers, and content creators
- Services: professional bookings (photoshoots, promo, events), content monetization (PPV, tips, paid messaging), brand partnerships, travel campaigns
- EXA Beauty Academy: 8-week runway makeup certification ($1,995 or 4x $499)
- Coaching programs available
- Coin system: 1 coin = $0.10 USD
- Shows & events: Miami Swim Week, NYC Fashion Week, Art Basel
- Models set their own rates for bookings
- Website: www.examodels.com

## Email Guidelines
- Be warm, professional, and on-brand (luxury fashion/modeling industry tone)
- Sign emails as "EXA Models Team"
- Keep replies concise but helpful
- For booking inquiries: direct them to the model's profile page or explain how bookings work
- For model applications: thank them and direct to www.examodels.com/signup
- For brand partnerships: express interest and ask for more details about their needs
- For support issues: acknowledge the issue and assure them it will be resolved
- For spam/irrelevant: still be polite but brief
- Never make up specific pricing, availability, or promises you can't keep
- When unsure, let them know the team will follow up with specific details

## Response Format
Reply with valid JSON only (no markdown, no code fences):
{
  "category": "one of: booking_inquiry, model_application, brand_partnership, support, billing, content_question, event_inquiry, academy_inquiry, feedback, personal, spam, other",
  "confidence": 0.0 to 1.0,
  "summary": "1-2 sentence summary of the email for admin review",
  "draftText": "plain text reply",
  "draftHtml": "HTML reply with basic formatting (paragraphs, line breaks)",
  "autoSendable": true/false (true only for simple acknowledgments where you're very confident)
}`;

export async function classifyAndDraftReply(email: {
  fromEmail: string;
  fromName: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  linkedActorType: string | null;
}): Promise<EmailClassification> {
  const emailContent = email.bodyText || stripHtml(email.bodyHtml || "") || "(empty body)";

  const userPrompt = `From: ${email.fromName} <${email.fromEmail}>
Subject: ${email.subject}
${email.linkedActorType ? `Platform user type: ${email.linkedActorType}` : "Not a registered platform user"}

Body:
${emailContent.slice(0, 3000)}`;

  try {
    const response = await xai.chat.completions.create({
      model: "grok-3-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty AI response");

    // Parse JSON — handle potential markdown fences
    const jsonStr = content.replace(/^```(?:json)?\n?/g, "").replace(/\n?```$/g, "").trim();
    const result = JSON.parse(jsonStr);

    return {
      category: result.category || "other",
      confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
      summary: result.summary || "No summary available",
      draftHtml: result.draftHtml || `<p>${escapeHtml(result.draftText || "")}</p>`,
      draftText: result.draftText || "",
      autoSendable: result.autoSendable === true && result.confidence >= 0.9,
    };
  } catch (error) {
    console.error("AI email classification failed:", error);
    return {
      category: "other",
      confidence: 0,
      summary: "AI processing failed — manual review required",
      draftHtml: "",
      draftText: "",
      autoSendable: false,
    };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Auto-send categories that are safe for automated replies
const AUTO_SEND_CATEGORIES = [
  "model_application",
  "booking_inquiry",
  "event_inquiry",
  "academy_inquiry",
];

/**
 * Send an AI-drafted reply automatically via Resend
 * Only sends if category is in the safe list and confidence is high
 */
export async function sendAutoReply({
  emailId,
  toEmail,
  subject,
  draftHtml,
  draftText,
  category,
  confidence,
  supabaseAdmin,
}: {
  emailId: string;
  toEmail: string;
  subject: string;
  draftHtml: string;
  draftText: string;
  category: string;
  confidence: number;
  supabaseAdmin: any;
}): Promise<boolean> {
  // Safety checks
  if (!AUTO_SEND_CATEGORIES.includes(category)) return false;
  if (confidence < 0.85) return false;
  if (!draftText || !draftHtml) return false;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

    const { data: resendResponse, error } = await resend.emails.send({
      from: "EXA Models <hello@examodels.com>",
      to: [toEmail],
      subject: replySubject,
      html: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #333;">${draftHtml}</div>`,
      text: draftText,
      replyTo: "hello@inbound.examodels.com",
    });

    if (error) {
      console.error("Auto-reply send failed:", error);
      return false;
    }

    // Store the outbound reply
    await supabaseAdmin.from("emails").insert({
      direction: "outbound",
      thread_id: emailId,
      resend_message_id: resendResponse?.id || null,
      from_email: "hello@examodels.com",
      from_name: "EXA Models",
      to_email: toEmail,
      subject: replySubject,
      body_html: draftHtml,
      body_text: draftText,
      status: "sent",
      metadata: { auto_sent: true, ai_category: category, ai_confidence: confidence },
    });

    // Mark inbound email as replied
    await supabaseAdmin.from("emails")
      .update({ status: "replied", replied_at: new Date().toISOString() })
      .eq("id", emailId)
      .eq("direction", "inbound");

    console.log(`Auto-replied to ${toEmail} (category: ${category}, confidence: ${confidence})`);
    return true;
  } catch (err) {
    console.error("Auto-reply error:", err);
    return false;
  }
}
