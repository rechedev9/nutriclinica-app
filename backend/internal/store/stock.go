package store

import (
	"database/sql"

	"nutriclinica/internal/models"
)

// --- Almacén ---

// Almacen devuelve los productos activos con su stock_actual calculado.
func (s *Store) Almacen() ([]models.AlmacenRow, error) {
	rows, err := s.DB.Query(`
		SELECT p.id, p.nombre, p.unidad, p.precio_coste, p.precio_venta, p.stock_minimo,
		       c.nombre as categoria, pr.nombre as proveedor_nombre,
		       COALESCE((SELECT SUM(cl.cantidad) FROM stock_compras_lineas cl WHERE cl.producto_id=p.id),0) -
		       COALESCE((SELECT SUM(vl.cantidad) FROM stock_ventas_lineas  vl WHERE vl.producto_id=p.id),0) as stock_actual
		FROM stock_productos p
		LEFT JOIN stock_categorias c  ON c.id  = p.categoria_id
		LEFT JOIN stock_proveedores pr ON pr.id = p.proveedor_id
		WHERE p.activo=1 ORDER BY p.nombre COLLATE NOCASE`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.AlmacenRow{}
	for rows.Next() {
		var r models.AlmacenRow
		if err := rows.Scan(&r.ID, &r.Nombre, &r.Unidad, &r.PrecioCoste, &r.PrecioVenta,
			&r.StockMinimo, &r.Categoria, &r.ProveedorNombre, &r.StockActual); err != nil {
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
		WHERE p.activo=1 ORDER BY p.nombre COLLATE NOCASE`)
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
	err := s.DB.QueryRow(`SELECT `+productoCols+` FROM stock_productos WHERE id=?`, id).
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
	res, err := s.DB.Exec(
		`INSERT INTO stock_productos (nombre, categoria_id, proveedor_id, precio_coste, precio_venta, unidad, stock_minimo)
		 VALUES (?,?,?,?,?,?,?)`,
		in.Nombre, in.CategoriaID, in.ProveedorID, orZeroF(in.PrecioCoste), orZeroF(in.PrecioVenta),
		orUnidad(in.Unidad), orZeroF(in.StockMinimo))
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return s.producto(id)
}

// UpdateProducto actualiza un producto y lo devuelve.
func (s *Store) UpdateProducto(id int64, in models.ProductoInput) (*models.Producto, error) {
	_, err := s.DB.Exec(
		`UPDATE stock_productos SET nombre=?, categoria_id=?, proveedor_id=?, precio_coste=?,
		 precio_venta=?, unidad=?, stock_minimo=? WHERE id=?`,
		in.Nombre, in.CategoriaID, in.ProveedorID, orZeroF(in.PrecioCoste), orZeroF(in.PrecioVenta),
		orUnidad(in.Unidad), orZeroF(in.StockMinimo), id)
	if err != nil {
		return nil, err
	}
	return s.producto(id)
}

// SoftDeleteProducto marca un producto como inactivo (activo=0).
func (s *Store) SoftDeleteProducto(id int64) error {
	_, err := s.DB.Exec(`UPDATE stock_productos SET activo=0 WHERE id=?`, id)
	return err
}

// --- Categorías ---

func (s *Store) Categorias() ([]models.Categoria, error) {
	rows, err := s.DB.Query(`SELECT id, nombre FROM stock_categorias ORDER BY nombre COLLATE NOCASE`)
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

func (s *Store) CreateCategoria(nombre string) (*models.Categoria, error) {
	res, err := s.DB.Exec(`INSERT INTO stock_categorias (nombre) VALUES (?)`, nombre)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &models.Categoria{ID: id, Nombre: nombre}, nil
}

// --- Proveedores ---

func (s *Store) Proveedores() ([]models.Proveedor, error) {
	rows, err := s.DB.Query(`SELECT id, nombre, telefono, email, notas FROM stock_proveedores ORDER BY nombre COLLATE NOCASE`)
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
	err := s.DB.QueryRow(`SELECT id, nombre, telefono, email, notas FROM stock_proveedores WHERE id=?`, id).
		Scan(&p.ID, &p.Nombre, &p.Telefono, &p.Email, &p.Notas)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &p, err
}

func (s *Store) CreateProveedor(in models.ProveedorInput) (*models.Proveedor, error) {
	res, err := s.DB.Exec(`INSERT INTO stock_proveedores (nombre, telefono, email, notas) VALUES (?,?,?,?)`,
		in.Nombre, in.Telefono, in.Email, in.Notas)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return s.proveedor(id)
}

func (s *Store) UpdateProveedor(id int64, in models.ProveedorInput) (*models.Proveedor, error) {
	_, err := s.DB.Exec(`UPDATE stock_proveedores SET nombre=?, telefono=?, email=?, notas=? WHERE id=?`,
		in.Nombre, in.Telefono, in.Email, in.Notas, id)
	if err != nil {
		return nil, err
	}
	return s.proveedor(id)
}

func (s *Store) DeleteProveedor(id int64) error {
	_, err := s.DB.Exec(`DELETE FROM stock_proveedores WHERE id=?`, id)
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
	// Cargar líneas tras cerrar el cursor (una sola conexión: nada anidado).
	for i := range out {
		lineas, err := s.compraLineas(out[i].ID)
		if err != nil {
			return nil, err
		}
		out[i].Lineas = lineas
	}
	return out, nil
}

func (s *Store) compraLineas(compraID int64) ([]models.Linea, error) {
	rows, err := s.DB.Query(`
		SELECT l.id, l.producto_id, l.cantidad, l.precio_unitario, p.nombre as producto_nombre, p.unidad
		FROM stock_compras_lineas l
		JOIN stock_productos p ON p.id=l.producto_id
		WHERE l.compra_id=?`, compraID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Linea{}
	for rows.Next() {
		var l models.Linea
		if err := rows.Scan(&l.ID, &l.ProductoID, &l.Cantidad, &l.PrecioUnitario, &l.ProductoNombre, &l.Unidad); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
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

	res, err := tx.Exec(`INSERT INTO stock_compras (fecha, proveedor_id, notas, total) VALUES (?,?,?,?)`,
		in.Fecha, in.ProveedorID, in.Notas, total)
	if err != nil {
		return 0, err
	}
	cid, _ := res.LastInsertId()
	for _, l := range in.Lineas {
		if _, err := tx.Exec(
			`INSERT INTO stock_compras_lineas (compra_id, producto_id, cantidad, precio_unitario) VALUES (?,?,?,?)`,
			cid, l.ProductoID, l.Cantidad, orZeroF(l.PrecioUnitario)); err != nil {
			return 0, err
		}
	}
	return cid, tx.Commit()
}

// DeleteCompra borra una compra y sus líneas.
func (s *Store) DeleteCompra(id int64) error {
	tx, err := s.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`DELETE FROM stock_compras_lineas WHERE compra_id=?`, id); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM stock_compras WHERE id=?`, id); err != nil {
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
	for i := range out {
		lineas, err := s.ventaLineas(out[i].ID)
		if err != nil {
			return nil, err
		}
		out[i].Lineas = lineas
	}
	return out, nil
}

func (s *Store) ventaLineas(ventaID int64) ([]models.Linea, error) {
	rows, err := s.DB.Query(`
		SELECT l.id, l.producto_id, l.cantidad, l.precio_unitario, p.nombre as producto_nombre, p.unidad
		FROM stock_ventas_lineas l
		JOIN stock_productos p ON p.id=l.producto_id
		WHERE l.venta_id=?`, ventaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Linea{}
	for rows.Next() {
		var l models.Linea
		if err := rows.Scan(&l.ID, &l.ProductoID, &l.Cantidad, &l.PrecioUnitario, &l.ProductoNombre, &l.Unidad); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
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

	res, err := tx.Exec(`INSERT INTO stock_ventas (fecha, paciente_id, notas, total) VALUES (?,?,?,?)`,
		in.Fecha, in.PacienteID, in.Notas, total)
	if err != nil {
		return 0, err
	}
	vid, _ := res.LastInsertId()
	for _, l := range in.Lineas {
		if _, err := tx.Exec(
			`INSERT INTO stock_ventas_lineas (venta_id, producto_id, cantidad, precio_unitario) VALUES (?,?,?,?)`,
			vid, l.ProductoID, l.Cantidad, orZeroF(l.PrecioUnitario)); err != nil {
			return 0, err
		}
	}
	return vid, tx.Commit()
}

// DeleteVenta borra una venta y sus líneas.
func (s *Store) DeleteVenta(id int64) error {
	tx, err := s.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`DELETE FROM stock_ventas_lineas WHERE venta_id=?`, id); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM stock_ventas WHERE id=?`, id); err != nil {
		return err
	}
	return tx.Commit()
}
