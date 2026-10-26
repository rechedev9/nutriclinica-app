# Auditoría del flujo de usuario

Auditoría de solo lectura sobre la interfaz real, con la semilla ficticia de `verificar launch` (clientes de demostración y la clienta `Luna Queralto Ficticia`). No hay datos reales.

## Cómo se midió

Cada trabajo parte de Inicio, con la sesión ya abierta. El login se cuenta solo en el trabajo 6.

Un clic es una pulsación de enlace, botón, pestaña, radio, casilla u opción. Abrir un desplegable nativo y elegir una opción son 2 clics. Escribir en un campo no es un clic. Una pantalla es una ruta o un diálogo.

Las pantallas de pie se volvieron a capturar a 1280x800 y a 390x844. Los diálogos que solo existían a mitad del recorrido (formulario relleno, cobro, ticket, albarán con línea, confirmación de cierre) quedaron a 1440x813, que es la ventana con la que arranca el navegador de la herramienta. En el nombre del archivo está el tamaño.

Lo marcado como **medido** salió de la pantalla, del texto visible o del tamaño del elemento. Lo marcado como **opinión** es una lectura de ese dato.

## Mapa

Barra principal, de arriba abajo. En el teléfono pasa a una barra inferior de 71 px con los mismos seis destinos y sin el botón Colapsar.

| Destino | Ruta al entrar | Pestañas |
| --- | --- | --- |
| Inicio | `/inicio` | ninguna |
| Clientes | `/pacientes` | dentro de un cliente: Ficha, Revisiones, Fotos, Análisis, Compras, Historial |
| Ventas | `/ventas/caja` | Caja, Historial, Cierre de caja, Estadísticas, Datos del ticket |
| Tienda | `/stock/almacen` | Almacén, Pedidos, Categorías, Proveedores, Compras, Mermas, Recuentos, Análisis |
| Usuarios | `/usuarios` | ninguna. Solo administrador |
| Auditoría | `/auditoria` | ninguna. Solo administrador |

Medido: Tienda abre Almacén y Ventas abre Caja.

La misma acción sale en más de un sitio.

| Acción | Dónde está |
| --- | --- |
| Nuevo cliente | Inicio y la lista de Clientes. El diálogo es el mismo |
| Nueva venta | Inicio, la sección Ventas, la pestaña Compras del cliente y el botón Vender de Recompras |
| Consentimiento RGPD | Casilla al final del alta, y el botón Registrar consentimiento en la ficha |
| Sumar existencias | Inicio abre Compras. La fila de Por reponer abre Almacén. Pedidos crea el pedido y el albarán. También existe Entrar albarán sin pedido |
| Cerrar la caja | Pestaña Cierre de caja. Inicio solo enlaza Ir al cierre cuando ya hay días recientes sin cerrar |
| Ver evolución | Análisis del cliente, Análisis de la tienda y Estadísticas de ventas son tres pantallas distintas |
| Historial | Historial del cliente, Historial de ventas y Auditoría |

A 1280x800 las pestañas caben en una fila. A 390 px no. Medido en el ancho de la barra: cliente 569 px, Ventas 593 px, Tienda 841 px, todas dentro de 390 px y con la clase que oculta la barra de desplazamiento.

## Tabla de clics

| Trabajo | Clics | Pantallas | Campos obligatorios | Campos tecleados |
| --- | --- | --- | --- | --- |
| 6. Empezar el día, con login | 1 | 2 | 2 | 2 |
| 1. Revisión, buscando en la lista | 9 | 6, más el diálogo de archivo del sistema | la fecha, ya rellena, y una medida | 19 números y una nota |
| 1. Atajo desde la agenda | 7 | 4, más el archivo | igual | igual |
| 2. Alta con consentimiento, desde la lista | 4 | 2 | 1, el nombre | 3, más la casilla |
| 3. Venta sin cliente, con tarjeta | 5 | 3 | 0 | 1, la búsqueda |
| 3. Venta con cliente, en efectivo | 7 | 3 | 0 | 1, la búsqueda |
| 4. Pedir y recibir el albarán | 9, y 1 más para ver el resultado | 5, y la lista vacía | proveedor y una línea. La sugerencia los rellena | 1, el número de albarán, que no es obligatorio |
| 5. Cerrar la caja | 4 | 3 | 1, el efectivo contado | 1 |

## 1. Atender a un cliente que viene a revisión

Camino medido, desde Inicio.

1. Clic en Clientes. Pantalla de la lista.
2. Se escribe el nombre en Buscar cliente.
3. Clic en la tarjeta. Abre la Ficha.
4. Clic en Revisiones.
5. Clic en + Nueva revisión. La fecha ya es hoy.
6. Se teclean el peso y las 18 medidas del historial anterior, más una nota. Clic en Crear revisión.
7. Clic en Fotos. Clic en la zona de archivo. El sistema pide el archivo. Se escribe una nota y clic en Subir.
8. Clic en Análisis.

