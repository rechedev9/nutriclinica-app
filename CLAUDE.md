# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NutriClínica is a single-practitioner desktop web app for a nutritionist (patients, anthropometric reviews, progress photos, and a small inventory/point-of-sale module).
It runs locally on the practitioner's machine (Windows or macOS) and is distributed as a single self-contained binary that embeds the web UI and opens the browser; the database itself is a **PostgreSQL instance on AWS RDS**, reached over the network (not an embedded local file — see below).
The whole codebase, UI, and domain vocabulary are in Spanish.

The app was ported from a Flask + vanilla-JS monolith to a Go backend + React frontend.
The original files (`app.py`, `templates/`, `static/`, `iniciar.*`) are kept only as a reference for behavior parity; the live app is `backend/` + `frontend/`.

## Layout

```
backend/    Go 1.22 API + PostgreSQL (RDS) client, embeds the built SPA, single binary
frontend/   React + Vite + TypeScript + TanStack Query + Tailwind
build/      build.ps1 / build.sh (build SPA + cross-compile binaries)
bbdd/       secret.key (session signing key) + S3 backup state — gitignored. No DB file anymore: the data lives in Postgres/RDS.
fotos/      progress photos on disk — gitignored
dist/       cross-compiled release binaries — gitignored
```

## Commands

