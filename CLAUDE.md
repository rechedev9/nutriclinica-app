# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NutriClínica is a single-practitioner desktop web app for a nutritionist (patients, anthropometric reviews, progress photos, and a small inventory/point-of-sale module).
It runs locally on the practitioner's machine (Windows or macOS) and is distributed as a single self-contained binary that embeds the web UI and opens the browser.
The whole codebase, UI, and domain vocabulary are in Spanish.

The app was ported from a Flask + vanilla-JS monolith to a Go backend + React frontend.
The original files (`app.py`, `templates/`, `static/`, `iniciar.*`) are kept only as a reference for behavior parity; the live app is `backend/` + `frontend/`.

## Layout

```
backend/    Go 1.22 API + SQLite, embeds the built SPA, single binary
frontend/   React + Vite + TypeScript + TanStack Query + Tailwind
build/      build.ps1 / build.sh (build SPA + cross-compile binaries)
bbdd/       SQLite DB (pacientes.db) — local patient data, gitignored
fotos/      progress photos on disk — gitignored
dist/       cross-compiled release binaries — gitignored
```

## Commands

Backend (from `backend/`):
- `go build ./...` — compile. `go test ./...` — tests. `go vet ./...` — vet.
- Run against real data: `go run ./cmd/nutriclinica` (serves http://127.0.0.1:5001, opens browser).
- Flags: `--data-dir <path>`, `--port N`, `--no-browser`, `--fix-orphans`.

Frontend (from `frontend/`, uses **pnpm**):
- `pnpm install` then `pnpm dev` — Vite dev server on :5173, proxies `/api`, `/fotos`, `/login`, `/logout` to the Go backend on :5001 (run the backend separately).
- `pnpm build` — typecheck + build the SPA into `backend/web/dist` (where Go embeds it).
- `pnpm test` — Vitest (the clinical calc golden tests live in `src/lib/calc/__tests__`).
- pnpm gotcha (pnpm 11+): build-script approval lives in `frontend/pnpm-workspace.yaml` (`allowBuilds: esbuild: true`), not in `package.json`.

Full release build: `pwsh build/build.ps1` (or `build/build.sh`) builds the SPA and cross-compiles `win-amd64`, `mac-arm64`, `mac-amd64` into `dist/`.
Cross-compilation needs no C toolchain because the SQLite driver is pure-Go.

Login during development: `admin` / `admin` or `Jose` / `Jose123` (seeded on first run).

## Backend architecture (`backend/`)

Standard-library `net/http` with the Go 1.22 `ServeMux` (method+path patterns like `GET /api/pacientes/{id}`).
Entry point `cmd/nutriclinica/main.go`: resolve data dir → open DB → verify pragmas → integrity/FK check → migrate → serve embedded SPA → open browser, with a free-port fallback if 5001 is taken.

- `internal/config` resolves the data directory: `--data-dir` > `NUTRICLINICA_DATA` env > portable folder next to the binary > OS user-config dir.
- `internal/store` owns the `*sql.DB`. SQLite is opened with WAL, `foreign_keys=ON`, and `busy_timeout` via DSN pragmas, and **`SetMaxOpenConns(1)`**.
  - Critical consequence of the single connection: never run a query while iterating another query's rows (it deadlocks). List endpoints that need related data use subqueries (see `Pacientes()`) or materialize the parent rows first, then fetch children (see `Compras()`/`Ventas()`). Follow that pattern for any new list-with-children query.
  - Migrations are versioned with `PRAGMA user_version` and embedded SQL in `internal/store/schema/`. `0001` is an exact copy of the original schema (idempotent on existing DBs); `0002` adds the `usuarios` table and seeds `admin`/`Jose`. The schema must stay byte-compatible with the original to preserve existing `pacientes.db`.
- `internal/naming` is a port of the original `nombre_a_prefijo` / `nombre_a_carpeta` (NFKD accent-strip). **Do not change its output**: photo folders already exist on disk keyed by `Carpeta(nombre)`; `naming_test.go` pins the real folder names.
- `internal/models` uses pointer fields (`*float64`, `*string`) so optional columns serialize to JSON `null`, matching the original Flask output. Keep this when adding fields.
- `internal/server` has one handler file per domain; `requireAuth`/`requireAdmin` middleware gate `/api/*` and `/fotos/*` (the whole API requires a session — stricter than the original). Excel export uses `excelize` (`export_handlers.go`).
- `internal/auth` does bcrypt + gorilla/sessions cookies; the signing key is generated once and persisted to `bbdd/secret.key`.

## Frontend architecture (`frontend/src/`)

Organized by feature (`features/{auth,pacientes,stock,usuarios}`), with shared `components/ui`, `components/layout`, and `lib`.
React Router models the navigation: the NavRail and patient tabs are **routes** (`/pacientes/:id/{ficha|revisiones|fotos|analisis}`, `/stock/{almacen|compras|ventas|proveedores}`), so the selected patient and active tab live in the URL, not in state.
`RequireAuth` gates everything via a `GET /api/me` query.

- Server state is TanStack Query. Query keys are centralized in `lib/api/queryKeys.ts`. Mutations invalidate the affected keys; note the cross-entity invalidations: a revisión/foto change also invalidates `pacientes` (the list carries counts), and a compra/venta also invalidates `stock.almacen` (stock is derived as sum(compras) − sum(ventas)).
- All HTTP goes through `lib/api/client.ts` (`credentials: 'include'`); photo upload uses raw `FormData`. Excel/PDF are downloads triggered by navigation (`lib/api/downloads.ts` / `window.print()`).
- The clinical calculations (`calcIMC`, Durnin-Womersley `calcGrasaDW` + Siri, `clasificarGrasa`, lean/fat mass) are a pure, tested port in `lib/calc`. They are clinical: change them only with the golden tests updated in lockstep.
- Charts are `react-chartjs-2`; Chart.js is registered once in `lib/chart/chartSetup.ts`.
- Styling is Tailwind; the original design tokens (primary `#0F7B92`, surfaces, `Hanken Grotesk`, `radius card 18px`, avatar palette) live in `tailwind.config.ts`. Search highlighting and any user-content rendering must stay escaped (no `dangerouslySetInnerHTML`).

## Data, auth, and conventions

- `bbdd/` and `fotos/` hold real patient PII and are gitignored. The Go schema is designed to open the existing `pacientes.db` non-destructively; if FK orphans exist from the old FK-off era, the server logs them and `--fix-orphans` cleans them after a `VACUUM INTO` backup.
- Keep new code in Spanish (identifiers, UI strings, comments) to match the codebase.
- Backend: add a route in the matching `handlers/*.go` and a method in the matching `store/*.go`. Frontend: add a feature file/hook alongside the existing ones; don't reach for global state when the URL or a parent's local state suffices.
