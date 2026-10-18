# Inicio

Inicio is the screen after sign-in. It shows the day's workload, the till pulse, the client agenda, reorder suggestions, products to restock, and products with stock and no recent sales.

## Sub-features

- `inicio-sesion` lands on Inicio after a successful sign-in.
- `inicio-pulso` shows `Pulso de la tienda` with today, this week, and this month.
- `inicio-agenda` shows `Agenda de clientes` for the seeded fictional clients.
- `inicio-atajos` offers `+ Nueva venta` and `+ Nuevo cliente`.
- `inicio-reponer` lists products at or under the minimum. A row with a supplier is a link labelled `Pedir`. It opens `/stock/pedidos?reponer=<supplier id>` with the new-order dialog already filled. A row without a supplier still opens Almacén. `+ Registrar compra` still opens Compras.

## How to get to it (user POV)

- Sign in. The app opens Inicio.
- Choose `Inicio` in the main navigation.
- Open `/`. The app redirects to `/inicio`.

## Driving it with verificar

Preconditions:

- `verificar doctor` prints `ok`.
- The dev user `admin` / `admin` still has the seeded password.

- **Sign in.** Open the form and enter the dev user. Run `verificar browser goto --path /login`, `verificar browser wait --text "Entrar" --timeout 15`, `verificar browser fill --name usuario --value admin`, `verificar browser fill --name password --value admin`, and `verificar browser click --role button --name "Entrar"`.
- **Land on Inicio.** Wait for the till card. Run `verificar browser wait --text "Pulso de la tienda" --timeout 15` and `verificar browser location --matches "/inicio$"`.
- **See the cards.** Confirm the five areas. Run `verificar browser wait --text "Cobrado en caja"`, `verificar browser wait --text "Agenda de clientes"`, `verificar browser wait --text "Recompras"`, `verificar browser wait --text "Por reponer"`, and `verificar browser wait --text "Sin movimiento"`.
- **See the shortcuts.** Confirm the two actions. Run `verificar browser wait --text "+ Nueva venta"` and `verificar browser wait --text "+ Nuevo cliente"`.
- **Proof.** Capture the screen. Run `verificar browser screenshot --path inicio/panorama.png` and `verificar browser text --out inicio/panorama.txt`. The artifacts show `NutriClínica`, `Pulso de la tienda`, and `Agenda de clientes`.

## Gotchas

- Inicio labels the till figure `Cobrado en caja`. Estadísticas labels a different rule `Ventas netas`. Do not treat a mismatch between those two screens as a bug in this recipe.
- Seeded clients can appear in the agenda because their reviews are old. That is the seeded state, not a new mutation.
- `+ Nuevo cliente` on this screen opens the same dialog as the list. Creating the client belongs to the Clientes recipe.
- A wrong password shows `Usuario o contraseña incorrectos`. The login allows 10 attempts per minute; after that the API returns 429.
