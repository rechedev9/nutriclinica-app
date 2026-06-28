// Package models define las estructuras de dominio. Los tags json reproducen
// exactamente las claves snake_case que emitía la app Flask. Los campos
// opcionales usan punteros para emitir `null` igual que Flask (regla "valor or None").
package models

// Paciente refleja una fila de la tabla pacientes más los contadores
// num_fotos / num_revisiones que añadía Flask en las respuestas.
type Paciente struct {
	ID              int64    `json:"id"`
	Nombre          string   `json:"nombre"`
	FechaNac        *string  `json:"fecha_nac"`
	Sexo            *string  `json:"sexo"`
	DNI             *string  `json:"dni"`
	Telefono        *string  `json:"telefono"`
	Email           *string  `json:"email"`
	Objetivo        *string  `json:"objetivo"`
	ActividadFisica *string  `json:"actividad_fisica"`
	Intolerancias   *string  `json:"intolerancias"`
	Patologias      *string  `json:"patologias"`
	Notas           *string  `json:"notas"`
	Peso            *float64 `json:"peso"`
	Talla           *float64 `json:"talla"`
	GrupoSanguineo  *string  `json:"grupo_sanguineo"`
	Creado          *string  `json:"creado"`
	NumFotos        int      `json:"num_fotos"`
	NumRevisiones   int      `json:"num_revisiones"`
}

// PacienteInput es el cuerpo JSON de creación/edición de paciente.
type PacienteInput struct {
	Nombre          string   `json:"nombre"`
	FechaNac        *string  `json:"fecha_nac"`
	Sexo            *string  `json:"sexo"`
	DNI             *string  `json:"dni"`
	Telefono        *string  `json:"telefono"`
	Email           *string  `json:"email"`
	Objetivo        *string  `json:"objetivo"`
	ActividadFisica *string  `json:"actividad_fisica"`
	Intolerancias   *string  `json:"intolerancias"`
	Patologias      *string  `json:"patologias"`
	Notas           *string  `json:"notas"`
	Peso            *float64 `json:"peso"`
	Talla           *float64 `json:"talla"`
	GrupoSanguineo  *string  `json:"grupo_sanguineo"`
}

// Revision refleja una fila de la tabla revisiones (23 campos + ids).
type Revision struct {
	ID             int64    `json:"id"`
	PacienteID     int64    `json:"paciente_id"`
	Fecha          *string  `json:"fecha"`
	Peso           *float64 `json:"peso"`
	Talla          *float64 `json:"talla"`
	Envergadura    *float64 `json:"envergadura"`
	PlBicipital    *float64 `json:"pl_bicipital"`
	PlTricipital   *float64 `json:"pl_tricipital"`
	PlSubescapular *float64 `json:"pl_subescapular"`
	PlSupraespinal *float64 `json:"pl_supraespinal"`
	PlSupracrestal *float64 `json:"pl_supracrestal"`
	PlAbdominal    *float64 `json:"pl_abdominal"`
	PlMusloInt     *float64 `json:"pl_muslo_int"`
	PlPiernaMed    *float64 `json:"pl_pierna_med"`
	PerAntebrazo   *float64 `json:"per_antebrazo"`
	PerBrazoRel    *float64 `json:"per_brazo_rel"`
	PerBrazoCont   *float64 `json:"per_brazo_cont"`
	PerHombros     *float64 `json:"per_hombros"`
	PerPecho       *float64 `json:"per_pecho"`
	PerCintura     *float64 `json:"per_cintura"`
	PerCaderas     *float64 `json:"per_caderas"`
	PerMuslo       *float64 `json:"per_muslo"`
	PerMusloCont   *float64 `json:"per_muslo_cont"`
	PerGemelo      *float64 `json:"per_gemelo"`
	Notas          *string  `json:"notas"`
}

// Foto refleja una fila de la tabla fotos.
type Foto struct {
	ID         int64   `json:"id"`
	PacienteID int64   `json:"paciente_id"`
	Filename   string  `json:"filename"`
	Nota       *string `json:"nota"`
	Fecha      *string `json:"fecha"`
}

// --- Stock ---

// AlmacenRow es una fila de /api/stock/almacen con stock_actual calculado.
type AlmacenRow struct {
	ID              int64   `json:"id"`
	Nombre          string  `json:"nombre"`
	Unidad          *string `json:"unidad"`
	PrecioCoste     float64 `json:"precio_coste"`
	PrecioVenta     float64 `json:"precio_venta"`
	StockMinimo     float64 `json:"stock_minimo"`
	Categoria       *string `json:"categoria"`
	ProveedorNombre *string `json:"proveedor_nombre"`
	StockActual     float64 `json:"stock_actual"`
}

