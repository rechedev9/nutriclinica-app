# Ventas

Ventas opens on the till. The professional searches a product, adds it to the cart, and charges the sale. This recipe charges one seeded product by card and checks the saved sale.

## Sub-features

- `ventas-caja` opens the till from the main navigation.
- `ventas-anadir` adds `Whey Protein Concentrada 1 kg` from the product search.
- `ventas-cobrar` charges the cart by card and shows the ticket.
- `ventas-nota` stores a fictional note on the sale so the row can be found.

## How to get to it (user POV)

- Choose `Ventas` in the main navigation. The app opens Caja.
- From Inicio, choose `+ Nueva venta`.
- Open `/ventas`. The app redirects to `/ventas/caja`.
- The other tabs are `Historial`, `Cierre de caja`, `Estadísticas`, and `Datos del ticket`.

## Driving it with verificar

Preconditions:

- `verificar doctor` prints `ok`.
- The till for today is not closed. A fresh launch has no closing.
- `Whey Protein Concentrada 1 kg` has stock above zero.
- No sale note is `verificacion-luna-ficticia`.

- **Sign in.** Run `verificar browser goto --path /login`, `verificar browser wait --text "Entrar" --timeout 15`, `verificar browser fill --name usuario --value admin`, `verificar browser fill --name password --value admin`, `verificar browser click --role button --name "Entrar"`, and `verificar browser wait --text "Pulso de la tienda" --timeout 15`.
- **Open the till.** Choose `Ventas`. Run `verificar browser click --role link --name "Ventas"` and `verificar browser wait --text "Añadir producto" --timeout 15`. Run `verificar browser location --matches "/ventas/caja$"`.
- **Add a note.** Choose `+ Añadir nota` and type the fictional note. Run `verificar browser click --role button --name "+ Añadir nota"`, `verificar browser wait --text "Nota (sale en el historial, no en el ticket)"`, and `verificar browser fill --label "Nota (sale en el historial, no en el ticket)" --value "verificacion-luna-ficticia"`.
- **Search the product.** Type in `Añadir producto`. Run `verificar browser fill --aria "Añadir producto" --value "Whey Protein Concentrada"` and `verificar browser wait --text "Whey Protein Concentrada 1 kg" --timeout 15`.
- **Add it.** Choose the option. Run `verificar browser click --role option --contains "Whey Protein Concentrada 1 kg"` and `verificar browser wait --text "Cantidad de Whey Protein Concentrada 1 kg" --timeout 15`. The cart line is visible.
- **Open payment.** Choose the till's `Cobrar` button. Run `verificar browser click --role button --contains "Cobrar"` and `verificar browser wait --text "Total a cobrar" --timeout 15`. The dialog title is `Cobrar`.
- **Charge by card.** Choose `Tarjeta`, then the dialog's `Cobrar` button. Run `verificar browser click --role radio --name "Tarjeta"` and `verificar browser click --role button --contains "Cobrar"`. Run `verificar browser wait --text "cobrada" --timeout 15`.
- **Proof.** Capture the ticket and the row. Run `verificar browser screenshot --path ventas/ticket.png`, `verificar browser text --out ventas/ticket.txt`, and `verificar sql --out ventas/fila.json "SELECT id, estado, notas FROM stock_ventas WHERE notas = 'verificacion-luna-ficticia'"`. The screenshot shows `cobrada`. The JSON array has one row with `estado` `completada` and that note.

## Gotchas

- The till button and the dialog button both contain `Cobrar`. With the dialog open, `click` uses the dialog button.
- Card avoids the cash field `Entrega el cliente`. Cash requires the amount handed over to cover the cash payment.
- The cart lives in `sessionStorage` of the verification browser. A second attempt in the same run can still show the previous line until the profile is removed by cleanup.
- If the alert `La caja de hoy` is visible, the day is closed and charging returns 409. This recipe expects a fresh launch, which has no closing.
- F2 focuses the search and F9 opens payment. This recipe uses the visible controls.
- The note is stored on the sale and is not printed on the ticket. The ticket proof is the `cobrada` dialog; the note proof is the SQL row.
- Seeded counter sales already exist. Match the note, not "the latest sale" alone.
