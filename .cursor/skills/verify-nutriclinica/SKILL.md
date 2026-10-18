---
name: verify-nutriclinica
description: "Drives NutriClínica, the local web app a nutrition professional uses for client records and the supplement shop. Use it to launch an isolated instance, exercise the real UI, and capture screenshots, response bodies, and database rows as proof."
---

# Verify NutriClínica

NutriClínica's primary surface is the web UI (Inicio, Clientes, Tienda, Ventas). The same Bun process serves the API and the built SPA and stores everything in a local SQLite file. There is no Go server in this tree.

The helper is `verificar`, the executable at `.cursor/skills/verify-nutriclinica/scripts/verificar`. Run it from anywhere. It finds the repo by its own path.

```bash
chmod +x .cursor/skills/verify-nutriclinica/scripts/verificar
export PATH="$PWD/.cursor/skills/verify-nutriclinica/scripts:$PATH"
```

Two instances can run at once. Each `verificar launch` picks a free port and its own data directory. Pass `--run <id>` when more than one is alive. `current` under the state root remembers only the latest launch. Do not point a run at the repo's `bbdd/` or `fotos/`, and do not use `bun run dev` for this: that command passes `--data-dir ..` and writes into the checkout. Vite's dev proxy is pinned to port 5001, so verification serves the built SPA from the backend instead.

Dev sign-in on a fresh database is `admin` / `admin` (and `Jose` / `Jose123`). Those passwords come from `USUARIOS_INICIALES` and exist only in the disposable database this skill creates.

## Launch

From the repo root, once per checkout when dependencies are missing:

```bash
bun install
```

Start a usable instance:

```bash
verificar launch
```

`verificar launch` does all of the following against an empty directory and prints `run`, `url`, `data`, `evidence`, and `pid`:

1. If `frontend/dist/index.html` is missing, it runs `bun run build` from the repo root. `frontend/dist` is gitignored, so a fresh checkout always builds.
2. It creates `/tmp/nutriclinica-verify/<run>/data` and seeds fictional clients with `bun src/db/sembrar-demo.ts --data-dir <data>` from `backend/`. Opening that database applies the embedded migrations.
3. It starts `bun src/index.ts --no-browser --host 127.0.0.1 --data-dir <data> --port <free>` from `backend/`. Startup creates the dev users and the seeded shop (categories, suppliers, products, purchases, counter sales). `NUTRICLINICA_DATA` is unset for that process. The browser is not opened.
4. It waits until the instance is usable, not merely listening:
   - `GET /api/estado` returns `{"estado":"abierto"}`.
   - `POST /api/login` with `{"usuario":"admin","password":"admin"}` returns 200.
   - `GET /api/pacientes` with that session includes `María García López`.
   - `GET /api/stock/almacen` includes `Whey Protein Concentrada 1 kg`.
   - `GET /` returns HTML whose title is `NutriClínica`.

The login made during launch is thrown away with its cookie. It does count as one of the 10 login attempts allowed per minute.

Evidence for the run is `/tmp/nutriclinica-verify-evidence/<run>/`, created at launch. State (database, logs, Chrome profile) is `/tmp/nutriclinica-verify/<run>/`.

If launch fails, read `/tmp/nutriclinica-verify/<run>/server.log` and run `verificar --run <id> cleanup`.

Override the roots with `NUTRICLINICA_VERIFY_BASE` and `NUTRICLINICA_VERIFY_EVIDENCE` when `/tmp` is not the right place. Both must be outside the repo.

## Doctor

Read-only check. Run it before driving and whenever the instance looks wrong:

```bash
verificar doctor
```

It exits 0 and prints `ok` only when all of these hold:

- The pid from this run's meta is alive and its command line is `src/index.ts` with this run's data directory.
- That process, or a child of it, holds the listening socket for the printed port. The check matches the socket inode under `/proc/<pid>/fd`. It does not look up a process by name.
- `GET /api/estado` returns `abierto`.
- `GET /api/me` without a cookie returns 401.
- `GET /` still contains `<title>NutriClínica</title>`.
- `__migraciones` contains `0000_inicial`, `0001_first_ikaris`, `0002_seccion_ventas`, `0003_control_stock`, and `0004_pedidos_proveedor`. Extra later tags are allowed.
- The `admin` user row exists with role `admin`.
- Exactly one patient is named `María García López`.
- Exactly one product is named `Whey Protein Concentrada 1 kg`.

Doctor does not log in. Login inserts a session; launch already proved the dev password. If sign-in later fails, start a new run instead of reusing a database whose password changed.

`verificar paths` prints the `url`, `data`, and `evidence` lines from the same meta.

## Drive

Drive the UI with Chrome DevTools Protocol through `verificar browser`. The first browser command starts headless Chrome with its own user-data dir inside the run state and reuses one tab after that. Cookies and `sessionStorage` belong to that profile.

Stable handles in this repo:

- Sign-in fields are `input[name=usuario]` and `input[name=password]`. The submit button's name is `Entrar`. There is no `<label>` on those fields.
- Main navigation links, in `nav[aria-label="Navegación principal"]`: `Inicio`, `Clientes`, `Ventas`, `Tienda`, and for admin also `Usuarios` and `Auditoría`.
- Dialogs expose `role="dialog"`. The close control's name is `Cerrar`.
- Client and product fields are `<label>` elements whose first span is the caption (`Nombre *`, `Email`, `DNI / NIF`, `Peso (kg)`, `Notas`).
- The client search placeholder is `Buscar cliente…` and the product search placeholder is `Buscar producto…` (ellipsis character, not three dots).
- The till search input's accessible name is `Añadir producto`. Options use `role="option"`.
- Payment methods use `role="radio"` with names `Efectivo`, `Tarjeta`, `Bizum`, and `Mixto`.

