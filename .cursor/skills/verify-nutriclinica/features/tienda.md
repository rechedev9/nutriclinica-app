# Tienda

Tienda is the inventory. The Almacén tab lists seeded products, their stock, and the search box. The other tabs (Pedidos, Categorías, Proveedores, Compras, Mermas, Recuentos, Análisis) are separate entry points on the same section.

## Sub-features

- `tienda-almacen` opens the product list from the main navigation.
- `tienda-buscar` filters products by name.
- `tienda-semilla` shows `Whey Protein Concentrada 1 kg`, which the server seeded from purchases minus the seeded sales.

## How to get to it (user POV)

- Choose `Tienda` in the main navigation. The app opens Almacén.
- Open `/stock`. The app redirects to `/stock/almacen`.
- Choose another tab on that bar: `Pedidos`, `Categorías`, `Proveedores`, `Compras`, `Mermas`, `Recuentos`, or `Análisis`.

## Driving it with verificar

Preconditions:

- `verificar doctor` prints `ok`.
- The disposable warehouse contains `Whey Protein Concentrada 1 kg` and `Creatina Monohidrato 500g`.

- **Sign in.** Run `verificar browser goto --path /login`, `verificar browser wait --text "Entrar" --timeout 15`, `verificar browser fill --name usuario --value admin`, `verificar browser fill --name password --value admin`, `verificar browser click --role button --name "Entrar"`, and `verificar browser wait --text "Pulso de la tienda" --timeout 15`.
- **Open Tienda.** Choose `Tienda`. Run `verificar browser click --role link --name "Tienda"` and `verificar browser wait --text "Whey Protein Concentrada 1 kg" --timeout 15`. Run `verificar browser location --matches "/stock/almacen$"`. The heading `Productos` is visible.
- **See a second product.** Run `verificar browser wait --text "Creatina Monohidrato 500g"`.
- **Filter.** Type in `Buscar producto…`. Run `verificar browser fill --placeholder "Buscar producto…" --value "Creatina Monohidrato"` and `verificar browser wait --text "Creatina Monohidrato 500g" --absent "Whey Protein Concentrada 1 kg" --timeout 15`.
- **Clear.** Run `verificar browser fill --placeholder "Buscar producto…" --value ""` and `verificar browser wait --text "Whey Protein Concentrada 1 kg" --timeout 15`.
- **Proof.** Capture the list and the API the screen reads. Run `verificar browser screenshot --path tienda/almacen.png`, `verificar browser text --out tienda/almacen.txt`, and `verificar browser fetch --path /api/stock/almacen --out tienda/almacen.json`. The artifacts show `Whey Protein Concentrada 1 kg`.

## Gotchas

- The visible section is `Tienda`. The route stays `/stock`.
- The search placeholder uses the ellipsis character `…`.
- `+ Nuevo producto` opens a dialog whose submit button is `Crear`, not `Crear producto`. This recipe does not create a product.
- Stock is derived. A sale, purchase, loss, or recount in another recipe changes the number on this list.
- Pedidos, mermas, and recuentos are on the tab bar. Do not treat the Almacén proof as proof of those tabs.
- At the default window every Tienda tab is on one row, in this order: Almacén, Pedidos, Categorías, Proveedores, Compras, Mermas, Recuentos, Análisis.
- Below 768 px the row shows Almacén, Pedidos, and Compras. Categorías, Proveedores, Mermas, Recuentos, and Análisis are links inside the `Más` button. There is no hidden horizontal scroll.
- `/stock/pedidos?reponer=<supplier id>` opens the `Nuevo pedido a proveedor` dialog with that supplier and the suggested lines. The delivery note is unchanged. `+ Nuevo pedido` on that tab still opens an empty order.
- After a delivery note completes an order, that order stays on `Por recibir` for the rest of the visit, expanded, with badge `Recibido` and the receipt date. Older received orders stay under `Recibidos y cerrados`.
