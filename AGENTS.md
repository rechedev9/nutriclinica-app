# AGENTS.md

Guía para agentes de código al trabajar en este repositorio.

## Qué es

NutriClínica es una aplicación web de escritorio para un entrenador de gimnasio que trabaja solo y tiene además una tienda de suplementos (seguimiento nutricional y físico de clientes, revisiones antropométricas, fotos de progreso y un módulo pequeño de inventario y punto de venta). La traza de los datos (quién cambió qué y cuándo) es un requisito del producto.
Se ejecuta en el equipo del profesional (Windows o macOS) y se distribuye como un único binario autónomo que lleva la interfaz web embebida y abre el navegador.
Todo es TypeScript de extremo a extremo y los datos viven en un archivo SQLite local: la aplicación funciona sin conexión y no depende de ningún servicio externo.
El código, la interfaz y el vocabulario del dominio están en español.
Vocabulario: la interfaz dice "cliente" y "Tienda" (no "paciente" ni "Stock") y la ficha se llama "Ficha", pero el código, las rutas, las tablas y las claves de consulta conservan `paciente` y `stock`. En los textos visibles "stock" en minúscula significa existencias.

El proyecto nació como un monolito Flask, pasó por una versión Go + PostgreSQL (RDS) y hoy es un monorepo de Bun.
De aquellas versiones no queda código; el historial de git las conserva.

## Estructura

```
backend/    API con Bun + Elysia + Drizzle sobre bun:sqlite. Sirve también la SPA.
frontend/   React 19 + Vite + TanStack Router + TanStack Query + Zustand + Tailwind 4, cliente Eden.
build/      compilar.ts: construye la SPA y compila un binario por plataforma.
deploy/     Lanzadores que acompañan al binario (.bat, .ps1, .command) y LEEME.txt.
diseño/     Maquetas de referencia. No forman parte de la aplicación.
bbdd/       nutriclinica.db (SQLite). En .gitignore.
fotos/      Fotos de progreso en disco. En .gitignore.
dist/       Binarios y carpetas listas para distribuir. En .gitignore.
```

Es un workspace de Bun (`backend` y `frontend`) con un único `bun.lock` en la raíz.

## Comandos

Todos desde la raíz, con Bun (`bun install` la primera vez):

- `bun run dev`: arranca el backend (:5001, con recarga) y Vite (:5173) a la vez. Abre http://localhost:5173. El backend usa `bbdd/` y `fotos/` de la raíz (`--data-dir ..`).
- `bun run build`: typecheck y build de la SPA en `frontend/dist`.
- `bun run start`: sirve la API y la SPA ya construida en http://127.0.0.1:5001 y abre el navegador.
- `bun run test`: tests del backend y del frontend con `bun test`. Un archivo: `bun test backend/tests/api-stock.test.ts`. Un caso: `bun test -t "calcIMC"`.
- `bun run typecheck`, `bun run lint` (oxlint), `bun run format` y `bun run format:check` (oxfmt), `bun run knip` (código sin usar). Deja los cinco limpios antes de un commit.
- `bun run seed`: carga pacientes de demostración. `bun run importar <ruta/pacientes.db> [--data-dir <carpeta>] [--reemplazar]`: importa una base SQLite anterior conservando los ids y sustituyendo todo el contenido del destino.
- `bun run compilar [filtro...]`: construye la SPA y compila `win-amd64`, `mac-arm64`, `mac-amd64` y `linux-amd64` en `dist/`, y monta `dist/NutriClinica-Windows/` y `dist/NutriClinica-macOS/`. Con filtro compila solo lo que coincide (`bun run compilar linux`). Compila sin minificar identificadores (`--minify-whitespace --minify-syntax`): Elysia analiza el código de cada handler y con `--minify` las rutas con sesión fallan con 500. Tras tocar el build, prueba el binario con un login real, no solo `/api/estado`.
- `bun run --cwd backend db:generate`: genera una migración a partir de `src/db/esquema.ts`.

