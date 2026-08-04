import { describe, it, expect } from "vitest";
import { normalizeInstagramHandle, parseInstagram } from "@/lib/instagram";

describe("normalizeInstagramHandle", () => {
  it("returns null for empty input", () => {
    expect(normalizeInstagramHandle(null)).toBeNull();
    expect(normalizeInstagramHandle(undefined)).toBeNull();
    expect(normalizeInstagramHandle("   ")).toBeNull();
    expect(normalizeInstagramHandle("@")).toBeNull();
    expect(normalizeInstagramHandle("https://www.instagram.com/")).toBeNull();
  });

  it("strips the @ prefix", () => {
    expect(normalizeInstagramHandle("@simplehandle")).toBe("simplehandle");
    expect(normalizeInstagramHandle("plainhandle")).toBe("plainhandle");
  });

  it("reduces profile URLs to the bare handle", () => {
    expect(normalizeInstagramHandle("https://www.instagram.com/twowrongsphotographer/")).toBe(
      "twowrongsphotographer"
    );
    expect(normalizeInstagramHandle("www.instagram.com/sooryadevphotography")).toBe(
      "sooryadevphotography"
    );
    expect(normalizeInstagramHandle("Instagram.com/Matthew.taylor.photography")).toBe(
      "Matthew.taylor.photography"
    );
  });

  it("drops igsh / utm tracking params", () => {
    expect(
      normalizeInstagramHandle(
        "https://www.instagram.com/robertonarduzzophotography?igsh=Ymk4YmxwMmpvenhm&utm_source=qr"
      )
    ).toBe("robertonarduzzophotography");
    expect(normalizeInstagramHandle("@coastalcrazee?igsh=MWNoZ3UwZmxkenRyMA%3D%3D&utm_source=qr")).toBe(
      "coastalcrazee"
    );
  });

  it("keeps values it cannot safely reduce", () => {
    // Another platform — reducing this to a "handle" would lose the URL.
    expect(normalizeInstagramHandle("https://www.youtube.com/@yaersfashiontv")).toBe(
      "https://www.youtube.com/@yaersfashiontv"
    );
    // Two handles in one field — never guess which one is canonical.
    expect(normalizeInstagramHandle("@jessesouligny @evoke.channel")).toBe(
      "@jessesouligny @evoke.channel"
    );
    expect(normalizeInstagramHandle("@auc_fashion_media / auc_photography")).toBe(
      "@auc_fashion_media / auc_photography"
    );
  });

  it("is idempotent", () => {
    const once = normalizeInstagramHandle("https://www.instagram.com/foo?igsh=abc");
    expect(normalizeInstagramHandle(once)).toBe(once);
  });
});

describe("parseInstagram", () => {
  it("builds a label and profile link", () => {
    expect(parseInstagram("@simplehandle")).toEqual({
      label: "@simplehandle",
      href: "https://instagram.com/simplehandle",
    });
    expect(parseInstagram("https://www.instagram.com/dafeteransmedia?igsh=b280djI1ajl1bnhv")).toEqual({
      label: "@dafeteransmedia",
      href: "https://instagram.com/dafeteransmedia",
    });
  });

  it("picks the first handle when a field holds several", () => {
    expect(parseInstagram("@jessesouligny @evoke.channel")?.href).toBe(
      "https://instagram.com/jessesouligny"
    );
    expect(parseInstagram("@auc_fashion_media / auc_photography")?.href).toBe(
      "https://instagram.com/auc_fashion_media"
    );
  });

  it("links foreign URLs to themselves rather than instagram.com", () => {
    expect(parseInstagram("https://www.youtube.com/@yaersfashiontv")).toEqual({
      label: "youtube.com/@yaersfashiontv",
      href: "https://www.youtube.com/@yaersfashiontv",
    });
  });

  it("returns null when there is nothing to link", () => {
    expect(parseInstagram(null)).toBeNull();
    expect(parseInstagram("@")).toBeNull();
  });
});
