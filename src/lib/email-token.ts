import crypto from "crypto";

const TOKEN_EXPIRY_DAYS = 30;

function getSecret(): Buffer {
  const secret = process.env.EMAIL_LINK_SECRET;
  if (!secret) {
    throw new Error("EMAIL_LINK_SECRET environment variable is not set");
  }
  if (secret.length !== 64) {
    throw new Error("EMAIL_LINK_SECRET must be 64 hex characters (32 bytes)");
  }
  return Buffer.from(secret, "hex");
}

function base64urlEncode(data: Buffer): string {
  return data.toString("base64url");
}

function base64urlDecode(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

/**
 * Create a signed token encoding modelId + gigId with a timestamp.
 * Format: base64url(modelId:gigId:timestamp).base64url(hmac-sha256-signature)
 */
export function createEmailToken(modelId: string, gigId: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${modelId}:${gigId}:${timestamp}`;
  const payloadEncoded = base64urlEncode(Buffer.from(payload, "utf-8"));

  const secret = getSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadEncoded)
    .digest();

  return `${payloadEncoded}.${base64urlEncode(signature)}`;
}

/**
 * Verify a token and return the decoded payload, or null if invalid/expired.
 */
export function verifyEmailToken(
  token: string
): { modelId: string; gigId: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadEncoded, signatureEncoded] = parts;

    const secret = getSecret();
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadEncoded)
      .digest();

    const providedSignature = base64urlDecode(signatureEncoded);

    if (!crypto.timingSafeEqual(expectedSignature, providedSignature)) {
      return null;
    }

    const payload = base64urlDecode(payloadEncoded).toString("utf-8");
    const segments = payload.split(":");
    if (segments.length !== 3) return null;

    const [modelId, gigId, timestampStr] = segments;
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return null;

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    const expirySeconds = TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
    if (now - timestamp > expirySeconds) {
      return null;
    }

    return { modelId, gigId };
  } catch {
    return null;
  }
}
