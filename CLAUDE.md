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
- `go build ./...` — compile. `go test ./...` — tests. `go vet ./...` — vet. `gofmt -l .` lists unformatted files; `gofmt -w .` fixes them (keep the tree gofmt-clean).
- Single test: `go test ./internal/naming -run TestCarpeta` (the only package with tests today is `internal/naming`).
- Run against real data: `go run ./cmd/nutriclinica` (serves http://127.0.0.1:5001, opens browser).
- Flags: `--data-dir <path>`, `--port N`, `--no-browser`, `--fix-orphans`.

Frontend (from `frontend/`, uses **pnpm**):
- `pnpm install` then `pnpm dev` — Vite dev server on :5173, proxies `/api`, `/fotos`, `/login`, `/logout` to the Go backend on :5001 (run the backend separately).
- `pnpm build` — typecheck (`tsc --noEmit`) + build the SPA into `backend/web/dist` (where Go embeds it).
- `pnpm test` — Vitest (the clinical calc golden tests live in `src/lib/calc/__tests__`). Single file: `pnpm vitest run src/lib/calc`; single case: `pnpm vitest run -t "calcIMC"`.
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
- Git remotes: `origin` is the owner's **private** repo (`rechedev9/nutriclinica`) — push here; `upstream` is the original `granrafael/nutriclinica` it derived from. The seed users (`admin`/`admin`, `Jose`/`Jose123`) are dev defaults; rotate them in-app before real use.
- Keep new code in Spanish (identifiers, UI strings, comments) to match the codebase.
- Backend: add a route in the matching `handlers/*.go` and a method in the matching `store/*.go`. Frontend: add a feature file/hook alongside the existing ones; don't reach for global state when the URL or a parent's local state suffices.

## Convenciones de código (criterio)

Adaptadas a este stack (Go + React/Vite/TS + Zod + Tailwind, app en español).
Las reglas de otros entornos (Elysia/Eden, TypeBox, Lingui, mecánicas de juego como inventario, member badges o diminishing-returns) no aplican aquí y se omiten a propósito.

### TypeScript / seguridad de tipos
- La validación en runtime es con **Zod** (la librería elegida); no introduzcas otra librería de validación.
- No uses `as any`, casts `as <Tipo>` para esquivar el chequeo, ni el operador `!` (non-null).
El `tsconfig` es estricto con `noUncheckedIndexedAccess`: modela la nulabilidad de forma explícita.
El backend Go emite `null` (campos puntero) y los tipos de `src/types/` lo reflejan con `| null`.
- No hay inferencia de tipos extremo a extremo desde el backend (es Go), no hay equivalente a Eden.
Los tipos de `src/types/` se mantienen a mano como espejo del JSON de Go; la fuente de verdad es el handler/modelo Go.
Si un tipo no cuadra, corrige el tipo (o el handler), no lo fuerces con un cast; valida con Zod las respuestas críticas.
- Evita los barrels de re-export.
Los únicos agregadores permitidos son `src/types/index.ts` y `src/lib/calc/index.ts`; no añadas más, importa desde el módulo que define el símbolo y actualiza los imports al mover código.
- Importa desde el subpaquete concreto, no desde un barrel (p. ej. `@radix-ui/react-dialog`).
Este proyecto no usa lodash, date-fns, MUI ni una librería de iconos.

### Backend Go: transacciones y errores
- Dentro de una transacción usa el handle `tx`, nunca el `s.DB` exterior (ver `CreateCompra`/`CreateVenta`/`DeleteCompra`/`DeletePaciente`).
- El pool tiene una sola conexión (`SetMaxOpenConns(1)`), así que las escrituras ya están serializadas.
Para invariantes multi-sentencia usa una transacción, y NUNCA ejecutes una query mientras iteras las filas de otra (deadlock; ver la sección de arquitectura).
- Errores HTTP con `writeError(w, status, msg)`.
Dentro de una transacción no escribas la respuesta: devuelve el error para hacer rollback y escribe el status en el handler, después del commit/rollback.

### Asíncrono
- Frontend: usa `Promise.all` para operaciones independientes; encadenar `await` de cosas independientes es un bug de rendimiento (TanStack Query ya paraleliza las queries independientes).
- Backend: las operaciones de BBDD van en secuencia (una sola conexión); no las paralelices con goroutines.

### Cambios numéricos
- Si piden un ajuste ("+30%"), haz la aritmética y escribe la constante raíz resultante; no apiles un multiplicador encima del valor existente.

### UI y estilo
- Respeta los tokens de diseño de `tailwind.config.ts` (paleta `primary`/`surface`, radios `rounded-card`/`rounded-lg`, sombras `card`/`md`, fuente Hanken Grotesk).
El redondeo es deliberado en este diseño: usa los radios del theme, no valores sueltos.
- Iconos: SVG inline coherente con los componentes existentes; no añadas una librería de iconos.
- En botones, indica la carga con la prop `isLoading` del componente `Button` (muestra un spinner en el color del texto, deshabilita y conserva el ancho); no cambies el texto del botón a mano ni añadas elementos que descuadren.
- Nunca dejes texto en inglés visible para el usuario: todas las cadenas de UI van en español.
No hay capa de i18n (app monolingüe), así que escribe el español directamente (sin envoltorios de traducción).

### Imágenes
- Para imágenes raster nuevas, prefiere **WebP** (lossless para pixel-art/iconos, lossy q85-90 para fotografía); PNG/JPEG solo para OG/social.
No cambies la extensión de assets existentes.
Las fotos de pacientes conservan el formato con que se suben (el backend preserva la extensión original).

### Documentación
- Mantén este CLAUDE.md al día: si un cambio deja obsoleta una referencia (ruta, función, flag), arregla todas las referencias muertas en el mismo turno.
