import { describe, it, expect } from "vitest";
import {
  encryptBankAccount,
  decryptBankAccount,
  generateEncryptionKey,
} from "../encryption";

describe("encryptBankAccount / decryptBankAccount roundtrip", () => {
  it("encrypts and decrypts a simple string", () => {
    const plaintext = "1234567890";
    const encrypted = encryptBankAccount(plaintext);
    expect(decryptBankAccount(encrypted)).toBe(plaintext);
  });

  it("encrypts and decrypts special characters", () => {
    const plaintext = "IBAN: DE89 3704 0044 0532 0130 00 / Swift: COBADEFFXXX";
    const encrypted = encryptBankAccount(plaintext);
    expect(decryptBankAccount(encrypted)).toBe(plaintext);
  });

  it("encrypts and decrypts unicode characters", () => {
    const plaintext = "銀行口座 123";
    const encrypted = encryptBankAccount(plaintext);
    expect(decryptBankAccount(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const plaintext = "same-account-number";
    const encrypted1 = encryptBankAccount(plaintext);
    const encrypted2 = encryptBankAccount(plaintext);
    expect(encrypted1).not.toBe(encrypted2);
    // But both decrypt to the same value
    expect(decryptBankAccount(encrypted1)).toBe(plaintext);
    expect(decryptBankAccount(encrypted2)).toBe(plaintext);
  });

  it("encrypts and decrypts empty string", () => {
    const encrypted = encryptBankAccount("");
    expect(decryptBankAccount(encrypted)).toBe("");
  });

  it("output format is iv:authTag:encryptedData", () => {
    const encrypted = encryptBankAccount("test");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    // IV is 12 bytes = 24 hex chars
    expect(parts[0]).toHaveLength(24);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Encrypted data is hex
    expect(parts[2]).toMatch(/^[0-9a-f]+$/);
  });
});

describe("decryptBankAccount error cases", () => {
  it("throws on invalid format (wrong number of parts)", () => {
    expect(() => decryptBankAccount("invalid")).toThrow("Invalid encrypted data format");
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encryptBankAccount("sensitive-data");
    const parts = encrypted.split(":");
    // Tamper with the encrypted data
    parts[2] = "ff" + parts[2].slice(2);
    expect(() => decryptBankAccount(parts.join(":"))).toThrow();
  });
});

describe("generateEncryptionKey", () => {
  it("returns a 64-character hex string", () => {
    const key = generateEncryptionKey();
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]+$/);
  });

  it("generates unique keys", () => {
    const key1 = generateEncryptionKey();
    const key2 = generateEncryptionKey();
    expect(key1).not.toBe(key2);
  });
});
