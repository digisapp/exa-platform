import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * GET /api/admin/flyers/template
 *
 * Full-bleed portrait flyer — model photo fills the entire canvas.
 * Top: "exa Swim Shows" branding with gradient fade.
 * Bottom: Model name, @instagram, venue, date, ticket CTA.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  // ── Content params ──
  const modelName = sp.get("name") || "Model Name";
  const photoUrl = sp.get("photo") || "";
  const eventDate = sp.get("date") || "July 2026";
  const venue = sp.get("venue") || "Miami Beach, FL";
  const tagline = sp.get("tagline") || "Swim Shows";
  const ticketText = sp.get("ticketText") || "TICKETS + VIP — EXAMODELS.COM @EXA.MODELS";
  const igHandle = sp.get("ig") || "";

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
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: `linear-gradient(165deg, ${gc0} 0%, ${gc2} 50%, ${gc4} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "200px",
              fontWeight: 900,
              color: "rgba(255,255,255,0.08)",
            }}
          >
            exa
          </div>
        )}

        {/* ── Top gradient overlay — compact, just for branding ── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "320px",
            background: `linear-gradient(180deg, ${gc0}bb 0%, ${gc0}66 40%, transparent 100%)`,
            display: "flex",
          }}
        />

        {/* ── Bottom gradient overlay — for model info + event details ── */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "520px",
            background: `linear-gradient(0deg, ${gc4}ee 0%, ${gc3}bb 25%, ${gc2}66 50%, transparent 100%)`,
            display: "flex",
          }}
        />

        {/* ── Side vignette ── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(90deg, rgba(0,0,0,0.12) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.12) 100%)",
            display: "flex",
          }}
        />

        {/* ── Colored glow accents ── */}
        {showGlows && (
          <>
            <div style={{ position: "absolute", top: "-80px", left: "-80px", width: "350px", height: "350px", borderRadius: "50%", background: `radial-gradient(circle, ${gc0}44 0%, transparent 65%)`, display: "flex" }} />
            <div style={{ position: "absolute", bottom: "-60px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: `radial-gradient(circle, ${gc4}33 0%, transparent 60%)`, display: "flex" }} />
          </>
        )}

        {/* ── Hearts ── */}
        {showHearts && (
          <>
            <div style={{ position: "absolute", top: "90px", right: "55px", display: "flex", zIndex: 3 }}>
              <div style={{ width: "34px", height: "34px", background: `${borderColor}bb`, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: `0 0 20px ${borderColor}44` }} />
            </div>
            <div style={{ position: "absolute", top: "180px", right: "120px", display: "flex", zIndex: 3 }}>
              <div style={{ width: "18px", height: "18px", background: "rgba(255,255,255,0.5)", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex" }} />
            </div>
            <div style={{ position: "absolute", top: "250px", right: "35px", display: "flex", zIndex: 3 }}>
              <div style={{ width: "24px", height: "24px", background: "rgba(120,200,255,0.6)", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex", boxShadow: "0 0 14px rgba(120,200,255,0.25)" }} />
            </div>
            <div style={{ position: "absolute", top: "140px", left: "45px", display: "flex", zIndex: 3 }}>
              <div style={{ width: "20px", height: "20px", background: `${borderColor}88`, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", display: "flex" }} />
            </div>
          </>
        )}

        {/* ── Palm tree silhouettes ── */}
        {showPalms && (
          <>
            <div style={{ position: "absolute", bottom: "0px", left: "-10px", opacity: 0.1, display: "flex", flexDirection: "column", alignItems: "center", width: "150px", height: "320px", zIndex: 3 }}>
              <div style={{ position: "absolute", bottom: "0", width: "12px", height: "230px", background: "white", borderRadius: "6px", display: "flex" }} />
              <div style={{ position: "absolute", top: "30px", left: "0px", width: "130px", height: "80px", borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: "10px", left: "15px", width: "110px", height: "65px", borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: "50px", left: "-10px", width: "90px", height: "55px", borderRadius: "50%", background: "white", display: "flex" }} />
            </div>
            <div style={{ position: "absolute", bottom: "0px", right: "-10px", opacity: 0.1, display: "flex", flexDirection: "column", alignItems: "center", width: "150px", height: "320px", zIndex: 3 }}>
              <div style={{ position: "absolute", bottom: "0", width: "12px", height: "230px", background: "white", borderRadius: "6px", display: "flex" }} />
              <div style={{ position: "absolute", top: "30px", right: "0px", width: "130px", height: "80px", borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: "10px", right: "15px", width: "110px", height: "65px", borderRadius: "50%", background: "white", display: "flex" }} />
              <div style={{ position: "absolute", top: "50px", right: "-10px", width: "90px", height: "55px", borderRadius: "50%", background: "white", display: "flex" }} />
            </div>
          </>
        )}

        {/* ═══════ TOP — exa Swim Shows branding ═══════ */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "35px",
            zIndex: 4,
          }}
        >
          <div
            style={{
              fontSize: "50px",
              fontWeight: 900,
              color: "white",
              letterSpacing: "0.2em",
              display: "flex",
              textShadow: "0 2px 16px rgba(0,0,0,0.5)",
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
              fontStyle: "italic",
              display: "flex",
              textShadow: "2px 4px 16px rgba(0,0,0,0.5)",
              marginTop: "-4px",
            }}
          >
            {tagline}
          </div>
        </div>

        {/* ═══════ BOTTOM — Model info + Event details ═══════ */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingBottom: "32px",
            zIndex: 4,
          }}
        >
          {/* MODEL pill */}
          <div
            style={{
              background: `linear-gradient(90deg, rgba(135,206,235,0.9), rgba(176,224,255,0.9))`,
              color: `${borderColor}`,
              fontSize: "15px",
              fontWeight: 900,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              padding: "4px 22px",
              borderRadius: "14px",
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
              textShadow: "2px 3px 12px rgba(0,0,0,0.6)",
              marginTop: "6px",
              textAlign: "center",
              display: "flex",
              maxWidth: "950px",
            }}
          >
            {modelName}
          </div>

          {/* Instagram handle */}
          {showIg && igHandle && (
            <div
              style={{
                fontSize: "19px",
                fontWeight: 400,
                color: "rgba(255,255,255,0.85)",
                marginTop: "2px",
                display: "flex",
                letterSpacing: "0.02em",
                textShadow: "0 1px 8px rgba(0,0,0,0.5)",
              }}
            >
              @{igHandle}
            </div>
          )}

          {/* Divider */}
          <div
            style={{
              width: "100px",
              height: "2px",
              background: `linear-gradient(90deg, transparent, ${borderColor}99, transparent)`,
              marginTop: "14px",
              marginBottom: "12px",
              display: "flex",
            }}
          />

          {/* exa Swim Shows — event title */}
          <div
            style={{
              fontSize: "40px",
              fontWeight: 900,
              color: "white",
              fontStyle: "italic",
              textShadow: "2px 4px 12px rgba(0,0,0,0.6)",
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
              textShadow: "1px 2px 8px rgba(0,0,0,0.5)",
              display: "flex",
              marginTop: "2px",
            }}
          >
            {venue}
          </div>

          {/* Date */}
          <div
            style={{
              fontSize: `${dateFontSize}px`,
              fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginTop: "4px",
              display: "flex",
              textShadow: "0 1px 6px rgba(0,0,0,0.5)",
            }}
          >
            {eventDate}
          </div>

          {/* Ticket banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "10px",
              padding: "7px 26px",
              background: `linear-gradient(90deg, ${ticketColor1}, ${ticketColor2})`,
              borderRadius: "18px",
              boxShadow: `0 4px 16px ${ticketColor1}55`,
            }}
          >
            <div
              style={{
                fontSize: "12px",
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

        {/* ── Thin border frame ── */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            right: "10px",
            bottom: "10px",
            border: `2px solid ${borderColor}22`,
            borderRadius: "6px",
            display: "flex",
            zIndex: 5,
          }}
        />
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