Clics: 9. Pantallas de la aplicación: lista, ficha, revisiones, diálogo, fotos, análisis. El selector de archivo es una pantalla del sistema y no se contó clic a clic.

El atajo de la agenda se midió con otro cliente vencido: el enlace abre ya `/revisiones`. Ese camino son 7 clics y se salta la lista, la búsqueda y la ficha.

Fricciones.

- **Alta.** La ficha no tiene Nueva revisión. Quien busca en la lista gasta la ficha y un clic de pestaña antes de medir. `04-ficha-1280.png`
- **Alta.** El diálogo pide 21 números (peso, envergadura, 8 pliegues, 10 perímetros) para igualar una revisión del historial, que se guarda como «18 medidas». Para poder guardar basta la fecha, ya puesta, y una medida o una nota. `06-revision-form-1280.png`, `06b-revision-rellena-1440.png`
- **Media.** Al guardar, la fila muestra el peso y no las medidas ni la nota. Hay que pulsar la fila. `07-revision-detalle-1280.png`
- **Media.** La cabecera sigue en 78,5 kg, que es el peso de la ficha. El análisis de la misma visita dice 72,2 kg. `04-ficha-1280.png`, `09-analisis-1280.png`
- **Media.** Las tarjetas del análisis cuentan durante 1,8 s. A mitad de la cuenta el número no coincide con la etiqueta (se leyó 20,4 junto a Sobrepeso; al terminar, 26,8 y Sobrepeso).
- **Baja.** La foto no se sube al elegirla. Hay un panel intermedio y el botón Subir. `08-fotos-1280.png`
- **Alta en el teléfono.** La barra del cliente mide 569 px en 390 px y no muestra indicador de scroll. Historial queda fuera. `04-ficha-390.png`
- **Media en el teléfono.** El diálogo de la revisión se lee, con dos columnas. Sigue habiendo que recorrer 21 campos. `06-revision-form-390.png`

## 2. Dar de alta un cliente y registrar el consentimiento

Camino medido, desde la lista.

1. Clic en Clientes.
2. Clic en + Nuevo cliente.
3. Se escribe el nombre. Es el único campo con asterisco. También se escribieron email y DNI, que no bloquean el guardado.
4. Se baja hasta la casilla y se marca. Clic en Crear cliente.

Clics: 4. Pantallas: lista y diálogo. Abrir la ficha para ver «Consentimiento RGPD registrado» suma 1 clic y 1 pantalla. Se hizo. `12-ficha-luna-1280.png`

Inicio tiene el botón + Nuevo cliente, visto en `02-inicio-1280.png`. Ese camino ahorra el clic de Clientes. No se creó un segundo cliente por ahí.

Fricciones.

- **Alta.** La casilla del consentimiento queda bajo el borde. En una ventana de 813 px de alto el control empezaba en el píxel 902. A 1280x800 hay que bajar el diálogo para verla. `10-alta-1280.png`, `11-alta-consentimiento-1280.png`
- **Media.** El formulario enseña 14 campos y tres áreas de texto. Para crear basta el nombre.
- **Media.** Si la casilla no se marca, la ficha ofrece otro botón, Registrar consentimiento. Son dos sitios para lo mismo, y el segundo solo aparece cuando el primero se pasó por alto. `04-ficha-1280.png`
- **Baja.** Tras un alta mínima, la ficha dice que faltan diez datos y ofrece Completar, que vuelve al formulario largo. `12-ficha-luna-1280.png`

## 3. Vender en caja

Sin cliente, con tarjeta. Desde Inicio.

1. Clic en Ventas. Abre la Caja.
2. Se escribe el producto y clic en la opción.
3. Clic en Cobrar. El diálogo abre en Efectivo y pide lo entregado.
4. Clic en Tarjeta y clic en Cobrar. Sale el ticket.

Clics: 5. Pantallas: caja, cobro, ticket. Campos: la búsqueda. Quitar el ticket con Nueva venta es 1 clic más si se va a vender otra vez.

Con cliente, en efectivo: 2 clics más en el desplegable Cliente (abrirlo y elegir). En vez de Tarjeta se pulsa el importe exacto que ya propone el diálogo. Total: 7 clics y las mismas 3 pantallas. El ticket imprime el nombre. `17-ticket-con-cliente-1440.png`

Fricciones.

