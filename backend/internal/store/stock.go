package store

import (
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strconv"

	"nutriclinica/internal/models"
)

// --- Almacén ---

// Almacen devuelve los productos activos con su stock_actual calculado.
func (s *Store) Almacen() ([]models.AlmacenRow, error) {
	// Se preagregan las cantidades de compras y ventas por producto en
	// subconsultas y se unen por JOIN. Asi se calcula el stock con una sola
	// pasada (en vez de dos subconsultas correlacionadas por fila) y sin el
	// producto cartesiano que provocaria unir ambas tablas de lineas y agrupar.
	rows, err := s.DB.Query(`
		SELECT p.id, p.nombre, p.unidad, p.precio_coste, p.precio_venta, p.stock_minimo,
		       c.nombre as categoria, pr.nombre as proveedor_nombre,
		       COALESCE(comp.tot, 0) - COALESCE(vent.tot, 0) - COALESCE(merm.tot, 0) as stock_actual,
		       p.creado
		FROM stock_productos p
		LEFT JOIN stock_categorias c   ON c.id  = p.categoria_id
		LEFT JOIN stock_proveedores pr ON pr.id = p.proveedor_id
		LEFT JOIN (SELECT producto_id, SUM(cantidad) AS tot FROM stock_compras_lineas GROUP BY producto_id) comp
		       ON comp.producto_id = p.id
		LEFT JOIN (SELECT producto_id, SUM(cantidad) AS tot FROM stock_ventas_lineas GROUP BY producto_id) vent
		       ON vent.producto_id = p.id
		LEFT JOIN (SELECT producto_id, SUM(cantidad) AS tot FROM stock_mermas GROUP BY producto_id) merm
		       ON merm.producto_id = p.id
		WHERE p.activo=1 ORDER BY lower(p.nombre)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.AlmacenRow{}
	for rows.Next() {
		var r models.AlmacenRow
		if err := rows.Scan(&r.ID, &r.Nombre, &r.Unidad, &r.PrecioCoste, &r.PrecioVenta,
			&r.StockMinimo, &r.Categoria, &r.ProveedorNombre, &r.StockActual, &r.Creado); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// --- Productos ---

const productoCols = `id, nombre, categoria_id, proveedor_id, precio_coste, precio_venta,
	unidad, stock_minimo, activo, creado`

// Productos devuelve los productos activos con join de categoría y proveedor.
func (s *Store) Productos() ([]models.Producto, error) {
	rows, err := s.DB.Query(`
		SELECT p.id, p.nombre, p.categoria_id, p.proveedor_id, p.precio_coste, p.precio_venta,
		       p.unidad, p.stock_minimo, p.activo, p.creado,
		       c.nombre as categoria, pr.nombre as proveedor_nombre
		FROM stock_productos p
		LEFT JOIN stock_categorias c  ON c.id  = p.categoria_id
		LEFT JOIN stock_proveedores pr ON pr.id = p.proveedor_id
		WHERE p.activo=1 ORDER BY lower(p.nombre)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Producto{}
	for rows.Next() {
		var p models.Producto
		if err := rows.Scan(&p.ID, &p.Nombre, &p.CategoriaID, &p.ProveedorID, &p.PrecioCoste,
			&p.PrecioVenta, &p.Unidad, &p.StockMinimo, &p.Activo, &p.Creado,
			&p.Categoria, &p.ProveedorNombre); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) producto(id int64) (*models.Producto, error) {
	var p models.Producto
	err := s.DB.QueryRow(`SELECT `+productoCols+` FROM stock_productos WHERE id=$1`, id).
		Scan(&p.ID, &p.Nombre, &p.CategoriaID, &p.ProveedorID, &p.PrecioCoste,
			&p.PrecioVenta, &p.Unidad, &p.StockMinimo, &p.Activo, &p.Creado)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &p, err
}

func orZeroF(p *float64) float64 {
	if p == nil {
		return 0
	}
	return *p
}

func orUnidad(p *string) string {
	if p == nil || *p == "" {
		return "ud"
	}
	return *p
}

// CreateProducto inserta un producto y lo devuelve (sin join).
func (s *Store) CreateProducto(in models.ProductoInput) (*models.Producto, error) {
	var id int64
	err := s.DB.QueryRow(
		`INSERT INTO stock_productos (nombre, categoria_id, proveedor_id, precio_coste, precio_venta, unidad, stock_minimo)
		 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
		in.Nombre, in.CategoriaID, in.ProveedorID, orZeroF(in.PrecioCoste), orZeroF(in.PrecioVenta),
		orUnidad(in.Unidad), orZeroF(in.StockMinimo)).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.producto(id)
}

// UpdateProducto actualiza un producto y lo devuelve.
func (s *Store) UpdateProducto(id int64, in models.ProductoInput) (*models.Producto, error) {
	_, err := s.DB.Exec(
		`UPDATE stock_productos SET nombre=$1, categoria_id=$2, proveedor_id=$3, precio_coste=$4,
		 precio_venta=$5, unidad=$6, stock_minimo=$7 WHERE id=$8`,
		in.Nombre, in.CategoriaID, in.ProveedorID, orZeroF(in.PrecioCoste), orZeroF(in.PrecioVenta),
		orUnidad(in.Unidad), orZeroF(in.StockMinimo), id)
	if err != nil {
		return nil, err
	}
	return s.producto(id)
}

// SoftDeleteProducto marca un producto como inactivo (activo=0).
func (s *Store) SoftDeleteProducto(id int64) error {
	_, err := s.DB.Exec(`UPDATE stock_productos SET activo=0 WHERE id=$1`, id)
	return err
}

// --- Categorías ---

func (s *Store) Categorias() ([]models.Categoria, error) {
	rows, err := s.DB.Query(`SELECT id, nombre FROM stock_categorias ORDER BY lower(nombre)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Categoria{}
	for rows.Next() {
		var c models.Categoria
		if err := rows.Scan(&c.ID, &c.Nombre); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// ErrCategoriaDuplicada indica que ya existe una categoría con ese nombre
// (sin distinguir mayúsculas ni espacios sobrantes).
var ErrCategoriaDuplicada = errors.New("ya existe una categoría con ese nombre")

// existeCategoria comprueba si hay otra categoría (id distinto de excepto) con el mismo nombre normalizado.
func existeCategoria(tx *sql.Tx, nombre string, excepto int64) (bool, error) {
	// El lock de asesoría serializa altas y renombrados simultáneos hasta el commit.
	if _, err := tx.Exec(`SELECT pg_advisory_xact_lock(hashtext('stock_categorias'))`); err != nil {
		return false, err
	}
	var n int
	err := tx.QueryRow(
		`SELECT COUNT(*) FROM stock_categorias WHERE lower(btrim(nombre))=lower(btrim($1)) AND id<>$2`,
		nombre, excepto).Scan(&n)
	return n > 0, err
}

func (s *Store) CreateCategoria(nombre string) (*models.Categoria, error) {
	tx, err := s.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	dup, err := existeCategoria(tx, nombre, 0)
	if err != nil {
		return nil, err
	}
	if dup {
		return nil, ErrCategoriaDuplicada
	}
	var id int64
	if err := tx.QueryRow(`INSERT INTO stock_categorias (nombre) VALUES ($1) RETURNING id`, nombre).Scan(&id); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &models.Categoria{ID: id, Nombre: nombre}, nil
}

func (s *Store) UpdateCategoria(id int64, nombre string) (*models.Categoria, error) {
	tx, err := s.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	dup, err := existeCategoria(tx, nombre, id)
	if err != nil {
		return nil, err
	}
	if dup {
		return nil, ErrCategoriaDuplicada
	}
	if _, err := tx.Exec(`UPDATE stock_categorias SET nombre=$1 WHERE id=$2`, nombre, id); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &models.Categoria{ID: id, Nombre: nombre}, nil
}

func (s *Store) DeleteCategoria(id int64) error {
	_, err := s.DB.Exec(`DELETE FROM stock_categorias WHERE id=$1`, id)
	return err
}

// --- Proveedores ---

func (s *Store) Proveedores() ([]models.Proveedor, error) {
	rows, err := s.DB.Query(`SELECT id, nombre, telefono, email, notas FROM stock_proveedores ORDER BY lower(nombre)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Proveedor{}
	for rows.Next() {
		var p models.Proveedor
		if err := rows.Scan(&p.ID, &p.Nombre, &p.Telefono, &p.Email, &p.Notas); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) proveedor(id int64) (*models.Proveedor, error) {
	var p models.Proveedor
	err := s.DB.QueryRow(`SELECT id, nombre, telefono, email, notas FROM stock_proveedores WHERE id=$1`, id).
		Scan(&p.ID, &p.Nombre, &p.Telefono, &p.Email, &p.Notas)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &p, err
}

func (s *Store) CreateProveedor(in models.ProveedorInput) (*models.Proveedor, error) {
	var id int64
	err := s.DB.QueryRow(`INSERT INTO stock_proveedores (nombre, telefono, email, notas) VALUES ($1,$2,$3,$4) RETURNING id`,
		in.Nombre, in.Telefono, in.Email, in.Notas).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.proveedor(id)
}

func (s *Store) UpdateProveedor(id int64, in models.ProveedorInput) (*models.Proveedor, error) {
	_, err := s.DB.Exec(`UPDATE stock_proveedores SET nombre=$1, telefono=$2, email=$3, notas=$4 WHERE id=$5`,
		in.Nombre, in.Telefono, in.Email, in.Notas, id)
	if err != nil {
		return nil, err
	}
	return s.proveedor(id)
}

func (s *Store) DeleteProveedor(id int64) error {
	_, err := s.DB.Exec(`DELETE FROM stock_proveedores WHERE id=$1`, id)
	return err
}

// --- Compras ---

func (s *Store) Compras() ([]models.Compra, error) {
	rows, err := s.DB.Query(`
		SELECT c.id, c.fecha, c.proveedor_id, c.notas, c.total, pr.nombre as proveedor_nombre
		FROM stock_compras c
		LEFT JOIN stock_proveedores pr ON pr.id=c.proveedor_id
		ORDER BY c.fecha DESC, c.id DESC`)
	if err != nil {
		return nil, err
	}
	out := []models.Compra{}
	for rows.Next() {
		var c models.Compra
		if err := rows.Scan(&c.ID, &c.Fecha, &c.ProveedorID, &c.Notas, &c.Total, &c.ProveedorNombre); err != nil {
			rows.Close()
			return nil, err
		}
		out = append(out, c)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	// Cargar todas las líneas en una sola query y repartirlas por compra.
	// Evita el N+1 (ya no hace falta por el límite de una sola conexión de
	// SQLite, pero sigue siendo la forma más eficiente de traerlas).
	ids := make([]int64, len(out))
	for i := range out {
		ids[i] = out[i].ID
	}
	porPadre, err := s.lineasPorPadre("stock_compras_lineas", "compra_id", ids)
	if err != nil {
		return nil, err
	}
	for i := range out {
		out[i].Lineas = porPadre[out[i].ID]
	}
	return out, nil
}

// lineasPorPadre carga de golpe las líneas de varias compras/ventas y las
// agrupa por el id del padre (compra_id o venta_id). tabla y col son literales
// internos (no entran datos de usuario). Cada padre presente en ids recibe al
// menos un slice vacío para que el JSON serialice [] y no null.
func (s *Store) lineasPorPadre(tabla, col string, ids []int64) (map[int64][]models.Linea, error) {
	res := make(map[int64][]models.Linea, len(ids))
	for _, id := range ids {
		res[id] = []models.Linea{}
	}
	if len(ids) == 0 {
		return res, nil
	}
	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	q := fmt.Sprintf(`
		SELECT l.%s, l.id, l.producto_id, l.cantidad, l.precio_unitario, p.nombre as producto_nombre, p.unidad
		FROM %s l
		JOIN stock_productos p ON p.id=l.producto_id
		WHERE l.%s IN (%s)`, col, tabla, col, placeholders(1, len(ids)))
	rows, err := s.DB.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var padreID int64
		var l models.Linea
		if err := rows.Scan(&padreID, &l.ID, &l.ProductoID, &l.Cantidad, &l.PrecioUnitario, &l.ProductoNombre, &l.Unidad); err != nil {
			return nil, err
		}
		res[padreID] = append(res[padreID], l)
	}
	return res, rows.Err()
}

// CreateCompra inserta una compra con sus líneas en una transacción.
func (s *Store) CreateCompra(in models.CompraInput) (int64, error) {
	var total float64
	for _, l := range in.Lineas {
		total += l.Cantidad * orZeroF(l.PrecioUnitario)
	}
	tx, err := s.DB.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var cid int64
	err = tx.QueryRow(`INSERT INTO stock_compras (fecha, proveedor_id, notas, total) VALUES ($1,$2,$3,$4) RETURNING id`,
		in.Fecha, in.ProveedorID, in.Notas, total).Scan(&cid)
	if err != nil {
		return 0, err
	}
	for _, l := range in.Lineas {
		if _, err := tx.Exec(
			`INSERT INTO stock_compras_lineas (compra_id, producto_id, cantidad, precio_unitario) VALUES ($1,$2,$3,$4)`,
			cid, l.ProductoID, l.Cantidad, orZeroF(l.PrecioUnitario)); err != nil {
			return 0, err
		}
	}
	return cid, tx.Commit()
}

// UpdateCompra reemplaza los datos y líneas de una compra existente.
func (s *Store) UpdateCompra(id int64, in models.CompraInput) error {
	var total float64
	for _, l := range in.Lineas {
		total += l.Cantidad * orZeroF(l.PrecioUnitario)
	}
	tx, err := s.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	afectados, err := productosDeCompra(tx, id)
	if err != nil {
		return err
	}
	for _, l := range in.Lineas {
		afectados = append(afectados, l.ProductoID)
	}
	if err := bloquearProductos(tx, afectados); err != nil {
		return err
	}
	if _, err := tx.Exec(`UPDATE stock_compras SET fecha=$1, proveedor_id=$2, notas=$3, total=$4 WHERE id=$5`,
		in.Fecha, in.ProveedorID, in.Notas, total, id); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM stock_compras_lineas WHERE compra_id=$1`, id); err != nil {
		return err
	}
	for _, l := range in.Lineas {
		if _, err := tx.Exec(
			`INSERT INTO stock_compras_lineas (compra_id, producto_id, cantidad, precio_unitario) VALUES ($1,$2,$3,$4)`,
			id, l.ProductoID, l.Cantidad, orZeroF(l.PrecioUnitario)); err != nil {
			return err
		}
	}
	if err := comprobarStockNoNegativo(tx, afectados); err != nil {
		return err
	}
	return tx.Commit()
}

// DeleteCompra borra una compra y sus líneas.
func (s *Store) DeleteCompra(id int64) error {
	tx, err := s.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	afectados, err := productosDeCompra(tx, id)
	if err != nil {
		return err
	}
	if err := bloquearProductos(tx, afectados); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM stock_compras_lineas WHERE compra_id=$1`, id); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM stock_compras WHERE id=$1`, id); err != nil {
		return err
	}
	if err := comprobarStockNoNegativo(tx, afectados); err != nil {
		return err
	}
	return tx.Commit()
}

// --- Ventas ---

func (s *Store) Ventas() ([]models.Venta, error) {
	rows, err := s.DB.Query(`
		SELECT v.id, v.fecha, v.paciente_id, v.notas, v.total, p.nombre as paciente_nombre
		FROM stock_ventas v
		LEFT JOIN pacientes p ON p.id=v.paciente_id
		ORDER BY v.fecha DESC, v.id DESC`)
	if err != nil {
		return nil, err
	}
	out := []models.Venta{}
	for rows.Next() {
		var v models.Venta
		if err := rows.Scan(&v.ID, &v.Fecha, &v.PacienteID, &v.Notas, &v.Total, &v.PacienteNombre); err != nil {
			rows.Close()
			return nil, err
		}
		out = append(out, v)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	ids := make([]int64, len(out))
	for i := range out {
		ids[i] = out[i].ID
	}
	porPadre, err := s.lineasPorPadre("stock_ventas_lineas", "venta_id", ids)
	if err != nil {
		return nil, err
	}
	for i := range out {
		out[i].Lineas = porPadre[out[i].ID]
	}
	return out, nil
}

// CreateVenta inserta una venta con sus líneas en una transacción.
func (s *Store) CreateVenta(in models.VentaInput) (int64, error) {
	var total float64
	for _, l := range in.Lineas {
		total += l.Cantidad * orZeroF(l.PrecioUnitario)
	}
	tx, err := s.DB.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	if err := verificarStockSalida(tx, in.Lineas); err != nil {
		return 0, err
	}

	var vid int64
	err = tx.QueryRow(`INSERT INTO stock_ventas (fecha, paciente_id, notas, total) VALUES ($1,$2,$3,$4) RETURNING id`,
		in.Fecha, in.PacienteID, in.Notas, total).Scan(&vid)
	if err != nil {
		return 0, err
	}
	for _, l := range in.Lineas {
		if _, err := tx.Exec(
			`INSERT INTO stock_ventas_lineas (venta_id, producto_id, cantidad, precio_unitario) VALUES ($1,$2,$3,$4)`,
			vid, l.ProductoID, l.Cantidad, orZeroF(l.PrecioUnitario)); err != nil {
			return 0, err
		}
	}
	return vid, tx.Commit()
}

// --- Mermas ---

// ErrMotivoInvalido indica un motivo de merma fuera de la lista admitida.
var ErrMotivoInvalido = errors.New("motivo de merma no válido")

var motivosValidos = map[string]bool{
	"caducidad":          true,
	"accidente_rotura":   true,
	"devolucion_cliente": true,
}

func (s *Store) Mermas() ([]models.Merma, error) {
	rows, err := s.DB.Query(`
		SELECT m.id, m.producto_id, m.proveedor_id, m.cantidad, m.motivo, m.fecha, m.notas, m.creado,
		       p.nombre as producto_nombre, pr.nombre as proveedor_nombre, p.unidad
		FROM stock_mermas m
		JOIN stock_productos p ON p.id = m.producto_id
		LEFT JOIN stock_proveedores pr ON pr.id = m.proveedor_id
		ORDER BY m.fecha DESC, m.id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Merma{}
	for rows.Next() {
		var m models.Merma
		if err := rows.Scan(&m.ID, &m.ProductoID, &m.ProveedorID, &m.Cantidad, &m.Motivo,
			&m.Fecha, &m.Notas, &m.Creado, &m.ProductoNombre, &m.ProveedorNombre, &m.Unidad); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Store) CreateMerma(in models.MermaInput) (int64, error) {
	if !motivosValidos[in.Motivo] {
		return 0, ErrMotivoInvalido
	}
	tx, err := s.DB.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	if err := verificarStockSalida(tx, []models.LineaInput{{ProductoID: in.ProductoID, Cantidad: in.Cantidad}}); err != nil {
		return 0, err
	}
	var id int64
	err = tx.QueryRow(
		`INSERT INTO stock_mermas (producto_id, proveedor_id, cantidad, motivo, fecha, notas) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		in.ProductoID, in.ProveedorID, in.Cantidad, in.Motivo, in.Fecha, in.Notas).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

func (s *Store) DeleteMerma(id int64) error {
	_, err := s.DB.Exec(`DELETE FROM stock_mermas WHERE id=$1`, id)
	return err
}

// DeleteVenta borra una venta y sus líneas.
func (s *Store) DeleteVenta(id int64) error {
	tx, err := s.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`DELETE FROM stock_ventas_lineas WHERE venta_id=$1`, id); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM stock_ventas WHERE id=$1`, id); err != nil {
		return err
	}
	return tx.Commit()
}

// StockInsuficienteError indica que una venta supera las existencias.
type StockInsuficienteError struct {
	Producto string
	Quedan   float64
}

func (e *StockInsuficienteError) Error() string {
	return fmt.Sprintf("Stock insuficiente de «%s»: quedan %s", e.Producto, formatCantidad(e.Quedan))
}

func formatCantidad(v float64) string {
	return strconv.FormatFloat(v, 'f', -1, 64)
}

// ErrProductoNoDisponible indica que el producto no existe o está dado de baja.
var ErrProductoNoDisponible = errors.New("el producto no existe o está dado de baja")

// StockNegativoError indica que borrar o reducir una compra dejaría el stock
// de un producto por debajo de cero (ya se vendieron o mermaron esas unidades).
type StockNegativoError struct {
	Producto string
}

func (e *StockNegativoError) Error() string {
	return fmt.Sprintf("No se puede modificar la compra: las unidades de «%s» ya se han vendido o dado de baja", e.Producto)
}

// stockProducto calcula compras - ventas - mermas de un producto.
func stockProducto(tx *sql.Tx, id int64) (float64, error) {
	var stock float64
	err := tx.QueryRow(`
		SELECT COALESCE((SELECT SUM(cantidad) FROM stock_compras_lineas WHERE producto_id=$1), 0)
		     - COALESCE((SELECT SUM(cantidad) FROM stock_ventas_lineas WHERE producto_id=$1), 0)
		     - COALESCE((SELECT SUM(cantidad) FROM stock_mermas WHERE producto_id=$1), 0)`, id).Scan(&stock)
	return stock, err
}

// idsOrdenados devuelve los ids sin repetir y ordenados, para bloquear filas
// siempre en el mismo orden y evitar interbloqueos.
func idsOrdenados(ids []int64) []int64 {
	visto := map[int64]bool{}
	out := make([]int64, 0, len(ids))
	for _, id := range ids {
		if !visto[id] {
			visto[id] = true
			out = append(out, id)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i] < out[j] })
	return out
}

// productosDeCompra devuelve los productos de las líneas de una compra.
func productosDeCompra(tx *sql.Tx, compraID int64) ([]int64, error) {
	rows, err := tx.Query(`SELECT producto_id FROM stock_compras_lineas WHERE compra_id=$1`, compraID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// bloquearProductos toma FOR UPDATE sobre los productos, en orden de id.
func bloquearProductos(tx *sql.Tx, ids []int64) error {
	for _, id := range idsOrdenados(ids) {
		var x int64
		err := tx.QueryRow(`SELECT id FROM stock_productos WHERE id=$1 FOR UPDATE`, id).Scan(&x)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}
	}
	return nil
}

// comprobarStockNoNegativo falla si algún producto queda con stock < 0.
func comprobarStockNoNegativo(tx *sql.Tx, ids []int64) error {
	for _, id := range idsOrdenados(ids) {
		stock, err := stockProducto(tx, id)
		if err != nil {
			return err
		}
		if stock < 0 {
			var nombre string
			if err := tx.QueryRow(`SELECT nombre FROM stock_productos WHERE id=$1`, id).Scan(&nombre); err != nil {
				return err
			}
			return &StockNegativoError{Producto: nombre}
		}
	}
	return nil
}

// verificarStockSalida (ventas y mermas) bloquea las filas de producto en
// orden de id y comprueba que existen, están activas y que cada cantidad
// cabe en las existencias.
func verificarStockSalida(tx *sql.Tx, lineas []models.LineaInput) error {
	pedido := map[int64]float64{}
	ids := make([]int64, 0, len(lineas))
	for _, l := range lineas {
		pedido[l.ProductoID] += l.Cantidad
		ids = append(ids, l.ProductoID)
	}
	for _, id := range idsOrdenados(ids) {
		var nombre string
		err := tx.QueryRow(`SELECT nombre FROM stock_productos WHERE id=$1 AND activo=1 FOR UPDATE`, id).Scan(&nombre)
		if errors.Is(err, sql.ErrNoRows) {
			return ErrProductoNoDisponible
		}
		if err != nil {
			return err
		}
		stock, err := stockProducto(tx, id)
		if err != nil {
			return err
		}
		if pedido[id] > stock {
			return &StockInsuficienteError{Producto: nombre, Quedan: stock}
		}
	}
	return nil
}