Commands:

```bash
verificar browser goto --path /login
verificar browser fill --name usuario --value admin
verificar browser fill --label "Nombre *" --value "Luna Queralto Ficticia"
verificar browser fill --placeholder "Buscar cliente…" --value "María García López"
verificar browser fill --aria "Añadir producto" --value "Whey"
verificar browser click --role button --name "Entrar"
verificar browser click --role link --name "Clientes"
verificar browser click --role button --contains "Luna Queralto Ficticia"
verificar browser wait --text "Pulso de la tienda" --absent "Carlos Martínez Ruiz" --timeout 15
verificar browser scroll --text "Luna Queralto Ficticia"
verificar browser location --matches "/pacientes/[0-9]+/ficha$"
verificar browser screenshot --path clientes/ficha.png --width 1280 --height 800
verificar browser text --out clientes/ficha.txt
verificar browser fetch --path /api/pacientes --out clientes/pacientes.json
```

`goto` loads `url + path` and waits for `document.readyState === complete`. `wait` polls the visible text (`innerText`) until `--text` is present and `--absent` is missing. `--timeout` is seconds and defaults to 10. `click --name` is exact after collapsing whitespace. `click --contains` matches a control whose accessible name includes the string; client cards need this because the button name is the whole card. While a dialog is open, a click that matches both the page and the dialog uses the dialog control.

`fill` sets the value through the native setter and dispatches `input` and `change`, which is what the React fields listen to. `--value` may be empty.

`screenshot`, `text`, `fetch`, and `verificar sql --out` write under the run's evidence directory. A relative path is resolved there. A path that escapes that directory is rejected. `screenshot --width` and `--height` set the viewport for that capture. `--scroll` brings a visible text into view before the shot. The size does not carry over to the next command.

`fetch` runs in the page, so it sends the browser's session cookie. It is the same `GET` the screen uses, not a test-only route.

`location --matches` tests `location.pathname + location.search` against a JavaScript regular expression.

Read a side effect without writing:

```bash
verificar sql "SELECT id, nombre, email FROM pacientes WHERE nombre = 'Luna Queralto Ficticia'"
verificar sql --out clientes/fila.json "SELECT id, nombre FROM pacientes WHERE nombre = 'Luna Queralto Ficticia'"
```

`verificar sql` accepts one `SELECT` only. It opens the run's database read-only.

The feature map is `features/README.md`. A proof of one convenient screen is incomplete when the map lists other entry points; drive the file you are proving, and report any entry point you did not exercise.

## Evidence

Write proof under `/tmp/nutriclinica-verify-evidence/<run>/` (the `evidence=` line from launch). Cleanup never deletes that directory.

For a UI change, capture:

- the screen where the user acts (screenshot), and
- the screen that shows the outcome (screenshot and `verificar browser text`), and
- the side effect: `verificar browser fetch` of the list the screen loaded, plus `verificar sql` of the inserted or updated row.

Exercise the controls in the feature file. Do not insert rows by calling `POST /api/pacientes` when the recipe says to use the dialog. `POST /api/login` during launch is only the readiness check.

Use the fictional identities already named in the feature files (`Luna Queralto Ficticia`, `luna.queralto.ficticia@example.com`, `00000000T`, notes `verificacion-luna-ficticia` and `revision-luna-ficticia`). Do not type a real name, DNI, phone, or email. Do not open a database from `bbdd/` or a photo from `fotos/`.

There is no external service to mock. The app is offline. Do not treat `bun test` as a substitute for this drive: those tests call the API in-process and do not open the UI.

## Cleanup

Stop only the server and the Chrome this run started, then delete the state directory:

```bash
verificar cleanup
```

With several runs, pass the id:

```bash
verificar --run <id> cleanup
```

Cleanup reads `server.pid` and `chrome.pid`. It signals those pids only when their command line still contains this run's data directory or Chrome profile, and it signals descendants found by parent pid. It does not kill by process name. It removes `/tmp/nutriclinica-verify/<run>/` (database, logs, browser profile) and leaves `/tmp/nutriclinica-verify-evidence/<run>/` in place.

After cleanup, `verificar doctor` fails because the run's state directory is gone. The evidence files must still be readable.

## Helpers

| Helper | Role |
| --- | --- |
| `scripts/verificar` | The only command to invoke. |
| `scripts/navegador.ts` | Chrome DevTools client. `verificar browser` calls it. |
| `scripts/consultar.ts` | Read-only SQLite `SELECT`. `verificar sql` and `verificar doctor` call it. |

Invocations:

```bash
.cursor/skills/verify-nutriclinica/scripts/verificar launch
.cursor/skills/verify-nutriclinica/scripts/verificar doctor
.cursor/skills/verify-nutriclinica/scripts/verificar paths
.cursor/skills/verify-nutriclinica/scripts/verificar browser goto --path /pacientes
.cursor/skills/verify-nutriclinica/scripts/verificar sql "SELECT nombre FROM pacientes"
.cursor/skills/verify-nutriclinica/scripts/verificar cleanup
```

`navegador.ts` arguments are `<state-dir> <url> <evidence-dir> <command>`. Do not call it directly unless you are debugging the helper; the wrapper starts Chrome and checks the paths.

Keep the map honest as the UI changes with `/maintain-verification-skill`.
