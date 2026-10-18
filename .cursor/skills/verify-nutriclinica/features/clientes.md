# Clientes

Clientes lets the professional see the seeded fictional clients, filter them by name, create a new fictional client, and open that client's ficha.

## Sub-features

- `clientes-lista` shows the seeded clients after login.
- `clientes-buscar` filters the cards by name and shows an empty state.
- `clientes-alta` saves a new client from «Nuevo cliente».
- `clientes-ficha` opens the new client's ficha and shows the pending RGPD consent.

## How to get to it (user POV)

- Sign in and choose `Clientes` in the main navigation.
- From Inicio, choose `+ Nuevo cliente` to open the same creation dialog without visiting the list. This recipe uses the list entry.
- On an overdue card, choose `Revisión` to open that client's Revisiones tab. The rest of the card still opens the ficha.

## Driving it with verificar

Preconditions:

- `verificar doctor` prints `ok`.
- The disposable database contains `María García López` and `Carlos Martínez Ruiz`.
- It does not already contain `Luna Queralto Ficticia`.

- **Open login.** Go to the sign-in screen. Run `verificar browser goto --path /login` and `verificar browser wait --text "Entrar" --timeout 15`. The heading `NutriClínica` and the button `Entrar` are visible.
- **Sign in.** Type the dev user and choose `Entrar`. Run `verificar browser fill --name usuario --value admin`, `verificar browser fill --name password --value admin`, and `verificar browser click --role button --name "Entrar"`. Run `verificar browser wait --text "Pulso de la tienda" --timeout 15`. Inicio is visible.
- **Open the list.** Choose `Clientes`. Run `verificar browser click --role link --name "Clientes"` and `verificar browser wait --text "Revisión pendiente" --timeout 15`. The list shows `María García López` and `Carlos Martínez Ruiz`.
- **Filter.** Type the seeded name in `Buscar cliente…`. Run `verificar browser fill --placeholder "Buscar cliente…" --value "María García López"` and `verificar browser wait --text "María García López" --absent "Carlos Martínez Ruiz" --timeout 15`. Only the matching card remains.
- **Clear.** Empty the search. Run `verificar browser fill --placeholder "Buscar cliente…" --value ""` and `verificar browser wait --text "Carlos Martínez Ruiz" --timeout 15`. The other card is back.
- **Empty state.** Search for an absent name. Run `verificar browser fill --placeholder "Buscar cliente…" --value "volcan-ficticio"` and `verificar browser wait --text "Ningún cliente coincide con «volcan-ficticio»." --absent "María García López" --timeout 15`.
- **Reset.** Clear the search again. Run `verificar browser fill --placeholder "Buscar cliente…" --value ""` and `verificar browser wait --text "María García López" --timeout 15`.
- **Open the form.** Choose `+ Nuevo cliente`. Run `verificar browser click --role button --name "+ Nuevo cliente"` and `verificar browser wait --text "Crear cliente" --timeout 15`. The dialog title is `Nuevo cliente`.
- **Enter the fictional client.** Fill name, email, and DNI. Run `verificar browser fill --label "Nombre *" --value "Luna Queralto Ficticia"`, `verificar browser fill --label "Email" --value "luna.queralto.ficticia@example.com"`, and `verificar browser fill --label "DNI / NIF" --value "00000000T"`. Run `verificar browser screenshot --path clientes/formulario.png`. The dialog shows those three values.
- **Save.** Choose `Crear cliente`. Run `verificar browser click --role button --name "Crear cliente"` and `verificar browser wait --text "Luna Queralto Ficticia" --absent "Crear cliente" --timeout 15`. The dialog closes and the new card is on the list.
- **Open the ficha.** Choose the new card. Run `verificar browser scroll --text "Luna Queralto Ficticia"`, `verificar browser click --role button --contains "Luna Queralto Ficticia"`, and `verificar browser location --matches "/pacientes/[0-9]+/ficha$"`. Run `verificar browser wait --text "Consentimiento RGPD pendiente" --timeout 15` and `verificar browser wait --text "luna.queralto.ficticia@example.com"`.
- **Proof.** Capture the ficha, the list API, and the row. Run `verificar browser screenshot --path clientes/ficha.png`, `verificar browser text --out clientes/ficha.txt`, `verificar browser fetch --path /api/pacientes --out clientes/pacientes.json`, and `verificar sql --out clientes/fila.json "SELECT id, nombre, email, dni FROM pacientes WHERE nombre = 'Luna Queralto Ficticia'"`. The screenshot shows the name and the pending consent. The JSON array has one row with that email and DNI `00000000T`.

## Gotchas

- `Revisión pendiente` is the list's own filter. Inicio says `revisión vencida` or `sin consentimiento RGPD`, so that string is the arrival check.
- The search placeholder uses the ellipsis character `…`, and the empty state uses `« »`.
- The filter is deferred one frame. Wait for the absent name instead of asserting immediately.
- A client card's main control is a button whose accessible name contains the client name. Match it with `--contains`. An overdue card also has a link named `Revisión`. The card button still opens the ficha.
- The nav item `Clientes` is a link. On a ficha, the back control `Clientes` is a button.
- `Crear cliente` exists only in the dialog. `+ Nuevo cliente` does not contain that string.
- Leave consent unchecked. The ficha then shows `Consentimiento RGPD pendiente`.
- `00000000T` and `luna.queralto.ficticia@example.com` are fictional. Do not replace them with a real identity.
- A second pass on the same database creates another client with the same name. Start from a fresh `verificar launch` when the name must be absent.
