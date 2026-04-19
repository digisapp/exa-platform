import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import type { FlyerOverlay, FlyerTextElement } from "@/types/flyer-design";

export const runtime = "edge";

/**
 * GET /api/admin/flyers/template
 *
 * Canvas-style flyer: full-bleed model photo with free-form text elements,
 * image overlays, optional gradient overlays, and auto model name/ig.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  // ── Auto content (changes per model) ──
  const modelName = sp.get("name") || "";
  const photoUrl = sp.get("photo") || "";
  const igHandle = sp.get("ig") || "";

  // ── Design params ──
  const gc0 = sp.get("gc0") || "#FF69B4";
  const gc1 = sp.get("gc1") || "#FF8FA0";
  const gc2 = sp.get("gc2") || "#FFB088";
  const gc3 = sp.get("gc3") || "#FFCC80";
  const gc4 = sp.get("gc4") || "#FFB347";

  const showTopGrad = sp.get("showTopGrad") !== "0";
  const showBotGrad = sp.get("showBotGrad") !== "0";
  const showGlows = sp.get("showGlows") !== "0";
  const showName = sp.get("showName") !== "0";
  const nameFontSize = Number(sp.get("nameFontSize")) || 48;
  const showIg = sp.get("showIg") !== "0";
  const showQr = sp.get("showQr") !== "0";
  const showBorder = sp.get("showBorder") !== "0";
  const borderColor = sp.get("borderColor") || "#FF69B4";
  const eventUrl = sp.get("eventUrl") || "";

  // Resolution: 1 = social (1080x1350), 2 = high (2160x2700), 3 = print (3240x4050)
  const scale = Math.min(4, Math.max(1, Number(sp.get("scale")) || 1));
  const W = 1080 * scale;
  const H = 1350 * scale;
  const px = (v: number) => `${v * scale}px`;
  const s = (v: number) => Math.round(v * scale);

  // ── Free-form elements ──
  let textElements: FlyerTextElement[] = [];
  try { const t = sp.get("texts"); if (t) textElements = JSON.parse(t); } catch {}

  let overlays: FlyerOverlay[] = [];
  try { const o = sp.get("overlays"); if (o) overlays = JSON.parse(o); } catch {}

  // ── Load fonts ──
  const [fontRes, fontSemiRes, fontRegRes] = await Promise.all([
    fetch(new URL("/fonts/Poppins-Black.ttf", request.nextUrl.origin)),
    fetch(new URL("/fonts/Poppins-SemiBold.ttf", request.nextUrl.origin)),
    fetch(new URL("/fonts/Poppins-Regular.ttf", request.nextUrl.origin)),
  ]);
  if (!fontRes.ok || !fontSemiRes.ok || !fontRegRes.ok) {
    return new Response("Font not found", { status: 500 });
  }
  const [fontData, fontSemiData, fontRegData] = await Promise.all([
    fontRes.arrayBuffer(),
    fontSemiRes.arrayBuffer(),
    fontRegRes.arrayBuffer(),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: `${W}px`,
          height: `${H}px`,
          display: "flex",
          flexDirection: "column",
          fontFamily: "Poppins",
          position: "relative",
          overflow: "hidden",
          background: "#000",
        }}
      >
        {/* ── Gradient background ── */}
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          background: `linear-gradient(165deg, ${gc0} 0%, ${gc2} 50%, ${gc4} 100%)`,
          display: "flex",
        }} />

        {/* ── Wave lines (thin elliptical borders) ── */}
        {/* Bottom wave 1 */}
        <div style={{
          position: "absolute", bottom: px(-220), left: px(-200),
          width: px(1480), height: px(500),
          borderRadius: "50%",
          border: `${px(2)} solid rgba(255,255,255,0.18)`,
          background: "transparent",
          display: "flex", zIndex: 1,
        }} />
        {/* Bottom wave 2 */}
        <div style={{
          position: "absolute", bottom: px(-280), left: px(-100),
          width: px(1380), height: px(480),
          borderRadius: "50%",
          border: `${px(1.5)} solid rgba(255,255,255,0.13)`,
          background: "transparent",
          display: "flex", zIndex: 1,
        }} />
        {/* Bottom wave 3 */}
        <div style={{
          position: "absolute", bottom: px(-320), left: px(50),
          width: px(1200), height: px(440),
          borderRadius: "50%",
          border: `${px(1)} solid rgba(255,255,255,0.09)`,
          background: "transparent",
          display: "flex", zIndex: 1,
        }} />
        {/* Top wave 1 */}
        <div style={{
          position: "absolute", top: px(-280), left: px(-150),
          width: px(1400), height: px(420),
          borderRadius: "50%",
          border: `${px(1.5)} solid rgba(255,255,255,0.1)`,
          background: "transparent",
          display: "flex", zIndex: 1,
        }} />
        {/* Top wave 2 */}
        <div style={{
          position: "absolute", top: px(-320), left: px(-50),
          width: px(1250), height: px(400),
          borderRadius: "50%",
          border: `${px(1)} solid rgba(255,255,255,0.07)`,
          background: "transparent",
          display: "flex", zIndex: 1,
        }} />

        {/* ── Centered circle profile photo ── */}
        {photoUrl && (
          <div style={{
            position: "absolute",
            top: px(Math.round((1350 - 630) / 2 - 630 * 0.05)),
            left: px(Math.round((1080 - 630) / 2)),
            width: px(630),
            height: px(630),
            borderRadius: "50%",
            overflow: "hidden",
            border: `${px(5)} solid rgba(255,255,255,0.25)`,
            boxShadow: `0 0 ${px(60)} rgba(0,0,0,0.4), 0 0 ${px(120)} ${gc0}44`,
            display: "flex",
            zIndex: 5,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={modelName}
              width={s(630)}
              height={s(630)}
              style={{
                width: "100%", height: "100%",
                objectFit: "cover",
                objectPosition: "center top",
              }}
            />
          </div>
        )}

        {/* ── Top gradient overlay ── */}
        {showTopGrad && (
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: px(320),
            background: `linear-gradient(180deg, ${gc0}bb 0%, ${gc0}66 40%, transparent 100%)`,
            display: "flex",
          }} />
        )}

        {/* ── Bottom gradient overlay ── */}
        {showBotGrad && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, width: "100%", height: px(520),
            background: `linear-gradient(0deg, ${gc4}ee 0%, ${gc3}bb 25%, ${gc2}66 50%, transparent 100%)`,
            display: "flex",
          }} />
        )}

        {/* ── Side vignette ── */}
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          background: "linear-gradient(90deg, rgba(0,0,0,0.12) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.12) 100%)",
          display: "flex",
        }} />

        {/* ── Glow accents ── */}
        {showGlows && (
          <>
            <div style={{ position: "absolute", top: px(-100), left: px(-100), width: px(500), height: px(500), borderRadius: "50%", background: `radial-gradient(circle, ${gc0}88 0%, transparent 60%)`, display: "flex", zIndex: 2 }} />
            <div style={{ position: "absolute", bottom: px(-80), right: px(-80), width: px(450), height: px(450), borderRadius: "50%", background: `radial-gradient(circle, ${gc4}77 0%, transparent 55%)`, display: "flex", zIndex: 2 }} />
          </>
        )}

        {/* ── Free-form text elements ── */}
        {textElements.map((el, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px(el.x),
              top: px(el.y),
              fontSize: px(el.fontSize),
              fontWeight: el.fontWeight,
              color: el.color,
              fontStyle: el.italic ? "italic" : "normal",
              textTransform: el.uppercase ? "uppercase" : "none",
              textShadow: `${px(2)} ${px(3)} ${px(12)} rgba(0,0,0,0.6)`,
              display: "flex",
              whiteSpace: "nowrap",
              zIndex: 7,
            }}
          >
            {el.text}
          </div>
        ))}

        {/* ── Image overlays ── */}
        {overlays.map((overlay, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`ov-${i}`}
            src={overlay.url}
            alt=""
            width={s(overlay.width)}
            height={s(overlay.height)}
            style={{
              position: "absolute",
              left: px(overlay.x),
              top: px(overlay.y),
              width: px(overlay.width),
              height: px(overlay.height),
              opacity: overlay.opacity,
              objectFit: "contain",
              zIndex: overlay.layer === "back" ? 1 : 7,
            }}
          />
        ))}

        {/* ── Row 1: Tagline ── */}
        {showName && modelName && (
          <div style={{
            position: "absolute",
            top: px(Math.round((1350 - 630) / 2 - 630 * 0.05) + 630 + 20),
            left: px(0),
            width: `${W}px`,
            height: px(40),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 8,
          }}>
            <div style={{
              fontSize: px(28),
              fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              display: "flex",
              textShadow: `0 ${px(1)} ${px(6)} rgba(0,0,0,0.5)`,
            }}>
              Catch Me on the Runway
            </div>
          </div>
        )}

        {/* ── Row 2: Model Name ── */}
        {showName && modelName && (
          <div style={{
            position: "absolute",
            top: px(Math.round((1350 - 630) / 2 - 630 * 0.05) + 630 + 62),
            left: px(0),
            width: `${W}px`,
            height: px(82),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 8,
          }}>
            <div style={{
              fontSize: px(Math.round(nameFontSize * 1.5)),
              fontWeight: 900,
              color: "white",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              display: "flex",
              textShadow: `${px(2)} ${px(3)} ${px(12)} rgba(0,0,0,0.7), 0 0 ${px(40)} rgba(0,0,0,0.3)`,
            }}>
              {modelName}
            </div>
          </div>
        )}

        {/* ── Row 3: Instagram ── */}
        {showIg && igHandle && (
          <div style={{
            position: "absolute",
            top: px(Math.round((1350 - 630) / 2 - 630 * 0.05) + 630 + 132),
            left: px(0),
            width: `${W}px`,
            height: px(52),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 8,
          }}>
            <div style={{
              fontSize: px(28),
              fontWeight: 400,
              color: "rgba(255,255,255,0.85)",
              letterSpacing: "0.02em",
              display: "flex",
              textShadow: `0 ${px(1)} ${px(8)} rgba(0,0,0,0.6)`,
            }}>
              @{igHandle}
            </div>
          </div>
        )}

        {/* ── QR Code (bottom right) ── */}
        {showQr && eventUrl && (
          <div style={{
            position: "absolute",
            bottom: px(20),
            right: px(50),
            display: "flex",
            zIndex: 8,
          }}>
            <div style={{
              background: "white",
              borderRadius: px(10),
              padding: px(8),
              display: "flex",
              boxShadow: `0 ${px(2)} ${px(16)} rgba(0,0,0,0.5)`,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&margin=0&data=${encodeURIComponent(eventUrl)}`}
                alt="QR"
                width={s(150)}
                height={s(150)}
                style={{ width: px(150), height: px(150), display: "flex" }}
              />
            </div>
          </div>
        )}

        {/* ── Border frame ── */}
        {showBorder && (
          <div style={{
            position: "absolute",
            top: px(10), left: px(10), right: px(10), bottom: px(10),
            border: `${px(2)} solid ${borderColor}22`,
            display: "flex",
            zIndex: 9,
          }} />
        )}
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "Poppins", data: fontData, style: "normal" as const, weight: 900 as const },
        { name: "Poppins", data: fontSemiData, style: "normal" as const, weight: 600 as const },
        { name: "Poppins", data: fontRegData, style: "normal" as const, weight: 400 as const },
      ],
    }
  );
}
