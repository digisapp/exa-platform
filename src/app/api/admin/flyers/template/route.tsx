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
  const showPalms = sp.get("showPalms") !== "0";
  const showHearts = sp.get("showHearts") !== "0";
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
        {/* ── Full-bleed model photo ── */}
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={modelName}
            width={W}
            height={H}
            style={{
              position: "absolute",
              top: 0, left: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
            }}
          />
        ) : (
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            background: `linear-gradient(165deg, ${gc0} 0%, ${gc2} 50%, ${gc4} 100%)`,
            display: "flex",
          }} />
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

        {/* ── Hearts ── */}
        {showHearts && (
          <>
            <div style={{ position: "absolute", top: px(85), right: px(50), display: "flex", zIndex: 6 }}>
              <div style={{ width: px(52), height: px(52), background: `${borderColor}`, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: `0 0 ${px(30)} ${borderColor}88` }} />
            </div>
            <div style={{ position: "absolute", top: px(175), right: px(115), display: "flex", zIndex: 6 }}>
              <div style={{ width: px(32), height: px(32), background: "rgba(255,255,255,0.85)", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: `0 0 ${px(20)} rgba(255,255,255,0.4)` }} />
            </div>
            <div style={{ position: "absolute", top: px(260), right: px(40), display: "flex", zIndex: 6 }}>
              <div style={{ width: px(40), height: px(40), background: "rgba(100,200,255,0.9)", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: `0 0 ${px(25)} rgba(100,200,255,0.5)` }} />
            </div>
            <div style={{ position: "absolute", top: px(140), left: px(45), display: "flex", zIndex: 6 }}>
              <div style={{ width: px(36), height: px(36), background: `${borderColor}dd`, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: `0 0 ${px(22)} ${borderColor}66` }} />
            </div>
            <div style={{ position: "absolute", top: px(380), left: px(60), display: "flex", zIndex: 6 }}>
              <div style={{ width: px(26), height: px(26), background: "rgba(255,255,255,0.75)", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex" }} />
            </div>
          </>
        )}

        {/* ── Palm trees ── */}
        {showPalms && (
          <>
            <div style={{ position: "absolute", bottom: "0px", left: px(-15), opacity: 0.3, display: "flex", flexDirection: "column", alignItems: "center", width: px(180), height: px(380), zIndex: 3 }}>
              <div style={{ position: "absolute", bottom: "0", width: px(16), height: px(270), background: "white", borderRadius: px(8), display: "flex" }} />
              <div style={{ position: "absolute", top: px(20), left: "0px", width: px(160), height: px(100), borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: "0px", left: px(20), width: px(130), height: px(80), borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: px(45), left: px(-15), width: px(110), height: px(70), borderRadius: "50%", background: "white", display: "flex" }} />
            </div>
            <div style={{ position: "absolute", bottom: "0px", right: px(-15), opacity: 0.3, display: "flex", flexDirection: "column", alignItems: "center", width: px(180), height: px(380), zIndex: 3 }}>
              <div style={{ position: "absolute", bottom: "0", width: px(16), height: px(270), background: "white", borderRadius: px(8), display: "flex" }} />
              <div style={{ position: "absolute", top: px(20), right: "0px", width: px(160), height: px(100), borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: "0px", right: px(20), width: px(130), height: px(80), borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: px(45), right: px(-15), width: px(110), height: px(70), borderRadius: "50%", background: "white", display: "flex" }} />
            </div>
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
              zIndex: 7,
            }}
          />
        ))}

        {/* ── Auto: Model name + Instagram ── */}
        {(showName && modelName) || (showIg && igHandle) ? (
          <div style={{
            position: "absolute",
            bottom: px(220),
            left: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 8,
          }}>
            {showName && modelName && (
              <div style={{
                fontSize: px(nameFontSize),
                fontWeight: 900,
                color: "white",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                textShadow: `${px(2)} ${px(3)} ${px(12)} rgba(0,0,0,0.7), 0 0 ${px(40)} rgba(0,0,0,0.3)`,
                textAlign: "center",
                display: "flex",
                maxWidth: px(950),
              }}>
                {modelName}
              </div>
            )}
            {showIg && igHandle && (
              <div style={{
                fontSize: px(43),
                fontWeight: 400,
                color: "rgba(255,255,255,0.85)",
                marginTop: px(4),
                display: "flex",
                letterSpacing: "0.02em",
                textShadow: `0 ${px(1)} ${px(8)} rgba(0,0,0,0.6)`,
              }}>
                @{igHandle}
              </div>
            )}
          </div>
        ) : null}

        {/* ── QR Code (bottom right) ── */}
        {showQr && eventUrl && (
          <div style={{
            position: "absolute",
            bottom: px(30),
            right: px(50),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
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
            <div style={{
              fontSize: px(11),
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
              marginTop: px(6),
              textShadow: `0 ${px(1)} ${px(6)} rgba(0,0,0,0.6)`,
              display: "flex",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}>
              Scan for Tickets
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
