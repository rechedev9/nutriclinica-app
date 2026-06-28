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
- Single test: `go test ./internal/naming -run TestCarpeta`. Test packages today: `internal/naming`, `internal/store` (stock/audit on a temp DB), `internal/server` (rate limiter, password policy, anti-traversal), `internal/crypto` (envelope vault).
- Run against real data: `go run ./cmd/nutriclinica` (serves http://127.0.0.1:5001, opens browser).
- Flags: `--data-dir <path>`, `--port N`, `--no-browser`, `--fix-orphans`, `--cifrar` (encryption at rest: prompts for a master password in the browser; off by default).

Frontend (from `frontend/`, uses **pnpm**):
- `pnpm install` then `pnpm dev:full` — starts **both** the Go backend (:5001) and the Vite dev server (:5173) together via `concurrently` (Ctrl+C stops both). Open http://localhost:5173. The backend uses the repo's `bbdd/` and `fotos/` (`--data-dir ..`).
- `pnpm dev` runs only Vite (:5173); it proxies `/api` and `/fotos` to the backend on :5001, so the backend must already be running or proxied requests 500 with ECONNREFUSED. `/login` and `/logout` are SPA client routes; auth lives under `/api` (`POST /api/login`, `POST /api/logout`, `GET /api/me`).
- `pnpm build` — typecheck (`tsc --noEmit`) + build the SPA into `backend/web/dist` (where Go embeds it).
- `pnpm test` — Vitest (the clinical calc golden tests live in `src/lib/calc/__tests__`). Single file: `pnpm vitest run src/lib/calc`; single case: `pnpm vitest run -t "calcIMC"`.
- pnpm gotcha (pnpm 11+): build-script approval lives in `frontend/pnpm-workspace.yaml` (`allowBuilds: esbuild: true`), not in `package.json`.

Full release build: `pwsh build/build.ps1` (or `build/build.sh`) builds the SPA, cross-compiles `win-amd64`, `mac-arm64`, `mac-amd64` into `dist/`, and assembles ready-to-distribute folders `dist/NutriClinica-Windows/` and `dist/NutriClinica-macOS/`.
Cross-compilation needs no C toolchain because the SQLite driver is pure-Go (`github.com/ncruces/go-sqlite3`, SQLite compiled to WASM and run via wazero).
The distributable folders bundle the binary plus the launchers in `deploy/`: on Windows the end user double-clicks `Crear acceso directo.bat` (runs `crear-acceso-directo.ps1`) to drop a `NutriClínica` shortcut on the Desktop pointing at `NutriClinica.exe` with `icono_nutri.ico`; on macOS they use `NutriClinica.command`. The app is portable: `bbdd/` and `fotos/` are created next to the binary, so to migrate data the user copies those folders into the install dir.

Login during development: `admin` / `admin` or `Jose` / `Jose123` (seeded on first run).

## Backend architecture (`backend/`)

Standard-library `net/http` with the Go 1.22 `ServeMux` (method+path patterns like `GET /api/pacientes/{id}`).
Entry point `cmd/nutriclinica/main.go`: resolve data dir → build the `abrir(dek)` callback (open DB → verify pragmas → integrity/FK check → migrate) → construct the server → serve embedded SPA → open browser, with a free-port fallback if 5001 is taken. With `--cifrar` the server starts **locked** (no DB) and `abrir` runs only after the master password is supplied via the unlock flow.
- `internal/config` resolves the data directory: `--data-dir` > `NUTRICLINICA_DATA` env > portable folder next to the binary > OS user-config dir. `Paths` also exposes `VaultKey` (`bbdd/keyvault.json`).
- `internal/store` owns the `*sql.DB`. `Open(dbPath, dek)`: with `dek=nil` the DB is plaintext; with a 32-byte `dek` it is encrypted at rest via the Adiantum VFS (`?vfs=adiantum&hexkey=…`, WAL + `locking_mode=EXCLUSIVE`). Opened with `foreign_keys=ON` and `busy_timeout`, and **`SetMaxOpenConns(1)`**.
  - Critical consequence of the single connection: never run a query while iterating another query's rows (it deadlocks). List endpoints that need related data use subqueries (see `Pacientes()`) or materialize the parent rows first, then fetch children (see `Compras()`/`Ventas()`); `lineasPorPadre` batches lines with a single `WHERE … IN (…)`. Follow that pattern for any new list-with-children query.
  - `IsUniqueViolation` uses the ncruces `*sqlite3.Error` extended code (`CONSTRAINT_UNIQUE`), not string matching.
  - Migrations are versioned with `PRAGMA user_version` and embedded SQL in `internal/store/schema/` (target version in `migrate.go`). `0001` exact copy of the original schema; `0002` `usuarios` + seeds `admin`/`Jose`; `0003` FK indexes; `0004` `audit_log`; `0005` patient `consentimiento`/`consentimiento_fecha` (RGPD). `0001`/`0002` must stay byte-compatible with the original to preserve existing `pacientes.db`.
- `internal/crypto` implements envelope encryption for the DB key: a random DEK (encrypts the DB) wrapped under both the master password and a recovery key (Argon2id + AES-256-GCM), persisted to `keyvault.json`. Either secret opens it; lose both and the data is unrecoverable. `store.CifrarBaseExistente` migrates an existing plaintext DB to encrypted via the SQLite backup API (leaves `<db>.plain-bak`, unencrypted, to delete by hand).
- `internal/naming` is a port of the original `nombre_a_prefijo` / `nombre_a_carpeta` (NFKD accent-strip). **Do not change its output**: photo folders already exist on disk keyed by `Carpeta(nombre)`; `naming_test.go` pins the real folder names.
- `internal/models` uses pointer fields (`*float64`, `*string`) so optional columns serialize to JSON `null`, matching the original Flask output. Keep this when adding fields.
- `internal/server` has one handler file per domain. The store lives in an `atomic.Pointer` (nil until unlocked); handlers read it via `s.db()`. Global middleware chain: `loggingMW → securityHeadersMW (CSP/X-Frame/etc.) → recoverMW → gateMW (503 on `/api/*` and `/fotos/*` while locked, except the lifecycle endpoints) → auditMW (logs mutations + exports to `audit_log`)`. `requireAuth`/`requireAdmin` gate `/api/*` and `/fotos/*` (the whole API requires a session). Login is timing-safe and rate-limited (`limitMW`); `validarPassword` enforces a minimum length. Lifecycle endpoints (no auth/gate): `GET /api/estado`, `POST /api/configurar`, `POST /api/unlock`. Excel export uses `excelize` (`export_handlers.go`).
- `internal/auth` does bcrypt + gorilla/sessions cookies (`SameSite=Strict`; `Login` regenerates the session to avoid fixation); the signing key is generated once and persisted to `bbdd/secret.key`.

## Frontend architecture (`frontend/src/`)

Organized by feature (`features/{auth,pacientes,stock,usuarios,cifrado,auditoria}`), with shared `components/ui`, `components/layout`, and `lib`.
React Router models the navigation: the NavRail and patient tabs are **routes** (`/pacientes/:id/{ficha|revisiones|fotos|analisis}`, `/stock/{almacen|compras|ventas|proveedores}`), so the selected patient and active tab live in the URL, not in state. The stock module, Usuarios, Auditoría and the Análisis tab (which pulls in Chart.js) are `React.lazy` route chunks behind a `Suspense` in `AppShell`.
`CifradoGate` (in `main.tsx`, around the router) reads `GET /api/estado` and shows the configure/unlock screen when the DB is encrypted-and-locked; in the default (unencrypted) mode the state is always `abierto`, so it is transparent. `RequireAuth` then gates the app via a `GET /api/me` query. A top-level `ErrorBoundary` keeps a render error from blanking the app.

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
- **Modo claro/oscuro** con `darkMode: 'class'`. Los tokens semánticos (`app`, `surface`, `surface-2`, `border`, `ink`, `ink-muted`, `primary-light`) son **variables CSS** definidas en `src/index.css` (`:root` y `.dark`), así que `bg-surface`/`text-ink`/`border-border` se adaptan solos. Usa siempre estos tokens para superficies y texto; nunca `bg-white` ni hex literales (rompen el dark). El tema lo gestiona `src/lib/theme/ThemeProvider.tsx` (preferencia `light`/`dark`/`system` en `localStorage('nutri-theme')`, con script anti-flash en `index.html`). Los gráficos Chart.js toman sus colores de `src/lib/chart/useChartTheme.ts` (grid/ticks/leyenda/tooltip) e incluyen el tema en las deps de `useMemo(options)`.
- Modales (`components/ui/Modal.tsx`, `ConfirmDialog.tsx`): el `Content` de Radix se centra con un wrapper flex (`fixed inset-0 flex items-center justify-center`, `pointer-events-none` en el wrapper y `pointer-events-auto` en el `Content`), NUNCA con `-translate-x/y-1/2`: ese transform de centrado choca con el `transform` de la animación de entrada (`animate-slideUp`) y deja el modal anclado por una esquina.
- Inputs: usan `bg-app` (look inset) con borde, para distinguirse de la tarjeta (`bg-surface`) en claro y oscuro; al enfocar pasan a `bg-surface`.
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
