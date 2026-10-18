import { createRootRoute, createRoute, createRouter, lazyRouteComponent, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { RequireAdmin } from '@/features/auth/RequireAdmin'
import { ErrorRuta } from '@/components/ErrorRuta'
import { NoEncontrada } from '@/components/NoEncontrada'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { LoginPage } from '@/features/auth/LoginPage'
import { InicioPage } from '@/features/inicio/InicioPage'
import { PacientesPage } from '@/features/pacientes/PacientesPage'
import { PacientesOverview } from '@/features/pacientes/PacientesOverview'
import { PacienteDetail } from '@/features/pacientes/PacienteDetail'
import { FichaTab } from '@/features/pacientes/tabs/FichaTab'
import { RevisionesTab } from '@/features/pacientes/tabs/RevisionesTab'
import { FotosTab } from '@/features/pacientes/tabs/FotosTab'
import { HistorialTab } from '@/features/pacientes/tabs/HistorialTab'
import { leerBusqueda } from '@/features/ventas/periodos'

const raiz = createRootRoute({ notFoundComponent: NoEncontrada })

const login = createRoute({ getParentRoute: () => raiz, path: 'login', component: LoginPage })

// Rutas sin segmento de URL: exigen sesión y pintan el marco de la app.
const conSesion = createRoute({ getParentRoute: () => raiz, id: '_sesion', component: RequireAuth })
const marco = createRoute({ getParentRoute: () => conSesion, id: '_app', component: AppShell })

const raizInicio = createRoute({
  getParentRoute: () => marco,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/inicio', replace: true })
  },
})
const inicio = createRoute({ getParentRoute: () => marco, path: 'inicio', component: InicioPage })

const pacientes = createRoute({ getParentRoute: () => marco, path: 'pacientes', component: PacientesPage })
// ?pendientes=1 activa el filtro de revisión pendiente en la lista.
const pacientesInicio = createRoute({
  getParentRoute: () => pacientes,
  path: '/',
  component: PacientesOverview,
  validateSearch: (busqueda: Record<string, unknown>): { pendientes?: 1 } =>
    busqueda.pendientes === 1 || busqueda.pendientes === '1' ? { pendientes: 1 } : {},
})
const paciente = createRoute({ getParentRoute: () => pacientes, path: '$id', component: PacienteDetail })
const pacienteInicio = createRoute({
  getParentRoute: () => paciente,
  path: '/',
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/pacientes/$id/ficha', params, replace: true })
  },
})
const ficha = createRoute({ getParentRoute: () => paciente, path: 'ficha', component: FichaTab })
const revisiones = createRoute({ getParentRoute: () => paciente, path: 'revisiones', component: RevisionesTab })
const fotos = createRoute({ getParentRoute: () => paciente, path: 'fotos', component: FotosTab })
const historial = createRoute({ getParentRoute: () => paciente, path: 'historial', component: HistorialTab })
const comprasCliente = createRoute({
  getParentRoute: () => paciente,
  path: 'compras',
  component: lazyRouteComponent(() => import('@/features/ventas/ComprasClienteTab'), 'ComprasClienteTab'),
})

// Rutas con carga diferida: el módulo de Análisis arrastra Chart.js (~200 KB) y
// los módulos de Stock y Ventas y la gestión de Usuarios no se necesitan en el arranque.
const analisis = createRoute({
  getParentRoute: () => paciente,
  path: 'analisis',
  component: lazyRouteComponent(() => import('@/features/pacientes/tabs/analisis/AnalisisTab'), 'AnalisisTab'),
})

const stock = createRoute({
  getParentRoute: () => marco,
  path: 'stock',
  component: lazyRouteComponent(() => import('@/features/stock/StockPage'), 'StockPage'),
})
const stockInicio = createRoute({
  getParentRoute: () => stock,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/stock/almacen', replace: true })
  },
})
const almacen = createRoute({
  getParentRoute: () => stock,
  path: 'almacen',
  component: lazyRouteComponent(() => import('@/features/stock/tabs/AlmacenTab'), 'AlmacenTab'),
})
const pedidosStock = createRoute({
  getParentRoute: () => stock,
  path: 'pedidos',
  component: lazyRouteComponent(() => import('@/features/stock/tabs/PedidosTab'), 'PedidosTab'),
  validateSearch: (busqueda: Record<string, unknown>): { reponer?: number } => {
    const id = Number(busqueda.reponer)
    return Number.isInteger(id) && id > 0 ? { reponer: id } : {}
  },
})
const compras = createRoute({
  getParentRoute: () => stock,
  path: 'compras',
  component: lazyRouteComponent(() => import('@/features/stock/tabs/ComprasTab'), 'ComprasTab'),
})
// Enlace antiguo: las ventas tienen ahora su propia sección.
const stockVentas = createRoute({
  getParentRoute: () => stock,
  path: 'ventas',
  beforeLoad: () => {
    throw redirect({ to: '/ventas/historial', replace: true })
  },
})
const proveedores = createRoute({
  getParentRoute: () => stock,
  path: 'proveedores',
  component: lazyRouteComponent(() => import('@/features/stock/tabs/ProveedoresTab'), 'ProveedoresTab'),
})
const categorias = createRoute({
  getParentRoute: () => stock,
  path: 'categorias',
  component: lazyRouteComponent(() => import('@/features/stock/tabs/CategoriasTab'), 'CategoriasTab'),
})
const mermas = createRoute({
  getParentRoute: () => stock,
  path: 'mermas',
  component: lazyRouteComponent(() => import('@/features/stock/tabs/MermasTab'), 'MermasTab'),
})
const recuentos = createRoute({
  getParentRoute: () => stock,
  path: 'recuentos',
  component: lazyRouteComponent(() => import('@/features/stock/tabs/RecuentosTab'), 'RecuentosTab'),
})
const analisisStock = createRoute({
  getParentRoute: () => stock,
  path: 'analisis',
  component: lazyRouteComponent(() => import('@/features/stock/tabs/AnalisisStockTab'), 'AnalisisStockTab'),
})