Opciones del servidor (`bun run start --port 5002`, o directamente en el binario): `--data-dir <carpeta>`, `--host` (`0.0.0.0` en un contenedor), `--port N`, `--no-browser`, `--https` (marca la cookie de sesión como `Secure` detrás de TLS). Variable de entorno: `NUTRICLINICA_DATA`.

La carpeta de datos se resuelve así: `--data-dir`, luego `NUTRICLINICA_DATA`, luego la carpeta del ejecutable (instalación portable) y, si no se puede escribir en ella, la carpeta de configuración del usuario. Dentro se crean `bbdd/nutriclinica.db` y `fotos/`.

En el primer arranque se crean los usuarios iniciales de `USUARIOS_INICIALES` (`backend/src/db/semilla.ts`); son valores de desarrollo y el servidor avisa por consola mientras conserven la contraseña inicial.

## Arquitectura del backend (`backend/src/`)

El orden de trabajo es esquema tipado, luego datos, luego rutas: el frontend recibe los tipos de las rutas sin escribir nada a mano.

- `index.ts` arranca desde el código fuente y sirve la SPA de `frontend/dist`. `arranque.ts` hace el trabajo: lee las opciones (`config.ts`), abre la base, siembra, monta la app y escucha (si el puerto está ocupado busca uno libre). El binario compilado usa una entrada generada por `build/compilar.ts` que llama al mismo `arrancar` con la SPA embebida (`spa.ts`: `spaDeCarpeta` y `spaDeArchivos`).
- `db/esquema.ts` es la fuente de verdad de las tablas (Drizzle, SQLite). `db/cliente.ts` abre `bun:sqlite` (API síncrona, claves foráneas activas) y aplica las migraciones embebidas de `db/migraciones.ts`, que se anotan en la tabla `__migraciones`. Al generar una migración nueva hay que añadirla a `MIGRACIONES` (un test lo comprueba). `0001_first_ikaris` añade la traza por cliente y rellena `paciente_id` en las entradas antiguas solo cuando el cliente existe y la entrada es posterior a su alta (`creado`): así un id reutilizado tras una importación no hereda la traza de otra persona.
- `datos/*.ts` contiene las consultas por dominio. Dentro de una transacción se usa el ejecutor `tx` que recibe la función, nunca el `db` exterior. Las listas con hijos (compras, ventas) se cargan con una consulta por nivel y `WHERE ... IN (...)`, no con una consulta por fila. Las subconsultas correlacionadas en plantillas `sql` necesitan el nombre de la tabla calificado a mano (`${tabla}.columna`).
- `validacion.ts` define los cuerpos con TypeBox (`t.Object`) y las funciones `normalizar*` con las reglas de dominio: rangos clínicos (peso 1 a 500 kg, talla 30 a 260 cm, pliegues y perímetros mayores que 0, fechas no futuras), productos y líneas (cantidad mayor que 0, precios no negativos) y longitud mínima de contraseña. Un dato inválido da 400 con el mensaje del contrato.
- `modulos/*.ts` tiene un plugin de Elysia por dominio (`auth`, `pacientes`, `fotos`, `exportar`, `stock`, `usuarios`), montados en `app.ts`. `modulos/acceso.ts` aporta las macros `sesion` y `admin`: toda la API exige sesión salvo `GET /api/estado`, `POST /api/login` y `POST /api/logout`.
- `app.ts` añade las cabeceras de seguridad (CSP, X-Frame-Options), traduce los errores a `{ error }` (`ErrorHttp`, validación, restricciones de SQLite) y registra en `audit_log` las mutaciones y las exportaciones después de responder, con las columnas `paciente_id` (cliente afectado, sin clave foránea para que la traza sobreviva a su borrado) y `detalle` (JSON `{ cambios: [{ campo, antes, despues }], resumen, registro_id }`). Los handlers de cliente, revisión y foto lo anotan con `anotarAuditoria` (`modulos/acceso.ts`, un `WeakMap` por `Request`) solo tras un resultado correcto; `lib/cambios.ts` calcula las diferencias y valida el detalle al leerlo. Login y logout se anotan como "Acceso" y "Salida". También sirve la SPA: cualquier ruta que no sea `/api` ni `/fotos` devuelve `index.html`.
- `sesiones.ts` guarda las sesiones en la tabla `sesiones` (solo el hash del token); la cookie es `nutriclinica_session`, `HttpOnly` y `SameSite=Strict`. Las contraseñas usan bcrypt con `Bun.password` (`lib/password.ts`). El login tiene límite de intentos (`lib/limitador.ts`). Cambiar una contraseña cierra las demás sesiones de ese usuario.
- Reglas de stock (`datos/stock.ts`, 409): una venta o una merma no puede superar las existencias, y borrar o reducir una compra no puede dejar el stock en negativo. Las categorías y los proveedores en uso no se borran. El stock se deriva como compras menos ventas menos mermas.
- Usuarios: no se puede borrar la propia cuenta (400) ni borrar o degradar al último administrador (409).
- `lib/naming.ts` es el port de `nombre_a_prefijo` y `nombre_a_carpeta` (quita acentos con NFKD). **No cambies su salida**: las carpetas de fotos ya existen en disco con ese nombre y los tests fijan los valores reales.
- Fotos: se guardan en `fotos/<carpeta del paciente>/` y solo se aceptan y se sirven extensiones de imagen (`lib/imagen.ts`); las rutas se resuelven con `lib/rutas.ts` para impedir salir de la carpeta.
- La exportación a Excel usa `exceljs` (`modulos/exportar.ts`).
- Los tests (`backend/tests/`) montan la app sobre una base en memoria y una carpeta de fotos temporal (`apoyo.ts`) y la llaman con un cliente Eden, sin red.

