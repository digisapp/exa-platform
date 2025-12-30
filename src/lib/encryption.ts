import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const key = process.env.BANK_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("BANK_ENCRYPTION_KEY environment variable is not set");
  }
  // Key should be 32 bytes (256 bits) for AES-256
  // If provided as hex string (64 chars), convert to buffer
  if (key.length === 64) {
    return Buffer.from(key, "hex");
  }
  // If provided as base64 (44 chars), convert to buffer
  if (key.length === 44) {
    return Buffer.from(key, "base64");
  }
  throw new Error("BANK_ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)");
}

export function encryptBankAccount(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData (all hex encoded)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptBankAccount(encryptedData: string): string {
  const key = getEncryptionKey();

  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// Utility to generate a new encryption key
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
