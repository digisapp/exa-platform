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
  const showBorder = sp.get("showBorder") !== "0";
  const borderColor = sp.get("borderColor") || "#FF69B4";

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
          width: "1080px",
          height: "1350px",
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
            width={1080}
            height={1350}
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
            position: "absolute", top: 0, left: 0, width: "100%", height: "320px",
            background: `linear-gradient(180deg, ${gc0}bb 0%, ${gc0}66 40%, transparent 100%)`,
            display: "flex",
          }} />
        )}

        {/* ── Bottom gradient overlay ── */}
        {showBotGrad && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, width: "100%", height: "520px",
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
            <div style={{ position: "absolute", top: "-100px", left: "-100px", width: "500px", height: "500px", borderRadius: "50%", background: `radial-gradient(circle, ${gc0}88 0%, transparent 60%)`, display: "flex", zIndex: 2 }} />
            <div style={{ position: "absolute", bottom: "-80px", right: "-80px", width: "450px", height: "450px", borderRadius: "50%", background: `radial-gradient(circle, ${gc4}77 0%, transparent 55%)`, display: "flex", zIndex: 2 }} />
          </>
        )}

        {/* ── Hearts ── */}
        {showHearts && (
          <>
            <div style={{ position: "absolute", top: "85px", right: "50px", display: "flex", zIndex: 6 }}>
              <div style={{ width: "52px", height: "52px", background: `${borderColor}`, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: `0 0 30px ${borderColor}88` }} />
            </div>
            <div style={{ position: "absolute", top: "175px", right: "115px", display: "flex", zIndex: 6 }}>
              <div style={{ width: "32px", height: "32px", background: "rgba(255,255,255,0.85)", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: "0 0 20px rgba(255,255,255,0.4)" }} />
            </div>
            <div style={{ position: "absolute", top: "260px", right: "40px", display: "flex", zIndex: 6 }}>
              <div style={{ width: "40px", height: "40px", background: "rgba(100,200,255,0.9)", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: "0 0 25px rgba(100,200,255,0.5)" }} />
            </div>
            <div style={{ position: "absolute", top: "140px", left: "45px", display: "flex", zIndex: 6 }}>
              <div style={{ width: "36px", height: "36px", background: `${borderColor}dd`, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: `0 0 22px ${borderColor}66` }} />
            </div>
            <div style={{ position: "absolute", top: "380px", left: "60px", display: "flex", zIndex: 6 }}>
              <div style={{ width: "26px", height: "26px", background: "rgba(255,255,255,0.75)", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex" }} />
            </div>
          </>
        )}

        {/* ── Palm trees ── */}
        {showPalms && (
          <>
            <div style={{ position: "absolute", bottom: "0px", left: "-15px", opacity: 0.3, display: "flex", flexDirection: "column", alignItems: "center", width: "180px", height: "380px", zIndex: 3 }}>
              <div style={{ position: "absolute", bottom: "0", width: "16px", height: "270px", background: "white", borderRadius: "8px", display: "flex" }} />
              <div style={{ position: "absolute", top: "20px", left: "0px", width: "160px", height: "100px", borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: "0px", left: "20px", width: "130px", height: "80px", borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: "45px", left: "-15px", width: "110px", height: "70px", borderRadius: "50%", background: "white", display: "flex" }} />
            </div>
            <div style={{ position: "absolute", bottom: "0px", right: "-15px", opacity: 0.3, display: "flex", flexDirection: "column", alignItems: "center", width: "180px", height: "380px", zIndex: 3 }}>
              <div style={{ position: "absolute", bottom: "0", width: "16px", height: "270px", background: "white", borderRadius: "8px", display: "flex" }} />
              <div style={{ position: "absolute", top: "20px", right: "0px", width: "160px", height: "100px", borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: "0px", right: "20px", width: "130px", height: "80px", borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: "45px", right: "-15px", width: "110px", height: "70px", borderRadius: "50%", background: "white", display: "flex" }} />
            </div>
          </>
        )}

        {/* ── Free-form text elements ── */}
        {textElements.map((el, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${el.x}px`,
              top: `${el.y}px`,
              fontSize: `${el.fontSize}px`,
              fontWeight: el.fontWeight,
              color: el.color,
              fontStyle: el.italic ? "italic" : "normal",
              textTransform: el.uppercase ? "uppercase" : "none",
              textShadow: "2px 3px 12px rgba(0,0,0,0.6)",
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
            width={overlay.width}
            height={overlay.height}
            style={{
              position: "absolute",
              left: `${overlay.x}px`,
              top: `${overlay.y}px`,
              width: `${overlay.width}px`,
              height: `${overlay.height}px`,
              opacity: overlay.opacity,
              objectFit: "contain",
              zIndex: 7,
            }}
          />
        ))}

        {/* ── Auto: Model name + Instagram (bottom center) ── */}
        {(showName && modelName) || (showIg && igHandle) ? (
          <div style={{
            position: "absolute",
            bottom: "80px",
            left: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 8,
          }}>
            {showName && modelName && (
              <div style={{
                fontSize: `${nameFontSize}px`,
                fontWeight: 900,
                color: "white",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                textShadow: "2px 3px 12px rgba(0,0,0,0.7), 0 0 40px rgba(0,0,0,0.3)",
                textAlign: "center",
                display: "flex",
                maxWidth: "950px",
              }}>
                {modelName}
              </div>
            )}
            {showIg && igHandle && (
              <div style={{
                fontSize: "19px",
                fontWeight: 400,
                color: "rgba(255,255,255,0.85)",
                marginTop: "2px",
                display: "flex",
                letterSpacing: "0.02em",
                textShadow: "0 1px 8px rgba(0,0,0,0.6)",
              }}>
                @{igHandle}
              </div>
            )}
          </div>
        ) : null}

        {/* ── Border frame ── */}
        {showBorder && (
          <div style={{
            position: "absolute",
            top: "10px", left: "10px", right: "10px", bottom: "10px",
            border: `2px solid ${borderColor}22`,
            display: "flex",
            zIndex: 9,
          }} />
        )}
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "Poppins", data: fontData, style: "normal" as const, weight: 900 as const },
        { name: "Poppins", data: fontSemiData, style: "normal" as const, weight: 600 as const },
        { name: "Poppins", data: fontRegData, style: "normal" as const, weight: 400 as const },
      ],
    }
  );
}
