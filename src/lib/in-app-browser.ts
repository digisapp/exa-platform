/**
 * Detect if the user is browsing from an in-app browser (Instagram, TikTok, Facebook, etc.)
 * These browsers have limited functionality (no Apple Pay, broken OAuth, no cookie persistence).
 */

const IN_APP_BROWSER_PATTERNS = [
  'Instagram',
  'FBAN',        // Facebook App
  'FBAV',        // Facebook App version
  'FB_IAB',      // Facebook in-app browser
  'Twitter',
  'Line/',
  'Snapchat',
  'BytedanceWebview',  // TikTok
  'musical_ly',        // TikTok (old)
  'TikTok',
  'LinkedIn',
  'Pinterest',
  'Threads',
];

export function isInAppBrowser(userAgent: string): boolean {
  if (!userAgent) return false;
  return IN_APP_BROWSER_PATTERNS.some((pattern) =>
    userAgent.includes(pattern)
  );
}

/**
 * Detect which in-app browser is being used (for display purposes).
 */
export function getInAppBrowserName(userAgent: string): string {
  if (!userAgent) return 'this app';
  if (userAgent.includes('Instagram')) return 'Instagram';
  if (userAgent.includes('FBAN') || userAgent.includes('FBAV') || userAgent.includes('FB_IAB')) return 'Facebook';
  if (userAgent.includes('TikTok') || userAgent.includes('BytedanceWebview') || userAgent.includes('musical_ly')) return 'TikTok';
  if (userAgent.includes('Twitter')) return 'X (Twitter)';
  if (userAgent.includes('Snapchat')) return 'Snapchat';
  if (userAgent.includes('LinkedIn')) return 'LinkedIn';
  if (userAgent.includes('Pinterest')) return 'Pinterest';
  if (userAgent.includes('Threads')) return 'Threads';
  if (userAgent.includes('Line/')) return 'LINE';
  return 'this app';
}
