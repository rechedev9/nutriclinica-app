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
- **Open the till.** Choose `Ventas`. Run `verificar browser click --role link --name "Ventas"` and `verificar browser wait --text "Cobrar" --timeout 15`. Run `verificar browser location --matches "/ventas/caja$"`. The search field's accessible name is `Añadir producto`. That name is not visible text.
- **Add a note.** Choose `+ Añadir nota` and type the fictional note. Run `verificar browser click --role button --name "+ Añadir nota"`, `verificar browser wait --text "Nota (sale en el historial, no en el ticket)"`, and `verificar browser fill --label "Nota (sale en el historial, no en el ticket)" --value "verificacion-luna-ficticia"`.
- **Search the product.** Type in `Añadir producto`. Run `verificar browser fill --aria "Añadir producto" --value "Whey Protein Concentrada"` and `verificar browser wait --text "Whey Protein Concentrada 1 kg" --timeout 15`.
- **Add it.** Choose the option. Run `verificar browser click --role option --contains "Whey Protein Concentrada 1 kg"` and `verificar browser wait --absent "El carrito está vacío" --timeout 15`. The cart line shows the product name. The quantity control's accessible name is `Cantidad de Whey Protein Concentrada 1 kg`. That name is not visible text.
- **Open payment.** Choose the till's `Cobrar` button. Run `verificar browser click --role button --contains "Cobrar"` and `verificar browser wait --text "Total a cobrar" --timeout 15`. The dialog title is `Cobrar`.
- **Charge by card.** Choose `Tarjeta`, then the dialog's `Cobrar` button. Run `verificar browser click --role radio --name "Tarjeta"` and `verificar browser click --role button --contains "Cobrar"`. Run `verificar browser wait --text "cobrada" --timeout 15`. A fresh browser profile opens the dialog on `Efectivo`, so the `Tarjeta` click is required the first time. The next dialog in that profile opens on the method just used.
- **Proof.** The till stays usable. The status line shows `cobrada`, `Imprimir ticket`, and `Ver ticket`. The cart is empty again. There is no `Nueva venta` button on that status. Run `verificar browser wait --text "cobrada"`, `verificar browser wait --text "Imprimir ticket"`, `verificar browser wait --text "El carrito está vacío"`, `verificar browser screenshot --path ventas/ticket.png`, `verificar browser text --out ventas/ticket.txt`, and `verificar sql --out ventas/fila.json "SELECT id, estado, notas FROM stock_ventas WHERE notas = 'verificacion-luna-ficticia'"`. The JSON array has one row with `estado` `completada` and that note. `Ver ticket` opens the full ticket. `Imprimir ticket` prints it.

## Gotchas

- The till button and the dialog button both contain `Cobrar`. With the dialog open, `click` uses the dialog button.
- Card avoids the cash field `Entrega el cliente`. Cash requires the amount handed over to cover the cash payment.
- The cart lives in `sessionStorage` of the verification browser. A second attempt in the same run can still show the previous line until the profile is removed by cleanup.
- If the alert `La caja de hoy` is visible, the day is closed and charging returns 409. This recipe expects a fresh launch, which has no closing.
- F2 focuses the search and F9 opens payment. This recipe uses the visible controls.
- The note is stored on the sale and is not printed on the ticket. The `cobrada` proof is the status line on the till. The note proof is the SQL row.
- Closing the payment dialog without charging does not change the remembered method. A failed charge does not either.
- Seeded counter sales already exist. Match the note, not "the latest sale" alone.
- `Cierre de caja` opens on today. The counted-cash field starts empty. The expected cash stays visible, and the match or the difference appears once an amount is typed. Confirming still warns that the day will be locked. The pending-days line is the same list as Inicio, so the seeded sales from months ago are not offered as a jump away from today.
- At the default window every Ventas tab is on one row. Below 768 px the row shows Caja, Historial, and Cierre de caja. Estadísticas and Datos del ticket are links inside the `Más` button. There is no hidden horizontal scroll.
- Below 640 px the cart line is a stack of product, quantity, and amount. The 520 px table stays from that width up. Quantity controls keep the same accessible names. This recipe runs in the default window and uses the table.