## Arquitectura del frontend (`frontend/src/`)

Organizado por funcionalidad (`features/{arranque,auth,inicio,pacientes,stock,usuarios,auditoria}`), con `components/ui`, `components/layout` y `lib` compartidos.

- Tipos de extremo a extremo: `lib/api/client.ts` crea el cliente Eden a partir del tipo `App` del backend (`@nutriclinica/backend`, solo tipos). `servidor` es el cliente y `pedir()` convierte su resultado en datos o en un `ApiError`. Eden no rechaza si falla la red: devuelve un error sin objeto `Response`, y `pedir` lo trata como "sin conexión". Los tipos de `src/types/` se derivan de las respuestas con `Treaty.Data<...>`; no se escriben a mano. Si un tipo no cuadra, corrige la ruta o el esquema en el backend.
- Rutas: `router.tsx` define el árbol de TanStack Router en código. La navegación y las pestañas son rutas (`/inicio`, `/pacientes/$id/{ficha|revisiones|fotos|analisis|historial}`, `/stock/{almacen|compras|ventas|proveedores|categorias|mermas|analisis}`), así que el paciente seleccionado y la pestaña activa viven en la URL. `_sesion` exige sesión (`RequireAuth`) y `_admin` exige rol administrador (Usuarios y Auditoría). La Tienda (`/stock`), Usuarios, Auditoría y la pestaña Análisis (que arrastra Chart.js) se cargan con `lazyRouteComponent`. `NoEncontrada` es la ruta 404 y `ErrorRuta` el componente de error.
- Inicio (`features/inicio`, ruta `/inicio`, destino tras el login y de `/`): fecha del día, accesos rápidos y tres tarjetas (clientes con revisión pendiente, alertas de la Tienda y últimas ventas). El seguimiento (`DIAS_REVISION_PENDIENTE`, `seguimiento`) vive en `features/pacientes/seguimiento.ts` y el filtro de pendientes de la lista es el parámetro `?pendientes=1`.
- Historial: la pestaña `historial` del cliente (`tabs/HistorialTab.tsx`) lista su traza agrupada por día con `GET /api/pacientes/:id/historial` (con sesión, máximo 500 entradas, de la más reciente a la más antigua). `features/auditoria` (`descripcion.ts`, `cambios.ts`, `DetalleCambios.tsx`) pone en lenguaje normal las rutas y los cambios, y la ficha y las revisiones muestran "Modificado por" a partir de ese historial. `qk.historial(pid)` cuelga de `pacientes`, así que sus invalidaciones lo alcanzan.
- Tienda: `features/stock/estado-almacen.ts` es la única definición de las alertas de existencias (agotado si no queda nada, bajo mínimo si queda el mínimo o menos); el Almacén, Inicio y el Análisis usan `productosEnAlerta` y `contarPorEstado`, no un filtro propio. Las cifras del Análisis de tienda (margen de lo vendido, género en almacén, flujo de caja) se calculan en `features/stock/analisisStock.ts`.
- Análisis del cliente: `tabs/analisis/ultimo-dato.ts` elige el último dato disponible de cada medida cuando la última revisión no lo trae, y la interfaz indica de qué fecha es.
- `components/ui/ImcBadge.tsx` es el único distintivo de IMC (tokens y variante `dark`); no pintes el IMC con colores sueltos.
- `features/arranque/ConexionGate.tsx` consulta `GET /api/estado` al cargar y solo muestra un aviso con reintento cuando no hay conexión con el servidor.
- Un 401 fuera de `/api/me`, `/api/login` y `/api/logout` lo trata `lib/api/sesion.ts` de forma global (vacía la caché, redirige a `/login` y avisa una vez).
- Estado del servidor con TanStack Query. Las claves están en `lib/api/queryKeys.ts`. Las mutaciones invalidan las claves afectadas, también entre entidades: un cambio en revisiones o fotos invalida `pacientes` (la lista lleva contadores) y una compra, venta o merma invalida `stock.almacen`. Las lecturas que fallan muestran `components/ui/ErrorState` con botón de reintento.
- Estado del cliente: solo el tema usa Zustand (`lib/theme/useTheme.ts`, preferencia `light`, `dark` o `system` en `localStorage('nutri-theme')`, con script contra el parpadeo en `index.html`). No añadas estado global si basta la URL o el estado local de un componente.
- Formularios con react-hook-form y Zod (`lib/validacion/esquemas.ts`, `lineas.ts`), con el error bajo cada campo; los errores del servidor se muestran con `mensajeError`. Los buscadores comparan con `normaliza()` (sin acentos ni mayúsculas).
- Los cálculos clínicos (`calcIMC`, Durnin-Womersley `calcGrasaDW` con Siri, `clasificarGrasa`, masa magra y grasa) son un port puro y con tests en `lib/calc`. Cámbialos solo junto con sus tests de referencia.
- Los gráficos son `react-chartjs-2`; Chart.js se registra una vez en `lib/chart/chartSetup.ts` y toma los colores de `lib/chart/useChartTheme.ts`.
- Las descargas de Excel se lanzan por navegación (`lib/api/downloads.ts`) y el PDF con `window.print()`. La subida de fotos envía un `File` y Eden lo manda como `multipart`.
- En desarrollo Vite hace de proxy de `/api` y `/fotos` hacia el backend en :5001.

