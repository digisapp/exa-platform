import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import twilio from "twilio";

// Use service role for webhook (no user auth)
const supabase = createServiceRoleClient();

export async function POST(request: NextRequest) {
  try {
    // Verify Twilio signature
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error("TWILIO_AUTH_TOKEN not configured");
      return new NextResponse("Webhook not configured", { status: 500 });
    }

    const twilioSignature = request.headers.get("x-twilio-signature");
    if (!twilioSignature) {
      return new NextResponse("Missing signature", { status: 403 });
    }

    // Read form body as URLSearchParams for validation
    const bodyText = await request.text();
    const params: Record<string, string> = {};
    const searchParams = new URLSearchParams(bodyText);
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Build the full URL Twilio used to sign the request
    const url = request.url;

    const isValid = twilio.validateRequest(
      authToken,
      twilioSignature,
      url,
      params
    );

    if (!isValid) {
      console.error("Invalid Twilio signature");
      return new NextResponse("Invalid signature", { status: 403 });
    }

    const from = params.From;
    const body = params.Body;
    const messageSid = params.MessageSid;

    if (!from || !body) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Normalize the incoming phone number to match our format
    let normalizedPhone = from.replace(/\D/g, "");
    if (normalizedPhone.startsWith("1") && normalizedPhone.length === 11) {
      normalizedPhone = normalizedPhone.substring(1);
    }

    // Try to find the model by phone number
    const { data: model } = await supabase
      .from("models")
      .select("id, username, first_name, last_name, phone")
      .or(`phone.eq.${from},phone.eq.${normalizedPhone},phone.eq.+${from}`)
      .single();

    // Log the incoming message
    await supabase.from("sms_logs").insert({
      model_id: model?.id || null,
      phone_number: from,
      message: body,
      direction: "inbound",
      status: "received",
      twilio_sid: messageSid,
    });

    // Parse common responses
    const normalizedBody = body.trim().toUpperCase();
    let responseType: string | null = null;

    if (["YES", "Y", "1", "CONFIRM", "OK", "INTERESTED"].includes(normalizedBody)) {
      responseType = "positive";
    } else if (["NO", "N", "2", "PASS", "DECLINE", "NOT INTERESTED"].includes(normalizedBody)) {
      responseType = "negative";
    } else if (["STOP", "UNSUBSCRIBE", "CANCEL"].includes(normalizedBody)) {
      responseType = "opt_out";

      // Mark model as opted out of SMS if found
      if (model?.id) {
        await supabase
          .from("models")
          .update({ sms_opt_out: true })
          .eq("id", model.id);
      }
    }

    // Update the log with response type
    if (responseType) {
      await supabase
        .from("sms_logs")
        .update({ response_type: responseType })
        .eq("twilio_sid", messageSid);
    }

    // Return TwiML response (empty = no auto-reply)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Twilio incoming webhook error:", error);

    // Return empty TwiML on error to prevent Twilio retries
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}

// Also handle GET for Twilio webhook verification
export async function GET() {
  return new NextResponse("Twilio webhook endpoint", { status: 200 });
}
