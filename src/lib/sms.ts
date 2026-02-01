// SMS Utility using Twilio
// Set these environment variables:
// TWILIO_ACCOUNT_SID
// TWILIO_AUTH_TOKEN
// TWILIO_PHONE_NUMBER
// ADMIN_PHONE_NUMBER (for notifications)

interface SendSMSParams {
  to: string;
  message: string;
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS({ to, message }: SendSMSParams): Promise<SMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("Twilio credentials not configured - SMS not sent");
    return { success: false, error: "Twilio not configured" };
  }

  // Format phone number (ensure it has country code)
  const formattedTo = formatPhoneNumber(to);
  if (!formattedTo) {
    return { success: false, error: "Invalid phone number" };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          To: formattedTo,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      return { success: true, messageId: data.sid };
    } else {
      console.error("Twilio error:", data);
      return { success: false, error: data.message || "Failed to send SMS" };
    }
  } catch (error) {
    console.error("SMS send error:", error);
    return { success: false, error: "Failed to send SMS" };
  }
}

// Format phone number to E.164 format
function formatPhoneNumber(phone: string): string | null {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // US number without country code (10 digits)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // US number with country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // International number (assume it has country code if 11+ digits)
  if (digits.length >= 11) {
    return `+${digits}`;
  }

  return null;
}

// Format scheduled time for display
function formatScheduledTime(scheduledAt: string): string {
  const date = new Date(scheduledAt);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles",
  };
  return date.toLocaleString("en-US", options);
}

// Send notification to admin about new call request
export async function notifyAdminNewCallRequest(request: {
  name: string;
  phone: string;
  instagram_handle?: string;
  source?: string;
  scheduled_at?: string | null;
}): Promise<void> {
  const adminPhone = process.env.ADMIN_PHONE_NUMBER;
  if (!adminPhone) {
    console.warn("Admin phone not configured - notification not sent");
    return;
  }

  const scheduledInfo = request.scheduled_at
    ? `\nScheduled: ${formatScheduledTime(request.scheduled_at)}`
    : "";

  const message = request.scheduled_at
    ? `New EXA Call BOOKED!\n\nName: ${request.name}\nPhone: ${request.phone}${request.instagram_handle ? `\nIG: @${request.instagram_handle}` : ""}${scheduledInfo}${request.source ? `\nSource: ${request.source}` : ""}`
    : `New EXA Call Request!\n\nName: ${request.name}\nPhone: ${request.phone}${request.instagram_handle ? `\nIG: @${request.instagram_handle}` : ""}${request.source ? `\nSource: ${request.source}` : ""}\n\nCall them back!`;

  await sendSMS({ to: adminPhone, message });
}

// Send confirmation to model
export async function sendCallRequestConfirmation(
  phone: string,
  name: string,
  scheduledAt?: string | null
): Promise<void> {
  const firstName = name.split(" ")[0];

  const message = scheduledAt
    ? `Hi ${firstName}! Your call with EXA is confirmed for ${formatScheduledTime(scheduledAt)}. We'll call you then! - The EXA Team`
    : `Hi ${firstName}! Thanks for reaching out to EXA. We got your call request and will be in touch soon! - The EXA Team`;

  await sendSMS({ to: phone, message });
}