const ventas = createRoute({
  getParentRoute: () => marco,
  path: 'ventas',
  component: lazyRouteComponent(() => import('@/features/ventas/VentasPage'), 'VentasPage'),
})
const ventasInicio = createRoute({
  getParentRoute: () => ventas,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/ventas/caja', replace: true })
  },
})
const caja = createRoute({
  getParentRoute: () => ventas,
  path: 'caja',
  component: lazyRouteComponent(() => import('@/features/ventas/tabs/CajaTab'), 'CajaTab'),
  // ?cliente=12 abre la caja con ese cliente ya elegido (desde su ficha).
  validateSearch: (busqueda: Record<string, unknown>): { cliente?: number } => {
    const id = Number(busqueda.cliente)
    return Number.isInteger(id) && id > 0 ? { cliente: id } : {}
  },
})
// ?ticket=V-000123 abre el historial buscando ese ticket.
const historialVentas = createRoute({
  getParentRoute: () => ventas,
  path: 'historial',
  component: lazyRouteComponent(() => import('@/features/ventas/tabs/HistorialTab'), 'HistorialTab'),
  validateSearch: (busqueda: Record<string, unknown>): { ticket?: string } =>
    // ?ticket=9 llega como número: el router interpreta la búsqueda como JSON.
    typeof busqueda.ticket === 'string' || typeof busqueda.ticket === 'number'
      ? { ticket: String(busqueda.ticket) }
      : {},
})
const cierreCaja = createRoute({
  getParentRoute: () => ventas,
  path: 'cierre',
  component: lazyRouteComponent(() => import('@/features/ventas/tabs/CierreTab'), 'CierreTab'),
})
// Arrastra Chart.js. ?periodo=30d (o personalizado con ?desde&hasta) fija el periodo.
const estadisticasVentas = createRoute({
  getParentRoute: () => ventas,
  path: 'estadisticas',
  component: lazyRouteComponent(() => import('@/features/ventas/tabs/EstadisticasTab'), 'EstadisticasTab'),
  validateSearch: leerBusqueda,
})
const datosTicket = createRoute({
  getParentRoute: () => ventas,
  path: 'ticket',
  component: lazyRouteComponent(() => import('@/features/ventas/tabs/TicketTab'), 'TicketTab'),
})

const soloAdmin = createRoute({ getParentRoute: () => marco, id: '_admin', component: RequireAdmin })
const usuarios = createRoute({
  getParentRoute: () => soloAdmin,
  path: 'usuarios',
  component: lazyRouteComponent(() => import('@/features/usuarios/UsuariosPage'), 'UsuariosPage'),
})
const auditoria = createRoute({
  getParentRoute: () => soloAdmin,
  path: 'auditoria',
  component: lazyRouteComponent(() => import('@/features/auditoria/AuditoriaPage'), 'AuditoriaPage'),
})

const arbol = raiz.addChildren([
  login,
  conSesion.addChildren([
    marco.addChildren([
      raizInicio,
      inicio,
      pacientes.addChildren([
        pacientesInicio,
        paciente.addChildren([pacienteInicio, ficha, revisiones, fotos, analisis, comprasCliente, historial]),
      ]),
      stock.addChildren([
        stockInicio,
        almacen,
        pedidosStock,
        compras,
        stockVentas,
        proveedores,
        categorias,
        mermas,
        recuentos,
        analisisStock,
      ]),
      ventas.addChildren([ventasInicio, caja, historialVentas, cierreCaja, estadisticasVentas, datosTicket]),
      soloAdmin.addChildren([usuarios, auditoria]),
    ]),
  ]),
])

export const router = createRouter({
  routeTree: arbol,
  defaultErrorComponent: ErrorRuta,
  defaultPendingComponent: CenteredSpinner,
})

// Registra el router para que Link, navigate y los parámetros queden tipados.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