// Producto refleja stock_productos con join de categoría y proveedor.
type Producto struct {
	ID              int64   `json:"id"`
	Nombre          string  `json:"nombre"`
	CategoriaID     *int64  `json:"categoria_id"`
	ProveedorID     *int64  `json:"proveedor_id"`
	PrecioCoste     float64 `json:"precio_coste"`
	PrecioVenta     float64 `json:"precio_venta"`
	Unidad          *string `json:"unidad"`
	StockMinimo     float64 `json:"stock_minimo"`
	Activo          int     `json:"activo"`
	Creado          *string `json:"creado"`
	Categoria       *string `json:"categoria,omitempty"`
	ProveedorNombre *string `json:"proveedor_nombre,omitempty"`
}

// ProductoInput es el cuerpo de creación/edición de producto.
type ProductoInput struct {
	Nombre      string   `json:"nombre"`
	CategoriaID *int64   `json:"categoria_id"`
	ProveedorID *int64   `json:"proveedor_id"`
	PrecioCoste *float64 `json:"precio_coste"`
	PrecioVenta *float64 `json:"precio_venta"`
	Unidad      *string  `json:"unidad"`
	StockMinimo *float64 `json:"stock_minimo"`
}

// Categoria refleja stock_categorias.
type Categoria struct {
	ID     int64  `json:"id"`
	Nombre string `json:"nombre"`
}

// Proveedor refleja stock_proveedores.
type Proveedor struct {
	ID       int64   `json:"id"`
	Nombre   string  `json:"nombre"`
	Telefono *string `json:"telefono"`
	Email    *string `json:"email"`
	Notas    *string `json:"notas"`
}

// ProveedorInput es el cuerpo de creación/edición de proveedor.
type ProveedorInput struct {
	Nombre   string  `json:"nombre"`
	Telefono *string `json:"telefono"`
	Email    *string `json:"email"`
	Notas    *string `json:"notas"`
}

// Linea es una línea de compra o venta (producto, cantidad, precio).
type Linea struct {
	ID             int64   `json:"id"`
	ProductoID     int64   `json:"producto_id"`
	Cantidad       float64 `json:"cantidad"`
	PrecioUnitario float64 `json:"precio_unitario"`
	ProductoNombre *string `json:"producto_nombre,omitempty"`
	Unidad         *string `json:"unidad,omitempty"`
}

// LineaInput es una línea recibida al crear compra/venta.
type LineaInput struct {
	ProductoID     int64    `json:"producto_id"`
	Cantidad       float64  `json:"cantidad"`
	PrecioUnitario *float64 `json:"precio_unitario"`
}

// Compra refleja stock_compras con sus líneas.
type Compra struct {
	ID              int64   `json:"id"`
	Fecha           *string `json:"fecha"`
	ProveedorID     *int64  `json:"proveedor_id"`
	Notas           *string `json:"notas"`
	Total           float64 `json:"total"`
	ProveedorNombre *string `json:"proveedor_nombre"`
	Lineas          []Linea `json:"lineas"`
}

// Venta refleja stock_ventas con sus líneas.
type Venta struct {
	ID             int64   `json:"id"`
	Fecha          *string `json:"fecha"`
	PacienteID     *int64  `json:"paciente_id"`
	Notas          *string `json:"notas"`
	Total          float64 `json:"total"`
	PacienteNombre *string `json:"paciente_nombre"`
	Lineas         []Linea `json:"lineas"`
}

// CompraInput / VentaInput son los cuerpos de creación.
type CompraInput struct {
	Fecha       *string      `json:"fecha"`
	ProveedorID *int64       `json:"proveedor_id"`
	Notas       *string      `json:"notas"`
	Lineas      []LineaInput `json:"lineas"`
}

type VentaInput struct {
	Fecha      *string      `json:"fecha"`
	PacienteID *int64       `json:"paciente_id"`
	Notas      *string      `json:"notas"`
	Lineas     []LineaInput `json:"lineas"`
}

// --- Auditoría (RGPD) ---

// AuditEntry es una fila del registro de auditoría.
type AuditEntry struct {
	ID      int64   `json:"id"`
	Fecha   *string `json:"fecha"`
	Usuario *string `json:"usuario"`
	Metodo  string  `json:"metodo"`
	Ruta    string  `json:"ruta"`
	Estado  int     `json:"estado"`
}

// --- Usuarios ---

// Usuario refleja la tabla usuarios SIN el hash de contraseña.
type Usuario struct {
	ID      int64   `json:"id"`
	Usuario string  `json:"usuario"`
	Rol     *string `json:"rol"`
	Creado  *string `json:"creado"`
}

// UsuarioInput es el cuerpo de creación de usuario.
type UsuarioInput struct {
	Usuario  string  `json:"usuario"`
	Password string  `json:"password"`
	Rol      *string `json:"rol"`
}