Backend (from `backend/`):
- `go build ./...` — compile. `go test ./...` — tests. `go vet ./...` — vet. `gofmt -l .` lists unformatted files; `gofmt -w .` fixes them (keep the tree gofmt-clean).
- Single test: `go test ./internal/naming -run TestCarpeta`. Test packages today: `internal/naming`, `internal/store` (stock/audit, needs a real Postgres — see below), `internal/server` (rate limiter, password policy, anti-traversal, photo encryption; the Postgres-backed test skips without a DB), `internal/crypto` (photo encryption envelope).
- **The `internal/store` and `internal/server` integration tests need a real PostgreSQL reachable via `NUTRICLINICA_PG_*` env vars (see below); they call `t.Skip` automatically if `NUTRICLINICA_PG_HOST` isn't set.** Each test creates its own disposable Postgres schema (`CREATE SCHEMA test_<timestamp>`) and drops it in `t.Cleanup`, so tests are isolated even against a shared instance.
- Run against real data: `go run ./cmd/nutriclinica` (serves http://127.0.0.1:5001, opens browser). Requires `NUTRICLINICA_PG_*` env vars set (connection to RDS) — the app has no local embedded DB anymore.
- Required env vars: `NUTRICLINICA_PG_HOST`, `NUTRICLINICA_PG_USER`, `NUTRICLINICA_PG_PASSWORD`, `NUTRICLINICA_PG_DBNAME`. Optional: `NUTRICLINICA_PG_PORT` (default `5432`), `NUTRICLINICA_PG_SSLMODE` (default `require`, since RDS requires TLS).
- Flags: `--data-dir <path>` (now only holds `bbdd/secret.key` and `fotos/`), `--port N`, `--no-browser`, `--host` (bind address, `0.0.0.0` for server/container deployment), `--https` (marks the session cookie `Secure`, for use behind TLS/a reverse proxy). `--cifrar` and `--fix-orphans` were removed when the DB moved to Postgres/RDS (see "Backend architecture" below).
- One-off data migration from an existing SQLite `pacientes.db`: `go run ./cmd/migrate_to_postgres --sqlite <ruta/a/pacientes.db>` (with `NUTRICLINICA_PG_*` pointed at the destination). Applies the schema, **truncates every table** (to avoid clashing with the demo seed data), then copies every row preserving ids and resets the Postgres sequences to the imported max id. `cmd/seed` and `cmd/seed_pacientes` are unrelated dev-only demo-data seeders, also now pointed at Postgres via the same env vars.

Frontend (from `frontend/`, uses **pnpm**):
- `pnpm install` then `pnpm dev:full` — starts **both** the Go backend (:5001) and the Vite dev server (:5173) together via `concurrently` (Ctrl+C stops both). Open http://localhost:5173. The backend uses the repo's `bbdd/` and `fotos/` (`--data-dir ..`).
- `pnpm dev` runs only Vite (:5173); it proxies `/api` and `/fotos` to the backend on :5001, so the backend must already be running or proxied requests 500 with ECONNREFUSED. `/login` and `/logout` are SPA client routes; auth lives under `/api` (`POST /api/login`, `POST /api/logout`, `GET /api/me`).
- `pnpm build` — typecheck (`tsc --noEmit`) + build the SPA into `backend/web/dist` (where Go embeds it).
- `pnpm test` — Vitest (the clinical calc golden tests live in `src/lib/calc/__tests__`). Single file: `pnpm vitest run src/lib/calc`; single case: `pnpm vitest run -t "calcIMC"`.
- pnpm gotcha (pnpm 11+): build-script approval lives in `frontend/pnpm-workspace.yaml` (`allowBuilds: esbuild: true`), not in `package.json`.

Full release build: `pwsh build/build.ps1` (or `build/build.sh`) builds the SPA, cross-compiles `win-amd64`, `mac-arm64`, `mac-amd64`, `linux-amd64` into `dist/`, and assembles ready-to-distribute folders `dist/NutriClinica-Windows/` and `dist/NutriClinica-macOS/`.
Cross-compilation needs no C toolchain because the Postgres driver is pure-Go (`github.com/jackc/pgx/v5`, no cgo).
The distributable folders bundle the binary plus the launchers in `deploy/`: on Windows the end user double-clicks `Crear acceso directo.bat` (runs `crear-acceso-directo.ps1`) to drop a `NutriClínica` shortcut on the Desktop pointing at `NutriClinica.exe` with `icono_nutri.ico`; on macOS they use `NutriClinica.command`. The binary itself is portable (`fotos/` and `bbdd/secret.key` are created next to it), but it now needs network reachability to the Postgres/RDS instance and the `NUTRICLINICA_PG_*` env vars to actually start — it is no longer a fully offline app.

Login during development: `admin` / `admin` or `Jose` / `Jose123` (seeded on first run).

## Backend architecture (`backend/`)

Standard-library `net/http` with the Go 1.22 `ServeMux` (method+path patterns like `GET /api/pacientes/{id}`).
Entry point `cmd/nutriclinica/main.go`: resolve data dir + Postgres config from env → build the `abrir()` callback (connect to Postgres → migrate) → construct the server (opens the DB immediately, no locked state) → serve embedded SPA → open browser, with a free-port fallback if 5001 is taken.
- `internal/config` resolves the data directory: `--data-dir` > `NUTRICLINICA_DATA` env > portable folder next to the binary > OS user-config dir. `Paths` now only covers `FotosDir` and `SecretKey` — the DB connection is resolved separately by `PostgresFromEnv()` (`NUTRICLINICA_PG_HOST`/`_PORT`/`_USER`/`_PASSWORD`/`_DBNAME`/`_SSLMODE`, see "Commands" above).
- `internal/store` owns the `*sql.DB`, backed by PostgreSQL via the pure-Go `jackc/pgx/v5` driver (`sql.Open("pgx", …)`). `Open(cfg Config)` builds the DSN from host/port/user/password/dbname/sslmode (`sslmode` defaults to `require`, since RDS requires TLS). No `SetMaxOpenConns` limit anymore — Postgres has its own concurrency, unlike the old single-connection SQLite pool.
  - The old "never query while iterating another query's rows" SQLite deadlock no longer applies with a real connection pool, but the batching patterns from that era (subqueries in `Pacientes()`, materialize-then-batch in `Compras()`/`Ventas()` via `lineasPorPadre`, a single `WHERE … IN (…)`) were kept because they're still the more efficient way to avoid N+1 — follow that pattern for any new list-with-children query.
  - `IsUniqueViolation` checks a `*pgconn.PgError` with code `23505` (`unique_violation`), not string matching.
  - Migrations are versioned in a `schema_migrations` table (Postgres has no `PRAGMA user_version`) with embedded SQL in `internal/store/schema/` (target version in `migrate.go`, `applySQLFile` splits each file on `;` and runs it in a transaction — pgx doesn't reliably run multi-statement `Exec` like SQLite did). Identity columns use `GENERATED BY DEFAULT AS IDENTITY` (not `ALWAYS`) so the one-off data-migration tool can insert explicit ids. `0007` also seeds demo stock data on a fresh (empty) install — `cmd/migrate_to_postgres` truncates everything before importing real data specifically to avoid colliding with those seeded ids.
  - There is no more DB-level encryption at rest (see below) and no more legacy FK-off cleanup: `fixorphans.go`/`migrar_cifrado.go` and the `--fix-orphans`/`--cifrar` flags were removed — Postgres always enforces FKs, and RDS encrypts at rest at the infrastructure level (a checkbox when creating the instance), not in app code.
- `internal/crypto` now only covers **photo** encryption at rest (`fichero.go`: `CifrarFichero`/`DescifrarFichero`, AES-256-GCM, `NUTRIENC1` marker) — independent of the DB and unaffected by the Postgres migration. It is currently unreachable in the running app (nothing sets a non-nil `fotoKey` anymore, since the DB-encryption configure/unlock flow that used to derive it was removed), but the primitives and their tests were kept since they're DB-agnostic; `vault.go`'s envelope encryption (`NuevoVault`/`Parse`) is also kept for the same reason even though nothing currently calls it in the app.
- `internal/naming` is a port of the original `nombre_a_prefijo` / `nombre_a_carpeta` (NFKD accent-strip). **Do not change its output**: photo folders already exist on disk keyed by `Carpeta(nombre)`; `naming_test.go` pins the real folder names.
- `internal/models` uses pointer fields (`*float64`, `*string`) so optional columns serialize to JSON `null`, matching the original Flask output. Keep this when adding fields.
- `internal/server` has one handler file per domain. The store is a plain field (`Server.dbStore`, opened once in `New()` — no more locked/atomic-pointer state); handlers read it via `s.db()`. Global middleware chain: `loggingMW → securityHeadersMW (CSP/X-Frame/etc.) → recoverMW → auditMW (logs mutations + exports to `audit_log`)`. `requireAuth`/`requireAdmin` gate `/api/*` and `/fotos/*` (the whole API requires a session). Login is timing-safe and rate-limited (`limitMW`); `validarPassword` enforces a minimum length. `GET /api/estado` has no auth (the SPA calls it on load) and now always returns `"abierto"` — there's no more locked/configure/unlock state. Excel export uses `excelize` (`export_handlers.go`).
  - Validación en servidor (`validacion.go`, equivalente a los esquemas Zod del frontend): rangos clínicos de pacientes y revisiones (peso 1 a 500 kg, talla 30 a 260 cm, pliegues y perímetros > 0, fechas no futuras), productos y líneas de compra/venta (cantidad > 0, precios >= 0). Todo con 400 y el mensaje del contrato.
  - Reglas de stock (`store/stock.go`, 409): una venta o merma no puede superar las existencias (`StockInsuficienteError`), y borrar o reducir una compra no puede dejar el stock en negativo (`StockNegativoError`). Se bloquean las filas de producto (`FOR UPDATE`, en orden de id); un producto inexistente o dado de baja da 400. Categorías y proveedores en uso no se borran (409); el nombre de categoría duplicado da 409 (con lock de asesoría para serializar).
  - Usuarios: no se puede borrar la propia cuenta (400) ni borrar o degradar al último administrador (409, `ErrUltimoAdmin`).
  - Auditoría: login y logout se anotan como "Acceso" y "Salida" (el login fallido no hereda el usuario de una sesión previa); el resto, con el método HTTP.
- `internal/auth` does bcrypt + gorilla/sessions cookies (`SameSite=Strict`; `Login` regenerates the session to avoid fixation); the signing key is generated once and persisted to `bbdd/secret.key`. `NewManager` takes a `secureCookie bool` (wired from `--https`) to mark the cookie `Secure` when served behind TLS.
- `internal/backup` is an optional, off-by-default background uploader to S3 of **photos only** (for an off-site copy the developer can pull from home). It no longer backs up the database: now that the DB lives in RDS, AWS already takes automated backups/snapshots at the infrastructure level, so dumping it to S3 too was redundant and added an extra dependency (`pg_dump` installed on every machine running the app) for little benefit — photos, on the other hand, only ever exist on local disk, so they still need this. Activated only if `NUTRICLINICA_S3_BUCKET` is set (see `DesdeEntorno`); other env vars: `NUTRICLINICA_S3_REGION`, `NUTRICLINICA_S3_PREFIJO`, `NUTRICLINICA_S3_INTERVALO_MIN` (default 30). AWS credentials come from the SDK's default chain (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, a profile, etc.) — use an IAM user restricted to `s3:PutObject` on the target bucket/prefix only. Every tick it zips `fotos/` (preserving the per-patient folder structure), then **hashes it (SHA-256) and compares against the last upload** (recorded in `<dataDir>/bbdd/.s3backup-estado.json`) — if unchanged, it skips the tick with zero S3 calls and zero cost; otherwise it's a single `PutObject` to a fixed key (`<prefijo>/fotos.zip`) that overwrites the previous upload. Wired from `main.go`, called with just `fotosDir` now (no `store.Config` needed anymore).

## Frontend architecture (`frontend/src/`)

Organized by feature (`features/{auth,pacientes,stock,usuarios,cifrado,auditoria}`), with shared `components/ui`, `components/layout`, and `lib`.
React Router models the navigation: the NavRail and patient tabs are **routes** (`/pacientes/:id/{ficha|revisiones|fotos|analisis}`, `/stock/{almacen|compras|ventas|proveedores}`), so the selected patient and active tab live in the URL, not in state. The stock module, Usuarios, Auditoría and the Análisis tab (which pulls in Chart.js) are `React.lazy` route chunks behind a `Suspense` in `AppShell`.
`CifradoGate` (in `main.tsx`, around the router) reads `GET /api/estado`, which now always returns `abierto` (the DB-encryption configure/unlock flow was removed when the DB moved to Postgres/RDS) — so this gate is effectively a no-op today, kept as-is rather than ripped out since the frontend wasn't in scope for that change. `RequireAuth` then gates the app via a `GET /api/me` query. A top-level `ErrorBoundary` keeps a render error from blanking the app.

- Rutas protegidas por rol: `RequireAuth` exige sesión y `RequireAdmin` envuelve Usuarios y Auditoría; `NoEncontrada` es la ruta 404 (`*`) y `ErrorRuta` el `errorElement` del router.
- Un 401 fuera de `/api/me`, `/api/login` y `/api/logout` lo trata globalmente `lib/api/sesion.ts` (vacía la caché, redirige a `/login` y avisa una vez); `sesionIniciada()` rearma el aviso tras un login o un `/api/me` correcto.
- Los formularios se validan con Zod (`lib/validacion/esquemas.ts`, `lineas.ts`) y muestran el error bajo cada campo; los errores del servidor se muestran con `mensajeError`. Los buscadores comparan con `normaliza()` (sin acentos ni mayúsculas).
- Server state is TanStack Query. Las consultas de lectura que fallan muestran `components/ui/ErrorState` (distingue 404, sin conexión y otros errores) con botón de reintento, en lugar del estado vacío. Query keys are centralized in `lib/api/queryKeys.ts`. Mutations invalidate the affected keys; note the cross-entity invalidations: a revisión/foto change also invalidates `pacientes` (the list carries counts), and a compra/venta also invalidates `stock.almacen` (stock is derived as sum(compras) − sum(ventas)).
- All HTTP goes through `lib/api/client.ts` (`credentials: 'include'`); photo upload uses raw `FormData`. Excel/PDF are downloads triggered by navigation (`lib/api/downloads.ts` / `window.print()`).
- The clinical calculations (`calcIMC`, Durnin-Womersley `calcGrasaDW` + Siri, `clasificarGrasa`, lean/fat mass) are a pure, tested port in `lib/calc`. They are clinical: change them only with the golden tests updated in lockstep.
- Charts are `react-chartjs-2`; Chart.js is registered once in `lib/chart/chartSetup.ts`.
- Styling is Tailwind; the original design tokens (primary `#0F7B92`, surfaces, `Hanken Grotesk`, `radius card 18px`, avatar palette) live in `tailwind.config.ts`. Search highlighting and any user-content rendering must stay escaped (no `dangerouslySetInnerHTML`).

## Data, auth, and conventions

- Patient PII now lives in PostgreSQL/RDS (not in a local file); `bbdd/` only holds `secret.key` and the S3-backup state file, and `fotos/` still holds the photos on disk — both gitignored.
- Git remotes: `origin` is the **private** repo `rechedev9/nutriclinica-app` (push here; default branch `master`). `upstream` points at `granrafael/nutriclinica`, the original author's private repo this checkout was cloned from, which the `rechedev9` account cannot reach (404), so do not push or fetch there. `rechedev9/nutriclinica` is an older private repo with a different, unrelated history (up to June 2026): leave it alone. `no-mistakes` is a local backup remote. The seed users (`admin`/`admin`, `Jose`/`Jose123`) are dev defaults; rotate them in-app before real use.
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
- El pool de Postgres soporta varias conexiones concurrentes (ya no hay el límite de una sola conexión de la época SQLite). Sigue usando una transacción para invariantes multi-sentencia; ya no hay riesgo de deadlock por anidar queries, pero el código existente sigue evitándolo por eficiencia (ver `lineasPorPadre` en la sección de arquitectura) — no es obligatorio para código nuevo, pero es buena práctica.
- Errores HTTP con `writeError(w, status, msg)`.
Dentro de una transacción no escribas la respuesta: devuelve el error para hacer rollback y escribe el status en el handler, después del commit/rollback.

### Asíncrono
- Frontend: usa `Promise.all` para operaciones independientes; encadenar `await` de cosas independientes es un bug de rendimiento (TanStack Query ya paraleliza las queries independientes).
- Backend: el código actual sigue haciendo las operaciones de BBDD en secuencia (no se ha paralelizado con goroutines); ya no es obligatorio por el pool de una sola conexión de antes, pero tampoco se ha cambiado sin necesidad concreta.

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
