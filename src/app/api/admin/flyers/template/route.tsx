import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * GET /api/admin/flyers/template
 *
 * Renders a next-level model flyer as a 1080x1350 PNG using next/og (Satori).
 * Supports content params, design params, and model metadata (ig handle, tags).
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
  const ticketText = sp.get("ticketText") || "TICKETS + VIP — EXAMODELS.COM @EXA.MODELS";
  const igHandle = sp.get("ig") || "";
  const tagsRaw = sp.get("tags") || "";
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()) : [];

  // ── Design params ──
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
  const showIg = sp.get("showIg") !== "0";
  const showTags = sp.get("showTags") !== "0";

  const ticketColor1 = sp.get("ticketColor1") || "#FF8C00";
  const ticketColor2 = sp.get("ticketColor2") || "#FF6347";

  // ── Load fonts ──
  const fontRes = await fetch(new URL("/fonts/Poppins-Black.ttf", request.nextUrl.origin));
  if (!fontRes.ok) return new Response("Font not found", { status: 500 });
  const fontData = await fontRes.arrayBuffer();

  const fontSemiRes = await fetch(new URL("/fonts/Poppins-SemiBold.ttf", request.nextUrl.origin));
  if (!fontSemiRes.ok) return new Response("Font not found", { status: 500 });
  const fontSemiData = await fontSemiRes.arrayBuffer();

  const fontRegRes = await fetch(new URL("/fonts/Poppins-Regular.ttf", request.nextUrl.origin));
  if (!fontRegRes.ok) return new Response("Font not found", { status: 500 });
  const fontRegData = await fontRegRes.arrayBuffer();

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
          background: `linear-gradient(165deg, ${gc0} 0%, ${gc1} 22%, ${gc2} 45%, ${gc3} 70%, ${gc4} 100%)`,
        }}
      >
        {/* ── Background texture: diagonal light streaks ── */}
        {showGlows && (
          <>
            <div
              style={{
                position: "absolute",
                top: "-200px",
                left: "-150px",
                width: "600px",
                height: "600px",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${gc0}88 0%, transparent 65%)`,
                display: "flex",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-150px",
                right: "-150px",
                width: "500px",
                height: "500px",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${gc4}55 0%, transparent 60%)`,
                display: "flex",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "400px",
                right: "-100px",
                width: "350px",
                height: "350px",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${borderColor}33 0%, transparent 60%)`,
                display: "flex",
              }}
            />
            {/* Diagonal light streak */}
            <div
              style={{
                position: "absolute",
                top: "0",
                left: "200px",
                width: "2px",
                height: "1350px",
                background: "rgba(255,255,255,0.06)",
                transform: "rotate(15deg)",
                display: "flex",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "0",
                left: "800px",
                width: "1px",
                height: "1350px",
                background: "rgba(255,255,255,0.04)",
                transform: "rotate(-10deg)",
                display: "flex",
              }}
            />
          </>
        )}

        {/* ── Scattered hearts (multiple sizes, positions) ── */}
        {showHearts && (
          <>
            {/* Large heart top-right */}
            <div style={{ position: "absolute", top: "80px", right: "70px", display: "flex" }}>
              <div style={{ width: "44px", height: "44px", background: `${borderColor}`, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: `0 0 30px ${borderColor}55, 0 0 60px ${borderColor}22` }} />
            </div>
            {/* Medium heart */}
            <div style={{ position: "absolute", top: "180px", right: "140px", display: "flex" }}>
              <div style={{ width: "24px", height: "24px", background: `${borderColor}88`, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex" }} />
            </div>
            {/* Blue heart */}
            <div style={{ position: "absolute", top: "280px", right: "50px", display: "flex" }}>
              <div style={{ width: "32px", height: "32px", background: "rgba(120,200,255,0.7)", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: "0 0 20px rgba(120,200,255,0.3)" }} />
            </div>
            {/* Small heart left side */}
            <div style={{ position: "absolute", top: "420px", left: "50px", display: "flex" }}>
              <div style={{ width: "28px", height: "28px", background: `${borderColor}`, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: `0 0 20px ${borderColor}44` }} />
            </div>
            {/* Tiny heart */}
            <div style={{ position: "absolute", top: "350px", right: "110px", display: "flex" }}>
              <div style={{ width: "16px", height: "16px", background: "rgba(255,255,255,0.5)", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex" }} />
            </div>
            {/* Heart near photo */}
            <div style={{ position: "absolute", top: "550px", left: "100px", display: "flex" }}>
              <div style={{ width: "20px", height: "20px", background: "rgba(120,200,255,0.6)", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex" }} />
            </div>
            {/* Bottom area hearts */}
            <div style={{ position: "absolute", bottom: "250px", right: "80px", display: "flex" }}>
              <div style={{ width: "22px", height: "22px", background: `${borderColor}77`, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex" }} />
            </div>
          </>
        )}

        {/* ── Palm tree silhouettes ── */}
        {showPalms && (
          <>
            {/* Left palm */}
            <div style={{ position: "absolute", bottom: "0px", left: "-10px", opacity: 0.15, display: "flex", flexDirection: "column", alignItems: "center", width: "160px", height: "350px" }}>
              <div style={{ position: "absolute", bottom: "0", width: "14px", height: "250px", background: "white", borderRadius: "7px", display: "flex" }} />
              <div style={{ position: "absolute", top: "30px", left: "0px", width: "140px", height: "90px", borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: "10px", left: "20px", width: "120px", height: "70px", borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: "50px", left: "-10px", width: "100px", height: "60px", borderRadius: "50%", background: "white", display: "flex" }} />
            </div>
            {/* Right palm */}
            <div style={{ position: "absolute", bottom: "0px", right: "-10px", opacity: 0.15, display: "flex", flexDirection: "column", alignItems: "center", width: "160px", height: "350px" }}>
              <div style={{ position: "absolute", bottom: "0", width: "14px", height: "250px", background: "white", borderRadius: "7px", display: "flex" }} />
              <div style={{ position: "absolute", top: "30px", right: "0px", width: "140px", height: "90px", borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: "10px", right: "20px", width: "120px", height: "70px", borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: "50px", right: "-10px", width: "100px", height: "60px", borderRadius: "50%", background: "white", display: "flex" }} />
            </div>
          </>
        )}

        {/* ── EXA Logo + Tagline ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "45px", zIndex: 2 }}>
          {/* exa logo */}
          <div
            style={{
              fontSize: "56px",
              fontWeight: 900,
              color: "white",
              letterSpacing: "0.2em",
              display: "flex",
              textShadow: `0 0 30px ${borderColor}44`,
            }}
          >
            exa
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: `${taglineFontSize}px`,
              fontWeight: 900,
              color: "white",
              lineHeight: 1,
              fontStyle: "italic",
              display: "flex",
              textShadow: `2px 4px 12px rgba(0,0,0,0.25), 0 0 40px ${borderColor}22`,
            }}
          >
            {tagline}
          </div>

          {/* Event name badge */}
          <div
            style={{
              display: "flex",
              marginTop: "8px",
              padding: "4px 20px",
              borderRadius: "20px",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <div
              style={{
                fontSize: "22px",
                fontWeight: 600,
                color: "white",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              {eventName}
            </div>
          </div>
        </div>

        {/* ── Model Photo (circular with double ring + glow) ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "35px", zIndex: 2 }}>
          {/* Outer glow ring */}
          <div
            style={{
              width: "590px",
              height: "590px",
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${borderColor}44, transparent, ${gc0}44)`,
              padding: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 60px ${borderColor}33, 0 0 120px ${borderColor}11`,
            }}
          >
            {/* Inner border */}
            <div
              style={{
                width: "578px",
                height: "578px",
                borderRadius: "50%",
                border: `5px solid ${borderColor}bb`,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.08)",
              }}
            >
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={modelName}
                  width={578}
                  height={578}
                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
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
                    fontSize: "80px",
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  exa
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── MODEL badge + Name + Instagram ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "24px", zIndex: 2 }}>
          {/* MODEL pill */}
          <div
            style={{
              background: `linear-gradient(90deg, rgba(135,206,235,0.9), rgba(176,224,255,0.9))`,
              color: `${borderColor}`,
              fontSize: "18px",
              fontWeight: 900,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              padding: "5px 28px",
              borderRadius: "20px",
              display: "flex",
            }}
          >
            MODEL
          </div>

          {/* Model Name */}
          <div
            style={{
              fontSize: `${nameFontSize}px`,
              fontWeight: 900,
              color: "white",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              textShadow: `2px 3px 8px rgba(0,0,0,0.35), 0 0 30px ${borderColor}22`,
              marginTop: "8px",
              textAlign: "center",
              display: "flex",
              maxWidth: "900px",
            }}
          >
            {modelName}
          </div>

          {/* Instagram handle */}
          {showIg && igHandle && (
            <div
              style={{
                fontSize: "20px",
                fontWeight: 400,
                color: "rgba(255,255,255,0.75)",
                marginTop: "4px",
                display: "flex",
                letterSpacing: "0.02em",
              }}
            >
              @{igHandle}
            </div>
          )}

          {/* Focus tags */}
          {showTags && tags.length > 0 && (
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              {tags.map((tag, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.6)",
                    padding: "3px 12px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.08)",
                    textTransform: "capitalize",
                    display: "flex",
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Event Details Footer ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "auto", marginBottom: "40px", zIndex: 2, width: "100%" }}>
          {/* exa Swim Shows */}
          <div
            style={{
              fontSize: "46px",
              fontWeight: 900,
              color: "white",
              fontStyle: "italic",
              textShadow: `2px 4px 10px rgba(0,0,0,0.3), 0 0 40px ${borderColor}15`,
              display: "flex",
            }}
          >
            exa {tagline}
          </div>

          {/* Venue */}
          <div
            style={{
              fontSize: `${venueFontSize}px`,
              fontWeight: 900,
              color: "white",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              textShadow: "1px 2px 6px rgba(0,0,0,0.25)",
              display: "flex",
            }}
          >
            {venue}
          </div>

          {/* Date */}
          <div
            style={{
              fontSize: `${dateFontSize}px`,
              fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginTop: "6px",
              display: "flex",
            }}
          >
            {eventDate}
          </div>

          {/* Ticket banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "14px",
              padding: "10px 32px",
              background: `linear-gradient(90deg, ${ticketColor1}, ${ticketColor2})`,
              borderRadius: "25px",
              boxShadow: `0 4px 20px ${ticketColor1}44`,
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "white",
                letterSpacing: "0.12em",
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
        { name: "Poppins", data: fontData, style: "normal" as const, weight: 900 as const },
        { name: "Poppins", data: fontSemiData, style: "normal" as const, weight: 600 as const },
        { name: "Poppins", data: fontRegData, style: "normal" as const, weight: 400 as const },
      ],
    }
  );
}
