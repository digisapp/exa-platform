---
name: verify
description: Build, launch, and drive exa-platform locally to verify changes at the browser surface.
---

# Verifying exa-platform changes

## Build + launch (prod server)

```bash
npm run build            # ~40-60s, clean = 0 errors
npx next start -p 3111   # .env.local carries Supabase/Stripe keys; prod data — read-only flows only
curl -s -o /dev/null -w "%{http_code}" http://localhost:3111/models   # 200 = up
```

Kill with `lsof -ti:3111 | xargs kill`. Note: `next start` serves the CSP
headers from next.config.ts — dev mode differs (`unsafe-eval` etc.), so
verify CSP-sensitive things (third-party scripts, external fetches) against
the prod server.

## Driving the UI

Playwright is in node_modules and Chromium is cached (~/Library/Caches/ms-playwright).
Import directly in an .mjs script in the scratchpad:

```js
import { chromium } from "/Users/examodels/Desktop/exa-platform/node_modules/playwright/index.mjs";
```

Good anonymous surfaces: `/models` (public grid), `/gigs`, `/` — no login
needed. Logged-in flows need real credentials; there is no seeded test user,
so stick to anon flows or ask Nathan.

## Gotchas

- The DB is production Supabase — do not drive flows that write (signups,
  purchases, messages). Browse/read-only only.
- CSP failures surface as `requestfailed` with errorText "csp" in Playwright —
  listen for them; they're silent in the UI.
- Google Translate widget: the hidden combo is `.goog-te-combo`; the
  `googtrans` cookie (`/en/xx`) proves the handler ran, but only
  `translate-pa.googleapis.com/v1/translateHtml` returning 200 proves
  translation actually applied. Allow ~10s for a full page.
