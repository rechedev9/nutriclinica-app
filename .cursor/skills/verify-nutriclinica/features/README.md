# NutriClínica verification map

This directory is the maintained source for verifying the user-facing behavior of NutriClínica. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `verificar launch` from the repo root. It serves the built SPA and API on `http://127.0.0.1:<port>` with a disposable data directory under `/tmp/nutriclinica-verify/<run>/data`.
- The dev seed signs in as `admin` / `admin`. That password exists only in the disposable database.
- Seeded clients are fictional (for example `María García López`). Do not point the run at `bbdd/` or `fotos/` in the repo.
- Run `verificar doctor` and require `ok` before driving.
- Never drive an instance that this run did not start.

## Driving conventions

- Start every recipe from a fresh launch unless its preconditions say otherwise.
- Prefer the accessible name, `name`, `placeholder`, or `aria-label` that the recipe quotes. Keep those strings unchanged, including `…` and `« »`.
- Run browser actions through `verificar browser`.
- Run read-only database checks through `verificar sql`.
- A client card's main control is a button whose accessible name contains the client name. Match it with `--contains`. An overdue card also has a link named `Revisión` that opens Revisiones. That link does not include the client name.
- When a dialog is open, `click` prefers the control inside the dialog.
- Restore nothing in the disposable database. Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof is a screenshot plus the visible text, with `NutriClínica` identifiable.
- Mutation proof includes the screenshot and a second view: `verificar browser fetch` of the API the screen uses, and `verificar sql` of the inserted row.
- Record the feature file and the entry point with every artifact.
- Report an unreachable path with the command that failed and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verificar` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

## Features

- [Clientes](./clientes.md) covers the client list, search, creating a fictional client, and opening the ficha.
- [Inicio](./inicio.md) covers the home screen after login: till pulse, agenda, reorders, and stock alerts.
- [Tienda](./tienda.md) covers the warehouse list and product search.
- [Ventas](./ventas.md) covers the till: adding a seeded product and charging it by card.
- [Revisiones](./revisiones.md) covers opening a seeded client's measurements and recording a new one.
