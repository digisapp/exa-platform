export interface BoostMatch {
  id: string;
  username: string;
  profile_photo_url: string;
}

export const BOOST_MATCHES_STORAGE_KEY = "boostMatches";

export function readStoredBoostMatches(): BoostMatch[] {
  try {
    const raw = localStorage.getItem(BOOST_MATCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m) => m && m.id && m.username);
  } catch {
    return [];
  }
}

export function appendStoredBoostMatch(match: BoostMatch): void {
  const stored = readStoredBoostMatches();
  if (stored.some((m) => m.id === match.id)) return;
  try {
    localStorage.setItem(
      BOOST_MATCHES_STORAGE_KEY,
      JSON.stringify([...stored, match])
    );
  } catch {
    // localStorage might be unavailable
  }
}

export function generateBoostFingerprint(): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("fingerprint", 2, 2);
  }
  const canvasData = canvas.toDataURL();
  const userAgent = navigator.userAgent;
  const screenRes = `${screen.width}x${screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Simple hash function
  const str = `${canvasData}${userAgent}${screenRes}${timezone}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
