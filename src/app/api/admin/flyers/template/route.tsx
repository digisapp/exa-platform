import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * GET /api/admin/flyers/template
 *
 * Renders a model flyer as a 1080x1350 PNG using next/og (Satori).
 * Accepts content params (name, photo, event, date, venue) and
 * design params (gc0-gc4, borderColor, font sizes, toggles, etc.).
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  // ── Content params ──
  const modelName = sp.get("name") || "Model Name";
  const photoUrl = sp.get("photo") || "";
  const eventName = sp.get("event") || "Miami Swim Week 2026";
  const eventDate = sp.get("date") || "July 2026";
  const venue = sp.get("venue") || "Miami Beach, FL";
  const tagline = sp.get("tagline") || "Swim Shows";
  const ticketText =
    sp.get("ticketText") || "TICKETS + VIP — EXAMODELS.COM @EXA.MODELS";

  // ── Design params (with defaults matching Pink Sunset preset) ──
  const gc0 = sp.get("gc0") || "#FF69B4";
  const gc1 = sp.get("gc1") || "#FF8FA0";
  const gc2 = sp.get("gc2") || "#FFB088";
  const gc3 = sp.get("gc3") || "#FFCC80";
  const gc4 = sp.get("gc4") || "#FFB347";

  const borderColor = sp.get("borderColor") || "#FF69B4";
  const taglineFontSize = Number(sp.get("taglineFontSize")) || 72;
  const nameFontSize = Number(sp.get("nameFontSize")) || 48;
  const venueFontSize = Number(sp.get("venueFontSize")) || 36;
  const dateFontSize = Number(sp.get("dateFontSize")) || 22;

  const showPalms = sp.get("showPalms") !== "0";
  const showHearts = sp.get("showHearts") !== "0";
  const showGlows = sp.get("showGlows") !== "0";

  const ticketColor1 = sp.get("ticketColor1") || "#FF8C00";
  const ticketColor2 = sp.get("ticketColor2") || "#FF6347";

  // ── Load fonts ──
  const fontUrl = new URL("/fonts/Poppins-Black.ttf", request.nextUrl.origin);
  const fontRes = await fetch(fontUrl);
  if (!fontRes.ok) {
    return new Response("Font Poppins-Black not found", { status: 500 });
  }
  const fontData = await fontRes.arrayBuffer();

  const fontRegularUrl = new URL(
    "/fonts/Poppins-SemiBold.ttf",
    request.nextUrl.origin
  );
  const fontRegularRes = await fetch(fontRegularUrl);
  if (!fontRegularRes.ok) {
    return new Response("Font Poppins-SemiBold not found", { status: 500 });
  }
  const fontRegularData = await fontRegularRes.arrayBuffer();

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          fontFamily: "Poppins",
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(180deg, ${gc0} 0%, ${gc1} 25%, ${gc2} 50%, ${gc3} 75%, ${gc4} 100%)`,
        }}
      >
        {/* Decorative glows */}
        {showGlows && (
          <div
            style={{
              position: "absolute",
              top: "-100px",
              left: "-100px",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${gc0}99 0%, transparent 70%)`,
              display: "flex",
            }}
          />
        )}
        {showGlows && (
          <div
            style={{
              position: "absolute",
              bottom: "-100px",
              right: "-100px",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${gc4}66 0%, transparent 70%)`,
              display: "flex",
            }}
          />
        )}

        {/* ── EXA Logo + Event Title ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "50px",
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: "52px",
              fontWeight: 900,
              color: "white",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            exa
          </div>

          <div
            style={{
              fontSize: `${taglineFontSize}px`,
              fontWeight: 900,
              color: "white",
              lineHeight: 1,
              textShadow: "2px 4px 8px rgba(0,0,0,0.2)",
              fontStyle: "italic",
              display: "flex",
            }}
          >
            {tagline}
          </div>

          <div
            style={{
              fontSize: "28px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginTop: "4px",
              display: "flex",
            }}
          >
            {eventName}
          </div>
        </div>

        {/* ── Palm tree silhouettes (CSS shapes) ── */}
        {showPalms && (
          <div
            style={{
              position: "absolute",
              bottom: "0px",
              left: "20px",
              width: "120px",
              height: "280px",
              opacity: 0.2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Trunk */}
            <div style={{ width: "12px", height: "200px", background: "white", borderRadius: "6px", marginTop: "80px", display: "flex" }} />
            {/* Fronds */}
            <div style={{ position: "absolute", top: "40px", width: "120px", height: "80px", borderRadius: "50%", background: "white", display: "flex" }} />
            <div style={{ position: "absolute", top: "20px", left: "10px", width: "100px", height: "60px", borderRadius: "50%", background: "white", display: "flex" }} />
          </div>
        )}
        {showPalms && (
          <div
            style={{
              position: "absolute",
              bottom: "0px",
              right: "20px",
              width: "120px",
              height: "280px",
              opacity: 0.2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ width: "12px", height: "200px", background: "white", borderRadius: "6px", marginTop: "80px", display: "flex" }} />
            <div style={{ position: "absolute", top: "40px", width: "120px", height: "80px", borderRadius: "50%", background: "white", display: "flex" }} />
            <div style={{ position: "absolute", top: "20px", left: "10px", width: "100px", height: "60px", borderRadius: "50%", background: "white", display: "flex" }} />
          </div>
        )}

        {/* ── Decorative hearts (CSS shapes) ── */}
        {showHearts && (
          <div style={{ position: "absolute", top: "120px", right: "80px", display: "flex" }}>
            <div style={{ width: "40px", height: "40px", background: `${borderColor}`, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: `0 0 20px ${borderColor}66` }} />
          </div>
        )}
        {showHearts && (
          <div style={{ position: "absolute", top: "300px", right: "60px", display: "flex" }}>
            <div style={{ width: "30px", height: "30px", background: "rgba(135,206,250,0.8)", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: "0 0 15px rgba(135,206,250,0.4)" }} />
          </div>
        )}
        {showHearts && (
          <div style={{ position: "absolute", top: "500px", left: "60px", display: "flex" }}>
            <div style={{ width: "35px", height: "35px", background: `${borderColor}`, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: `0 0 18px ${borderColor}66` }} />
          </div>
        )}
        {showHearts && (
          <div style={{ position: "absolute", top: "200px", right: "120px", display: "flex" }}>
            <div style={{ width: "22px", height: "22px", background: `${borderColor}99`, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex" }} />
          </div>
        )}

        {/* ── Model Photo ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "40px",
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: "560px",
              height: "560px",
              borderRadius: "50%",
              border: `8px solid ${borderColor}cc`,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 40px ${borderColor}66, 0 20px 60px rgba(0,0,0,0.2)`,
              background: "rgba(255,255,255,0.1)",
            }}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={modelName}
                width={560}
                height={560}
                style={{
                  objectFit: "cover",
                  width: "100%",
                  height: "100%",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: `linear-gradient(135deg, ${gc0} 0%, ${gc4} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "120px",
                  color: "white",
                }}
              >
                EXA
              </div>
            )}
          </div>
        </div>

        {/* ── MODEL label + Name ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "30px",
            zIndex: 2,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(135,206,235,0.85)",
              color: "#FF1493",
              fontSize: "20px",
              fontWeight: 900,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              padding: "6px 30px",
              borderRadius: "6px",
              display: "flex",
            }}
          >
            MODEL
          </div>

          <div
            style={{
              fontSize: `${nameFontSize}px`,
              fontWeight: 900,
              color: "white",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textShadow: "2px 3px 6px rgba(0,0,0,0.3)",
              marginTop: "8px",
              textAlign: "center",
              display: "flex",
              maxWidth: "900px",
            }}
          >
            {modelName}
          </div>
        </div>

        {/* ── Event Details Banner ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "30px",
            zIndex: 2,
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: "52px",
              fontWeight: 900,
              color: "white",
              fontStyle: "italic",
              textShadow: "2px 4px 8px rgba(0,0,0,0.25)",
              display: "flex",
            }}
          >
            Exa {tagline}
          </div>

          <div
            style={{
              fontSize: `${venueFontSize}px`,
              fontWeight: 900,
              color: "white",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textShadow: "1px 2px 4px rgba(0,0,0,0.2)",
              display: "flex",
            }}
          >
            {venue}
          </div>

          <div
            style={{
              fontSize: `${dateFontSize}px`,
              fontWeight: 600,
              color: "white",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginTop: "8px",
              display: "flex",
            }}
          >
            {eventDate}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "16px",
              padding: "8px 24px",
              background: `linear-gradient(90deg, ${ticketColor1}, ${ticketColor2})`,
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "white",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              {ticketText}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        {
          name: "Poppins",
          data: fontData,
          style: "normal",
          weight: 900,
        },
        {
          name: "Poppins",
          data: fontRegularData,
          style: "normal",
          weight: 600,
        },
      ],
    }
  );
}