- **Media.** Cada cobro con tarjeta obliga a salir del efectivo, que es el modo inicial, aunque la venta anterior fuera con tarjeta. `15-cobro-efectivo-1440.png`
- **Media.** El ticket tapa la caja. Para la siguiente venta hay que pulsar Nueva venta. `16-ticket-sin-cliente-1440.png`
- **Media.** El cliente es un desplegable con todos los nombres, no un buscador. Con los 9 de la semilla se recorre entero.
- **Alta en el teléfono.** La tabla del carrito mide 520 px y su hueco mide 358 px. La línea se desplaza de lado. `13-caja-390.png`, `14-carrito-1440.png`
- **Media en el teléfono.** Cierre de caja y Datos del ticket quedan fuera de la barra, que mide 593 px. `13-caja-390.png`

## 4. Reponer: ver qué falta, pedir y recibir

Camino medido, desde Inicio.

1. La tarjeta Por reponer muestra el producto agotado. Su fila abre Almacén, no el pedido. El enlace + Registrar compra abre Compras. Los dos destinos se midieron.
2. Clic en Pedidos. Clic en + Nuevo pedido. 2 clics para elegir el proveedor. Clic en Añadirlos al pedido. La línea entra sola (6 unidades, el doble del mínimo, y el coste). Clic en Guardar pedido.
3. Clic en Entrar albarán. La cantidad que llega ya es 6. Se escribió el número de albarán, que se puede dejar vacío. Clic en Entrar albarán y sumar al stock.

Clics hasta sumar el stock: 9, contando la parada en Almacén. Pantallas: inicio, almacén, pedidos, diálogo del pedido, diálogo del albarán. El pedido no suma stock. El albarán sí. Tras recibirlo, Por reponer pasó de 2 productos a 1. Medido en los dos textos de Inicio.

Fricciones.

- **Alta.** Para pedir hay que salir de la alerta, cruzar Almacén y localizar Pedidos entre ocho pestañas. La sugerencia llega después de elegir el proveedor. `02b-inicio-reponer-1280.png`, `19-almacen-1280.png`, `20-pedido-form-1280.png`
- **Alta.** Al guardar el albarán la lista dice «No hay pedidos en esta vista». El pedido está en Recibidos y cerrados. Hace falta otro clic para ver que salió bien. `22-pedido-vacio-1440.png`, `23-pedido-recibido-1280.png`
- **Media.** La misma entrada de mercancía vive en Pedidos y otra vez en Compras. `24-compras-1280.png`
- **Alta en el teléfono.** La barra de Tienda mide 841 px. En la captura se leen Almacén, Pedidos, Categorías y Proveedores. Compras, Mermas, Recuentos y Análisis quedan fuera, sin barra visible. `27-pedidos-390.png`
- **Baja.** El diálogo de albarán vacío cabe a 390 px. La tabla del albarán con productos tiene un mínimo de 560 px en la maqueta. No se abrió un albarán con líneas a 390 px. `21-albaran-vacio-390.png`, `21-albaran-1440.png`

## 5. Cerrar la caja del día

Camino medido.

1. Clic en Ventas. Abre la Caja, no el cierre.
2. Clic en Cierre de caja.
3. Se escribe 12,90, que es la cifra que la propia pantalla ya dice haber cobrado en efectivo. La tarjeta no entra en el arqueo.
4. Clic en Cerrar caja. Un segundo diálogo repite Cerrar caja.

Clics: 4. Pantallas: caja, cierre, confirmación. El campo es obligatorio cuando hubo efectivo.

Fricciones.

- **Media.** El importe hay que volver a teclearlo. La pantalla ya lo muestra. `25-cierre-1280.png`
- **Media.** La confirmación suma 1 clic y 1 pantalla. El texto avisa de que el día queda bloqueado. Opinión: ese aviso sí informa. El clic sobra si el botón de la página ya se llama Cerrar caja. `26-cierre-confirmar-1440.png`
- **Alta.** Antes de cerrar ningún día, el cierre lista «8 días anteriores sin cerrar» y ofrece Ver el 01/03/2026. Ese enlace saca del día de hoy. Inicio, en la misma sesión, dice «Caja de hoy cerrada» y no menciona esos ocho días. `25-cierre-1280.png`, `02-inicio-1280.png`
- **Media.** Inicio no enlaza al cierre mientras la caja de hoy está abierta. El enlace Ir al cierre aparece solo cuando el resumen trae días sin cerrar.
- **Media en el teléfono.** La pantalla de cierre se lee. La barra sigue ocultando pestañas. `25-cierre-390.png`

## 6. Empezar el día en Inicio

Camino medido.

1. Usuario y contraseña. Los campos no tienen etiqueta, solo el texto de dentro.
2. Clic en Entrar. Llega a Inicio.

Clics: 1. Pantallas: 2. Campos: 2.

En la misma pantalla están el pulso, la agenda, las recompras, lo que hay que reponer y lo que no se mueve. A 1280x800 se ve el conjunto. `02-inicio-1280.png`

