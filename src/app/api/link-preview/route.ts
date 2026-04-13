import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cache previews for 1 hour
const CACHE_TTL = 60 * 60;

function isPrivateHostname(hostname: string): boolean {
  // Localhost variants
  if (hostname === "localhost" || hostname === "0.0.0.0") return true;
  // IPv6 loopback
  if (hostname === "::1" || hostname === "[::1]") return true;
  // IPv4 private ranges
  if (hostname.startsWith("127.")) return true;       // 127.0.0.0/8
  if (hostname.startsWith("10.")) return true;        // 10.0.0.0/8
  if (hostname.startsWith("192.168.")) return true;   // 192.168.0.0/16
  if (hostname.startsWith("169.254.")) return true;   // Link-local / cloud metadata
  if (hostname.startsWith("0.")) return true;          // 0.0.0.0/8

  // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
  if (hostname.startsWith("172.")) {
    const second = parseInt(hostname.split(".")[1], 10);
    if (second >= 16 && second <= 31) return true;
  }

  // IPv6 private ranges
  if (hostname.startsWith("fc") || hostname.startsWith("fd")) return true;  // Unique local
  if (hostname.startsWith("fe80")) return true;  // Link-local

  return false;
}

export async function GET(request: NextRequest) {
  // Require authentication to prevent open proxy abuse
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Invalid URL protocol" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Block internal/private IPs and hostnames
  if (isPrivateHostname(parsedUrl.hostname)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EXABot/1.0)",
        Accept: "text/html",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch URL" }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json({ error: "Not an HTML page" }, { status: 400 });
    }

    // Only read first 50KB to extract meta tags
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "No response body" }, { status: 502 });
    }

    let html = "";
    const decoder = new TextDecoder();
    let bytesRead = 0;
    const MAX_BYTES = 50_000;

    while (bytesRead < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytesRead += value.length;
    }
    reader.cancel();

    // Extract Open Graph and meta tags
    const getMetaContent = (nameOrProperty: string): string | null => {
      // Try property first (og: tags), then name
      const propertyRegex = new RegExp(
        `<meta[^>]*property=["']${nameOrProperty}["'][^>]*content=["']([^"']*)["']`,
        "i"
      );
      const nameRegex = new RegExp(
        `<meta[^>]*name=["']${nameOrProperty}["'][^>]*content=["']([^"']*)["']`,
        "i"
      );
      // Also try content before property/name
      const reversePropertyRegex = new RegExp(
        `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${nameOrProperty}["']`,
        "i"
      );
      const reverseNameRegex = new RegExp(
        `<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${nameOrProperty}["']`,
        "i"
      );

      return (
        propertyRegex.exec(html)?.[1] ||
        nameRegex.exec(html)?.[1] ||
        reversePropertyRegex.exec(html)?.[1] ||
        reverseNameRegex.exec(html)?.[1] ||
        null
      );
    };

    const title =
      getMetaContent("og:title") ||
      getMetaContent("twitter:title") ||
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ||
      null;

    const description =
      getMetaContent("og:description") ||
      getMetaContent("twitter:description") ||
      getMetaContent("description") ||
      null;

    let image =
      getMetaContent("og:image") ||
      getMetaContent("twitter:image") ||
      null;

    // Resolve relative image URLs
    if (image && !image.startsWith("http")) {
      try {
        image = new URL(image, url).href;
      } catch {
        image = null;
      }
    }

    const siteName =
      getMetaContent("og:site_name") ||
      parsedUrl.hostname.replace(/^www\./, "");

    if (!title && !description) {
      return NextResponse.json({ error: "No metadata found" }, { status: 404 });
    }

    const data = {
      title: title ? decodeHTMLEntities(title) : null,
      description: description ? decodeHTMLEntities(description.slice(0, 200)) : null,
      image,
      siteName: decodeHTMLEntities(siteName),
      url,
    };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}`,
      },
    });
  } catch (error: any) {
    if (error.name === "AbortError") {
      return NextResponse.json({ error: "Request timeout" }, { status: 504 });
    }
    return NextResponse.json({ error: "Failed to fetch preview" }, { status: 500 });
  }
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}
