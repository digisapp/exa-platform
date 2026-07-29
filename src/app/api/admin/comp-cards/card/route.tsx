import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * GET /api/admin/comp-cards/card
 *
 * Comp card FRONT for the admin Instagram-collab flow: full-bleed model
 * photo, EXA MODELS logo up top (profile-page treatment), username + profile
 * URL on the bottom scrim. 1080x1350 (IG portrait 4:5); scale=2 for hi-res
 * download. Front only by design — no real names, no measurements, nothing
 * personal beyond the public username (owner decision: fronts get posted to
 * Instagram, backs never exist here).
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const photoUrl = sp.get("photo") || "";
  const username = (sp.get("username") || "").toLowerCase();
  if (!photoUrl || !username) {
    return new Response("photo and username required", { status: 400 });
  }

  const scale = Math.min(3, Math.max(1, Number(sp.get("scale")) || 1));
  const W = 1080 * scale;
  const H = 1350 * scale;
  const px = (v: number) => `${v * scale}px`;
  const s = (v: number) => Math.round(v * scale);

  const [fontBlackRes, fontSemiRes] = await Promise.all([
    fetch(new URL("/fonts/Poppins-Black.ttf", request.nextUrl.origin)),
    fetch(new URL("/fonts/Poppins-SemiBold.ttf", request.nextUrl.origin)),
  ]);
  if (!fontBlackRes.ok || !fontSemiRes.ok) {
    return new Response("Font not found", { status: 500 });
  }
  const [fontBlack, fontSemi] = await Promise.all([
    fontBlackRes.arrayBuffer(),
    fontSemiRes.arrayBuffer(),
  ]);

  // exa-models-logo-white.png is 3392x496 (~6.84:1)
  const logoW = 330;
  const logoH = Math.round(logoW * (496 / 3392));
  const logoUrl = new URL("/exa-models-logo-white.png", request.nextUrl.origin).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: `${W}px`,
          height: `${H}px`,
          display: "flex",
          fontFamily: "Poppins",
          position: "relative",
          overflow: "hidden",
          background: "#000",
        }}
      >
        {/* ── Full-bleed model photo ── */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={username}
          width={W}
          height={H}
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

        {/* ── Top scrim ── */}
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: px(300),
          background: "linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)",
          display: "flex",
        }} />

        {/* ── EXA MODELS logo (profile-page treatment) ── */}
        <div style={{
          position: "absolute", top: px(56), left: 0, width: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="EXA MODELS"
            width={s(logoW)}
            height={s(logoH)}
            style={{ width: px(logoW), height: px(logoH) }}
          />
        </div>

        {/* ── Bottom scrim ── */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, width: "100%", height: px(460),
          background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 45%, transparent 100%)",
          display: "flex",
        }} />

        {/* ── Username ── */}
        <div style={{
          position: "absolute", bottom: px(150), left: 0, width: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: px(username.length > 14 ? 58 : 72),
            fontWeight: 900,
            color: "#FFFFFF",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            display: "flex",
            textShadow: `${px(2)} ${px(3)} ${px(14)} rgba(0,0,0,0.7)`,
          }}>
            {username}
          </div>
        </div>

        {/* ── Profile URL (neon) ── */}
        <div style={{
          position: "absolute", bottom: px(84), left: 0, width: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: px(32),
            fontWeight: 600,
            color: "#FF69B4",
            letterSpacing: "0.12em",
            display: "flex",
            textShadow: `0 0 ${px(24)} rgba(255,105,180,0.75), 0 ${px(2)} ${px(8)} rgba(0,0,0,0.6)`,
          }}>
            examodels.com/{username}
          </div>
        </div>

        {/* ── Border frame ── */}
        <div style={{
          position: "absolute",
          top: px(14), left: px(14), right: px(14), bottom: px(14),
          border: `${px(2)} solid rgba(255,105,180,0.35)`,
          display: "flex",
        }} />
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "Poppins", data: fontBlack, style: "normal" as const, weight: 900 as const },
        { name: "Poppins", data: fontSemi, style: "normal" as const, weight: 600 as const },
      ],
    }
  );
}
