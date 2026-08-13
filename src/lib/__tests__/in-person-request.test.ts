import { describe, it, expect } from "vitest";
import { detectInPersonRequest } from "../in-person-request";

describe("detectInPersonRequest", () => {
  it("catches the real fan message that slipped through (2026-08)", () => {
    // Every clause of this message should trip the detector on its own.
    const real =
      "Well trust me I’d make you very happy if we meet can I get your number? Or add me back on snap adamj088";
    expect(detectInPersonRequest(real).matched).toBe(true);
    expect(detectInPersonRequest("if we meet").matched).toBe(true);
    expect(detectInPersonRequest("can I get your number?").matched).toBe(true);
    expect(detectInPersonRequest("add me back on snap adamj088").matched).toBe(true);
  });

  it("catches bare forms of 'meet'", () => {
    for (const text of [
      "can we meet",
      "MEET ME after the show",
      "I'd love to meet you someday",
      "lets do a meetup",
      "are you meeting fans",
      "nice to meet you", // deliberate false positive — recall over precision
    ]) {
      expect(detectInPersonRequest(text).matched, text).toBe(true);
    }
  });

  it("catches contact-exchange asks", () => {
    for (const text of [
      "send me your number",
      "can i have your whatsapp",
      "do you have telegram",
      "whats your snap",
      "what’s ur ig",
      "drop your digits",
      "my snapchat is adamj088",
      "my ig: @someguy",
      "follow me on instagram",
      "add me on kik",
    ]) {
      expect(detectInPersonRequest(text).matched, text).toBe(true);
    }
  });

  it("catches meetup logistics", () => {
    for (const text of [
      "let's hang out in person",
      "i can fly you out",
      "come to my hotel",
      "swing by my place",
      "private dinner just us",
      "let's take this off platform",
    ]) {
      expect(detectInPersonRequest(text).matched, text).toBe(true);
    }
  });

  it("returns the first matched phrase for auditing", () => {
    const result = detectInPersonRequest("can we meet up somewhere");
    expect(result.phrase?.toLowerCase()).toContain("meet");
  });

  it("lets normal fan chat through", () => {
    for (const text of [
      "you looked amazing on the live today",
      "good morning! how was your shoot?",
      "can't wait for your next stream",
      "just sent you a tip 💖",
      "that swimsuit set is my favorite",
      "will you be on cam later tonight?",
    ]) {
      expect(detectInPersonRequest(text).matched, text).toBe(false);
    }
  });

  it("handles empty input", () => {
    expect(detectInPersonRequest("").matched).toBe(false);
    expect(detectInPersonRequest(null).matched).toBe(false);
    expect(detectInPersonRequest(undefined).matched).toBe(false);
  });
});
