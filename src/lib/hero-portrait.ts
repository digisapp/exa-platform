/**
 * Hero portrait source selection.
 *
 * The profile page hero displays a model image at up to ~700px wide on desktop
 * (~1400px at 2x retina). The square `profile_photo_url` used everywhere else
 * (chats, DMs, leaderboards, dashboards, ~32-128px circles) is often only
 * 500-1000px on the long edge, which is sharp at small sizes but blurry at
 * hero size.
 *
 * This helper picks the best available source for the HERO ONLY. It never
 * touches `profile_photo_url`, which is used for circles platform-wide and
 * stays sharp at small sizes regardless of source resolution.
 *
 * Priority chain:
 *   1. profile_photo_url if it's >= 1200px on the long edge (sharp at hero size)
 *   2. Highest-resolution portrait-orientation portfolio photo (>= 1500px long edge)
 *   3. Most recent portfolio photo if no dimensions are stored yet (legacy fallback)
 *   4. profile_photo_url as a last resort (will look slightly soft)
 *   5. null — caller should fall back to the circle layout
 */

export interface HeroSourceCandidate {
  url: string;
  width: number | null;
  height: number | null;
  /** Most recent first when a sort order matters for the legacy fallback */
  createdAt?: string | Date | null;
}

export interface HeroSourceInput {
  profilePhotoUrl: string | null;
  profilePhotoWidth?: number | null;
  profilePhotoHeight?: number | null;
  /** Portfolio photos, expected to be sorted most-recent first */
  portfolioPhotos: HeroSourceCandidate[];
}

/** Profile pic must be at least this wide to render sharply at hero size. */
export const MIN_PROFILE_HERO_WIDTH = 1200;

/** Portfolio fallback must be at least this big on the long edge. */
export const MIN_PORTFOLIO_HERO_LONG_EDGE = 1500;

export interface HeroPortraitResult {
  url: string;
  source: "profile" | "portfolio-high-res" | "portfolio-legacy" | "profile-low-res";
  width: number | null;
  height: number | null;
}

export function getHeroPortrait(input: HeroSourceInput): HeroPortraitResult | null {
  // 1. Profile pic is high-res enough — preferred
  if (
    input.profilePhotoUrl &&
    input.profilePhotoWidth &&
    input.profilePhotoWidth >= MIN_PROFILE_HERO_WIDTH
  ) {
    return {
      url: input.profilePhotoUrl,
      source: "profile",
      width: input.profilePhotoWidth,
      height: input.profilePhotoHeight ?? null,
    };
  }

  // 2. High-res portrait portfolio photo
  const eligible = input.portfolioPhotos.filter(
    (p) =>
      p.width !== null &&
      p.height !== null &&
      Math.max(p.width!, p.height!) >= MIN_PORTFOLIO_HERO_LONG_EDGE &&
      p.height! >= p.width! // portrait or square only — never landscape
  );
  if (eligible.length > 0) {
    // Sort by total pixel count desc — biggest, sharpest first
    eligible.sort((a, b) => b.width! * b.height! - a.width! * a.height!);
    const best = eligible[0];
    return {
      url: best.url,
      source: "portfolio-high-res",
      width: best.width,
      height: best.height,
    };
  }

  // 3. Legacy fallback: portfolio photos exist but dimensions haven't been
  //    backfilled yet. Use the most recent portfolio photo. Risk: it might be
  //    landscape or low-res, but it's almost always better than a stretched
  //    profile pic. Once the backfill runs, this branch stops being hit.
  const legacyCandidate = input.portfolioPhotos.find(
    (p) => p.width === null || p.height === null
  );
  if (legacyCandidate) {
    return {
      url: legacyCandidate.url,
      source: "portfolio-legacy",
      width: legacyCandidate.width,
      height: legacyCandidate.height,
    };
  }

  // 4. Profile pic anyway — even if low-res, better than nothing
  if (input.profilePhotoUrl) {
    return {
      url: input.profilePhotoUrl,
      source: "profile-low-res",
      width: input.profilePhotoWidth ?? null,
      height: input.profilePhotoHeight ?? null,
    };
  }

  // 5. No photo available
  return null;
}
