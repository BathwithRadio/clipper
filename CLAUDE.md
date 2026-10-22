# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- This is **vinext**, not Next.js. vinext reimplements the Next.js App Router API (`app/`, route handlers, `next/*` imports) on Vite and runs it on Cloudflare Workers. `vite.config.ts` is the real build config; `next.config.ts` is effectively empty.
- Server code runs in the Workers runtime, so Node-only APIs may not be available. Bindings come from `cloudflare:workers` (`env`), not `process.env`. After changing bindings in `wrangler.jsonc`, regenerate their types with `npm run cf-typegen`.
- Get the database with `getDatabase()` from `lib/clipper/db.ts`, which returns a Drizzle client on the `DB` D1 binding. Put queries in `lib/clipper/data.ts`.
- Pages that read from D1 set `export const dynamic = "force-dynamic"`.
- UI uses shadcn/ui (new-york style, lucide icons) in `components/ui`. App-specific components go in `components/clipper`. The import alias `@/*` points to the repo root.

## Database

- The schema lives in `db/schema.ts`. Migrations are SQL files in `drizzle/`, applied by Wrangler (`npm run db:migrate:local`), not by drizzle-kit.
- `npm run db:seed:local` **deletes all rows** before reseeding from `scripts/seed.sql`. Don't run it when local data matters.
- The local D1 database lives in `.wrangler/`.

## Gotchas

- Despite the name, `price_cents` / `priceCents` holds **whole Korean won**: 65000 means ₩65,000. Don't divide by 100. Prices are formatted as `` `₩${value.toLocaleString("ko-KR")}` ``.
- Timestamps are stored as epoch milliseconds (`mode: "timestamp_ms"`).
- There are no test, lint or typecheck scripts. To verify changes, run `npx tsc --noEmit` and `npm run build`.

## Conventions

- Import alias `@/*` maps to the **repo root**, not `src/` (there is no `src/`): `@/db/schema`, `@/lib/clipper/data`, `@/components/ui`.
- Tailwind CSS v4 with **no `tailwind.config.*`** — theme config is CSS-first in `app/globals.css` (`@import "tailwindcss"`, `@theme inline`). shadcn/ui, style `new-york`.
- Drizzle column modes: timestamps are `integer(..., { mode: "timestamp_ms" })`, booleans are `integer(..., { mode: "boolean" })`.
- Pages that read the DB set `export const dynamic = "force-dynamic"`.
- Named exports for components; `"use client"` on interactive ones.
