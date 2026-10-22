---
name: verify
description: Run and drive the Clipper booking app to verify changes at runtime.
---
- Dev server: `npx vinext dev` (default :3000; if already running, reuse it — a second instance refuses to start).
- Browser: no bundled Playwright browsers; `npm i playwright-core` in a scratch dir and `chromium.launch({ channel: 'chrome' })` (system Chrome).
- Booking form is `section#book-prism` on `/`. Labels: "Pet name", "Breed", "Street address", "Neighborhood"; submit button text contains "Confirm".
- Success redirects to `/appointments/CLP-XXXXXX`; list at `/appointments`. Bogus ref shows "We can't find that visit."
- Writes to local D1 (`.wrangler/`) — test bookings persist.
- Watch console for hydration errors: server (Workers, UTC) and browser (KST) format slot times differently.