Para actuar, un clic más. Medido: el cliente vencido de la agenda abre sus revisiones. + Nueva venta abre la caja. + Registrar compra abre Compras. La fila de un producto abre Almacén.

Fricciones.

- **Media.** El resumen dice «8 clientes por atender» y la agenda dice «7 revisiones vencidas» y «8 sin consentimiento». Ver todos (8) no es el mismo 8. La lista de la agenda enseña 6 filas.
- **Media.** Recompras estaba vacía en la semilla. La tarjeta ocupa el mismo tamaño que la agenda. Opinión: en un día sin recompras, ese hueco no dice qué hacer.
- **Baja en el teléfono.** La barra inferior con seis destinos cabe y se lee. El contenido de Inicio se apila y hay que bajar. `02-inicio-390.png`, `01-login-390.png`

## Las 10 oportunidades

El efecto es una cuenta sobre los clics de la tabla. El tamaño es opinión: S cabe en una pantalla, M cruza el diálogo y la navegación, L cambiaría el modelo de varias secciones. Ninguna añade un módulo nuevo.

1. **Pedir desde la alerta, con el proveedor y la línea ya puestos.** Tamaño M. El pedido de hoy son 9 clics y pasan por Almacén. Con la fila abriendo el diálogo relleno quedan 2 clics para dejar el pedido (abrir y guardar) y los 2 del albarán el día que llega. Se ahorran unos 5 clics y la pantalla de Almacén en este trabajo. El albarán se queda: es el momento en que entra la mercancía.
2. **Dejar a la vista solo las medidas que usa el análisis.** Tamaño M. El análisis calcula la grasa con cuatro pliegues y abre el gráfico con cintura, caderas, muslo y pecho. Una revisión completa tecleó 19 números. Dejar esos y el peso a la vista, y el resto plegado, baja el tecleo de 19 a 6. La pantalla sigue siendo una.
3. **Nombre y consentimiento arriba del alta.** Tamaño S. Hoy la casilla está debajo de 14 campos. Subirla junto al nombre quita el scroll y evita la vuelta a la ficha para Registrar consentimiento, que son 1 clic y 1 pantalla cuando la casilla se olvida.
4. **Cobrar con el último método y seguir sin pulsar Nueva venta.** Tamaño S. La venta con tarjeta son 5 clics. Recordar Tarjeta quita 1. Cerrar el ticket al imprimir, o dejarlo sin bloquear la caja, quita el clic de Nueva venta. El ticket se conserva para imprimir.
5. **Entrar al cierre desde «Caja de hoy abierta», con el importe ya escrito.** Tamaño S. Hoy son 4 clics y 1 campo, y se cruza la Caja. Un enlace en Inicio y el importe ya puesto dejan 3 clics (abrir, Cerrar, confirmar) y 0 campos. Quitar de esa lista los días de hace meses evita el desvío a marzo. La confirmación puede quedarse: avisa del bloqueo.
6. **Al recibir, dejar el pedido visible como Recibido.** Tamaño S. Quita 1 clic y la pantalla que dice que no hay pedidos.
7. **Abrir en Revisiones a quien viene a medirse.** Tamaño S. La agenda ya lo hace. La búsqueda de la lista abre la ficha. Hacer que la tarjeta abra Revisiones cuando la revisión está vencida quita 1 clic y la pantalla de la ficha. El camino largo baja de 9 clics a 8, y se parece al atajo de 7.
8. **La línea de la caja, en el teléfono, sin tabla de 520 px.** Tamaño M. A 390 px el carrito se desplaza de lado dentro de un hueco de 358 px. Apilar producto, cantidad e importe deja el cobro en una sola columna. En escritorio el número de clics no cambia. En el teléfono el trabajo 3 pasa a poder hacerse.
9. **Barras con las pestañas del día.** Tamaño M. A 390 px, Tienda mide 841 px y Ventas 593 px, sin indicador de scroll. Dejar a la vista Almacén, Pedidos y Compras, y Caja, Historial y Cierre, hace alcanzable el destino sin un gesto oculto. Categorías, proveedores, mermas, recuentos y los datos del ticket siguen existiendo, fuera de la barra diaria.
10. **Un solo peso en la cabecera del cliente, y la cifra del análisis ya en su valor.** Tamaño S. Medido: cabecera 78,5 kg y análisis 72,2 kg en la misma visita, y 1,8 s en los que la etiqueta no describe el número. Mostrar el peso de la última revisión y pintar el número final quita esa comprobación. Opinión: si no, se abre Editar para «corregir» un peso que no está mal.

## Qué no se tocó

No se cambió código de la aplicación. Las capturas y este informe son el único cambio. La semilla, las ventas, el pedido, el albarán y el cierre viven en la base desechable de la verificación.
