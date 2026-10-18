# Revisiones

Revisiones lists a client's measurements and records a new one. The seeded client `María García López` already has measurements. This recipe opens them and adds one fictional review identified by its note.

## Sub-features

- `revisiones-lista` opens the Revisiones tab of a seeded client.
- `revisiones-alta` saves a review with today's date, a weight, and a fictional note.
- `revisiones-persistencia` shows the note on the tab and in the database.

## How to get to it (user POV)

- Open a client from Clientes and choose the `Revisiones` tab.
- The same tab is `/pacientes/<id>/revisiones`.

## Driving it with verificar

Preconditions:

- `verificar doctor` prints `ok`.
- `María García López` exists and already has at least one review.
- No review note is `revision-luna-ficticia`.

- **Sign in and open Clientes.** Run `verificar browser goto --path /login`, `verificar browser wait --text "Entrar" --timeout 15`, `verificar browser fill --name usuario --value admin`, `verificar browser fill --name password --value admin`, `verificar browser click --role button --name "Entrar"`, `verificar browser wait --text "Pulso de la tienda" --timeout 15`, `verificar browser click --role link --name "Clientes"`, and `verificar browser wait --text "María García López" --timeout 15`.
- **Open the client.** Choose her card. Run `verificar browser click --role button --contains "María García López"` and `verificar browser location --matches "/pacientes/[0-9]+/ficha$"`.
- **Open Revisiones.** Choose the tab. Run `verificar browser click --role link --name "Revisiones"` and `verificar browser wait --text "Nueva revisión" --timeout 15`. Run `verificar browser location --matches "/revisiones$"`. The heading `Revisiones` is visible and the empty state `Sin revisiones` is absent. Run `verificar browser wait --absent "Sin revisiones"`.
- **Open the form.** Choose `+ Nueva revisión`. Run `verificar browser click --role button --name "+ Nueva revisión"` and `verificar browser wait --text "Crear revisión" --timeout 15`. The date field is already today.
- **Enter the measurement.** Set the weight and the note. Run `verificar browser fill --label "Peso (kg)" --value "70.5"` and `verificar browser fill --label "Notas" --value "revision-luna-ficticia"`. Run `verificar browser screenshot --path revisiones/formulario.png`.
- **Save.** Choose `Crear revisión`. Run `verificar browser click --role button --name "Crear revisión"` and `verificar browser wait --text "revision-luna-ficticia" --absent "Crear revisión" --timeout 15`.
- **Proof.** Capture the tab and the row. Run `verificar browser screenshot --path revisiones/lista.png`, `verificar browser text --out revisiones/lista.txt`, and `verificar sql --out revisiones/fila.json "SELECT id, paciente_id, peso, notas FROM revisiones WHERE notas = 'revision-luna-ficticia'"`. The screenshot shows the note. The JSON array has one row with peso `70.5`.

## Gotchas

- The card button's accessible name is the whole card. Use `--contains "María García López"`.
- The date defaults to today and the server accepts today. Do not type a future date; the API rejects it.
- Folds and perimeters must be greater than 0 when present. Leave them empty.
- The dialog shows the date, the weight, the four fat skinfolds (bicipital, tricipital, subescapular, supracrestal), and the four perimeters the measures chart opens with (pecho, cintura, caderas, muslo). The other numbers sit under the `Más medidas` button. That section starts open when the review being edited already stored one of them, or, on a new review, when the client's latest review did.
- `María García López` is a seeded fictional client. Do not replace her with anyone from a real database.
- If `Sin revisiones` appears, the seed did not load her measurements. Stop and report that precondition. Do not switch to a client who has no history just to make the empty-state check pass.
- Creating the review changes her "last review" and can change whether she shows as pending on Inicio and on the client list.