## Datos, despliegue y convenciones

- Los datos personales de los pacientes están en `bbdd/nutriclinica.db` y en `fotos/`, ambos fuera de git. La copia de seguridad consiste en copiar esas dos carpetas con la aplicación cerrada.
- Remotos de git: `origin` es `rechedev9/nutriclinica-app` (repositorio privado, aquí se hace push). `upstream` apunta al repositorio original `granrafael/nutriclinica` y `no-mistakes` es un remoto local de respaldo.
- No hay CI en pull requests: ejecuta lint, formato, knip, typecheck y tests en local antes de un commit.
- Escribe el código nuevo en español (identificadores, textos de la interfaz y comentarios).
- Backend: una ruta nueva va en el `modulos/*.ts` que corresponda, su consulta en `datos/*.ts` y su validación en `validacion.ts`. Frontend: añade el hook o el componente junto a los existentes de su funcionalidad.

## Convenciones de código

### TypeScript

- Estricto y sin atajos: nada de `any`, de casts `as` (salvo `as const`), del operador `!`, de `@ts-ignore`, de `@ts-expect-error` ni de comentarios para desactivar el linter. oxlint lo comprueba. Los tests pueden usar casts para construir mocks.
- `noUncheckedIndexedAccess` está activo: modela la ausencia de valor de forma explícita (`?.`, `??`, `.at()`, una guarda) en lugar de afirmarla.
- Validación en tiempo de ejecución: TypeBox en el backend (con Elysia) y Zod en el frontend. No añadas otra librería.
- Sin barrels de reexportación. Los únicos agregadores permitidos son `frontend/src/types/index.ts` y `frontend/src/lib/calc/index.ts`. Importa desde el módulo que define el símbolo y desde el subpaquete concreto (`@radix-ui/react-dialog`).
- Una función con más de dos parámetros recibe un único objeto de opciones tipado.
- Los archivos nuevos del backend van en kebab-case. El frontend conserva su convención (componentes en PascalCase, hooks en camelCase).
- Comentarios de una o dos líneas y solo para un motivo o un invariante que no sea evidente.
- Este proyecto no usa lodash, date-fns, MUI ni una librería de iconos.

### Errores y transacciones en el backend

- Lanza `ErrorHttp(estado, mensaje)`; `app.ts` lo convierte en la respuesta. No construyas respuestas de error a mano en cada ruta.
- Un invariante de varias sentencias va en una transacción (`db.transaction((tx) => ...)`), que con `bun:sqlite` es síncrona. Dentro usa siempre `tx`.

### Asíncrono

- En el frontend usa `Promise.all` para operaciones independientes; TanStack Query ya ejecuta en paralelo las consultas independientes.

### Cambios numéricos

- Si piden un ajuste ("+30 %"), haz la cuenta y escribe la constante resultante; no apiles un multiplicador sobre el valor existente.

### Interfaz y estilo

- Tailwind 4 se configura en CSS: los tokens de diseño están en `frontend/src/index.css` (`@theme`), no hay `tailwind.config`. Respétalos: paleta `primary` y `surface`, radios `rounded-card` y `rounded-lg`, sombras `shadow-card` y `shadow-md`, fuente Hanken Grotesk.
- Modo claro y oscuro por clase (`.dark` en `<html>`). Los tokens semánticos (`app`, `surface`, `surface-2`, `border`, `ink`, `ink-muted`, `primary-light`) son variables CSS definidas en `:root` y `.dark`, así que `bg-surface`, `text-ink` o `border-border` se adaptan solos. Nunca uses `bg-white` ni colores hexadecimales sueltos para superficies y texto.
- shadcn: `frontend/components.json` está configurado y los tokens de shadcn (`background`, `foreground`, `card`, `popover`, `muted`, `accent`, `destructive`, `input`, `ring`) apuntan a la paleta del proyecto. `Button` y `Badge` usan `class-variance-authority`. Al añadir un componente con `bunx shadcn add`, adáptalo antes de usarlo: iconos como SVG en línea (sin lucide), imports de Radix desde el subpaquete concreto y nombre de archivo según la convención del proyecto.
- Modales (`components/ui/Modal.tsx`, `ConfirmDialog.tsx`): el `Content` de Radix se centra con un contenedor flex (`fixed inset-0 flex items-center justify-center`, `pointer-events-none` en el contenedor y `pointer-events-auto` en el `Content`), nunca con `-translate-x/y-1/2`: ese transform choca con el de la animación de entrada (`animate-slideUp`).
- Los campos usan `bg-app` con borde y pasan a `bg-surface` al recibir el foco.
- En los botones indica la carga con la propiedad `isLoading` de `Button`; no cambies el texto a mano.
- El borrado dentro de una fila o tarjeta de listado usa `variant="dangerGhost"`. Reserva `danger` para la acción destructiva principal de una pantalla o diálogo.
- Todo texto visible va en español. No hay capa de traducción.
- El contenido del usuario se muestra siempre escapado (sin `dangerouslySetInnerHTML`).

### Imágenes

- Para imágenes rasterizadas nuevas prefiere WebP. No cambies la extensión de los recursos existentes. Las fotos de pacientes conservan el formato con el que se suben.

### Documentación

- Mantén este archivo y `CLAUDE.md` al día: si un cambio deja obsoleta una referencia (ruta, función, opción), corrígela en el mismo cambio.
