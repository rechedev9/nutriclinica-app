package store

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"nutriclinica/internal/models"
)

// pgConfigTest lee la conexión a Postgres de las mismas variables de entorno
// que usa la app (ver config.PostgresFromEnv). Si no están definidas, el test
// se omite: estos son tests de integración que necesitan un Postgres real
// (local o de pruebas), no un fichero SQLite temporal como antes.
func pgConfigTest(t *testing.T) Config {
	t.Helper()
	host := os.Getenv("NUTRICLINICA_PG_HOST")
	if host == "" {
		t.Skip("NUTRICLINICA_PG_HOST no definida: se omiten los tests de integración con Postgres")
	}
	port := 5432
	if v := os.Getenv("NUTRICLINICA_PG_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			port = p
		}
	}
	return Config{
		Host:     host,
		Port:     port,
		User:     os.Getenv("NUTRICLINICA_PG_USER"),
		Password: os.Getenv("NUTRICLINICA_PG_PASSWORD"),
		DBName:   os.Getenv("NUTRICLINICA_PG_DBNAME"),
		SSLMode:  os.Getenv("NUTRICLINICA_PG_SSLMODE"),
	}
}

// abrirTest crea un esquema de Postgres desechable y devuelve un Store
// migrado sobre él, aislado del resto de tests y de los datos reales.
func abrirTest(t *testing.T) *Store {
	t.Helper()
	base := pgConfigTest(t)
	schema := fmt.Sprintf("test_%d", time.Now().UnixNano())

	admin, err := Open(base)
	if err != nil {
		t.Fatalf("conectando a Postgres: %v", err)
	}
	if _, err := admin.DB.Exec(`CREATE SCHEMA "` + schema + `"`); err != nil {
		admin.Close()
		t.Fatalf("creando esquema de prueba: %v", err)
	}
	t.Cleanup(func() {
		admin.DB.Exec(`DROP SCHEMA "` + schema + `" CASCADE`)
		admin.Close()
	})

	base.SearchPath = schema
	st, err := Open(base)
	if err != nil {
		t.Fatalf("abriendo BD de prueba: %v", err)
	}
	t.Cleanup(func() { st.Close() })
	if err := st.Migrate(); err != nil {
		t.Fatalf("migrando BD de prueba: %v", err)
	}
	return st
}

func f64(v float64) *float64 { return &v }

func TestAlmacenYLineas(t *testing.T) {
	st := abrirTest(t)

	prov, err := st.CreateProveedor(models.ProveedorInput{Nombre: "Proveedor A"})
	if err != nil {
		t.Fatal(err)
	}
	prod, err := st.CreateProducto(models.ProductoInput{
		Nombre:      "Batido",
		ProveedorID: &prov.ID,
		PrecioCoste: f64(2),
		PrecioVenta: f64(5),
	})
	if err != nil {
		t.Fatal(err)
	}

	// Compra con dos líneas (10 + 5 = 15 unidades).
	if _, err := st.CreateCompra(models.CompraInput{
		ProveedorID: &prov.ID,
		Lineas: []models.LineaInput{
			{ProductoID: prod.ID, Cantidad: 10, PrecioUnitario: f64(2)},
			{ProductoID: prod.ID, Cantidad: 5, PrecioUnitario: f64(2)},
		},
	}); err != nil {
		t.Fatal(err)
	}
	// Venta de 4 unidades → stock = 15 - 4 = 11.
	if _, err := st.CreateVenta(models.VentaInput{
		Lineas: []models.LineaInput{{ProductoID: prod.ID, Cantidad: 4, PrecioUnitario: f64(5)}},
	}); err != nil {
		t.Fatal(err)
	}

	alm, err := st.Almacen()
	if err != nil {
		t.Fatal(err)
	}
	var almBatido *models.AlmacenRow
	for i := range alm {
		if alm[i].Nombre == "Batido" {
			almBatido = &alm[i]
			break
		}
	}
	if almBatido == nil {
		t.Fatal("producto 'Batido' no encontrado en almacén")
	}
	if almBatido.StockActual != 11 {
		t.Errorf("stock_actual = %v, se esperaba 11", almBatido.StockActual)
	}

	compras, err := st.Compras()
	if err != nil {
		t.Fatal(err)
	}
	var compraTest *models.Compra
	for i := range compras {
		if compras[i].ProveedorNombre != nil && *compras[i].ProveedorNombre == "Proveedor A" {
			compraTest = &compras[i]
			break
		}
	}
	if compraTest == nil || len(compraTest.Lineas) != 2 {
		t.Fatalf("se esperaba 1 compra de 'Proveedor A' con 2 líneas")
	}

	ventas, err := st.Ventas()
	if err != nil {
		t.Fatal(err)
	}
	var ventaTest *models.Venta
	for i := range ventas {
		for _, l := range ventas[i].Lineas {
			if l.ProductoNombre != nil && *l.ProductoNombre == "Batido" {
				ventaTest = &ventas[i]
				break
			}
		}
		if ventaTest != nil {
			break
		}
	}
	if ventaTest == nil || len(ventaTest.Lineas) != 1 {
		t.Fatal("se esperaba 1 venta con 1 línea de 'Batido'")
	}
	if ventaTest.Lineas[0].ProductoNombre == nil || *ventaTest.Lineas[0].ProductoNombre != "Batido" {
		t.Errorf("la línea debería traer el nombre del producto")
	}
}

func TestAuditoria(t *testing.T) {
	st := abrirTest(t)
	if err := st.RegistrarAuditoria("admin", "POST", "/api/pacientes", 201); err != nil {
		t.Fatal(err)
	}
	if err := st.RegistrarAuditoria("Jose", "DELETE", "/api/pacientes/3", 200); err != nil {
		t.Fatal(err)
	}
	entradas, err := st.Auditoria(10)
	if err != nil {
		t.Fatal(err)
	}
	if len(entradas) != 2 {
		t.Fatalf("se esperaban 2 entradas, hay %d", len(entradas))
	}
	// Más recientes primero.
	if entradas[0].Metodo != "DELETE" || entradas[0].Ruta != "/api/pacientes/3" {
		t.Errorf("la primera entrada debería ser el DELETE más reciente, es %+v", entradas[0])
	}
}

func TestCategoriaDuplicadaYEnUso(t *testing.T) {
	st := abrirTest(t)

	c, err := st.CreateCategoria("Batidos")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.CreateCategoria("  batidos "); !errors.Is(err, ErrCategoriaDuplicada) {
		t.Fatalf("crear duplicada: quería ErrCategoriaDuplicada, obtuve %v", err)
	}
	otra, err := st.CreateCategoria("Barritas")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.UpdateCategoria(otra.ID, "BATIDOS"); !errors.Is(err, ErrCategoriaDuplicada) {
		t.Fatalf("renombrar a duplicada: quería ErrCategoriaDuplicada, obtuve %v", err)
	}
	if _, err := st.UpdateCategoria(c.ID, "Batidos"); err != nil {
		t.Fatalf("renombrar a su mismo nombre debe valer: %v", err)
	}

	if _, err := st.CreateProducto(models.ProductoInput{Nombre: "Batido", CategoriaID: &c.ID}); err != nil {
		t.Fatal(err)
	}
	if err := st.DeleteCategoria(c.ID); !IsForeignKeyViolation(err) {
		t.Fatalf("borrar categoría en uso: quería violación de clave ajena, obtuve %v", err)
	}
}

func TestProveedorEnUso(t *testing.T) {
	st := abrirTest(t)

	prov, err := st.CreateProveedor(models.ProveedorInput{Nombre: "Proveedor B"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.CreateProducto(models.ProductoInput{Nombre: "Barrita", ProveedorID: &prov.ID}); err != nil {
		t.Fatal(err)
	}
	if err := st.DeleteProveedor(prov.ID); !IsForeignKeyViolation(err) {
		t.Fatalf("borrar proveedor en uso: quería violación de clave ajena, obtuve %v", err)
	}
}

func TestVentaStockInsuficiente(t *testing.T) {
	st := abrirTest(t)

	prod, err := st.CreateProducto(models.ProductoInput{Nombre: "Proteína", PrecioVenta: f64(10)})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.CreateCompra(models.CompraInput{
		Lineas: []models.LineaInput{{ProductoID: prod.ID, Cantidad: 8, PrecioUnitario: f64(5)}},
	}); err != nil {
		t.Fatal(err)
	}

	venta := func(cant ...float64) error {
		var ls []models.LineaInput
		for _, c := range cant {
			ls = append(ls, models.LineaInput{ProductoID: prod.ID, Cantidad: c, PrecioUnitario: f64(10)})
		}
		_, err := st.CreateVenta(models.VentaInput{Lineas: ls})
		return err
	}

	antes, err := st.Ventas()
	if err != nil {
		t.Fatal(err)
	}
	var sinStock *StockInsuficienteError
	if err := venta(99999); !errors.As(err, &sinStock) {
		t.Fatalf("quería StockInsuficienteError, obtuve %v", err)
	}
	if sinStock.Producto != "Proteína" || sinStock.Quedan != 8 {
		t.Errorf("error inesperado: %+v", sinStock)
	}
	if got := sinStock.Error(); got != "Stock insuficiente de «Proteína»: quedan 8" {
		t.Errorf("mensaje = %q", got)
	}
	// Dos líneas del mismo producto se suman: 5 + 5 > 8.
	if err := venta(5, 5); !errors.As(err, &sinStock) {
		t.Fatalf("líneas repetidas deben sumarse, obtuve %v", err)
	}
	if err := venta(8); err != nil {
		t.Fatalf("vender exactamente el stock debe valer: %v", err)
	}
	if err := venta(1); !errors.As(err, &sinStock) || sinStock.Quedan != 0 {
		t.Fatalf("stock agotado: obtuve %v", err)
	}
	ventas, err := st.Ventas()
	if err != nil {
		t.Fatal(err)
	}
	if len(ventas) != len(antes)+1 {
		t.Errorf("solo debe añadirse la venta válida: antes %d, ahora %d", len(antes), len(ventas))
	}
}

func TestVentasConcurrentesNoSuperanStock(t *testing.T) {
	st := abrirTest(t)

	prod, err := st.CreateProducto(models.ProductoInput{Nombre: "Barrita"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.CreateCompra(models.CompraInput{
		Lineas: []models.LineaInput{{ProductoID: prod.ID, Cantidad: 5}},
	}); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	var exitos atomic.Int32
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := st.CreateVenta(models.VentaInput{
				Lineas: []models.LineaInput{{ProductoID: prod.ID, Cantidad: 1}},
			}); err == nil {
				exitos.Add(1)
			}
		}()
	}
	wg.Wait()
	if exitos.Load() != 5 {
		t.Errorf("se esperaban 5 ventas correctas, hubo %d", exitos.Load())
	}
}

func TestComprasYMermasNoDejanStockNegativo(t *testing.T) {
	st := abrirTest(t)

	prod, err := st.CreateProducto(models.ProductoInput{Nombre: "Colágeno", PrecioVenta: f64(10)})
	if err != nil {
		t.Fatal(err)
	}
	compra := func(cant float64) models.CompraInput {
		return models.CompraInput{Lineas: []models.LineaInput{{ProductoID: prod.ID, Cantidad: cant, PrecioUnitario: f64(5)}}}
	}
	cid, err := st.CreateCompra(compra(10))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.CreateVenta(models.VentaInput{
		Lineas: []models.LineaInput{{ProductoID: prod.ID, Cantidad: 6, PrecioUnitario: f64(10)}},
	}); err != nil {
		t.Fatal(err)
	}

	var negativo *StockNegativoError
	if err := st.DeleteCompra(cid); !errors.As(err, &negativo) {
		t.Fatalf("borrar compra ya vendida: quería StockNegativoError, obtuve %v", err)
	}
	if err := st.UpdateCompra(cid, compra(5)); !errors.As(err, &negativo) {
		t.Fatalf("reducir compra por debajo de lo vendido: obtuve %v", err)
	}
	if err := st.UpdateCompra(cid, compra(6)); err != nil {
		t.Fatalf("reducir hasta lo vendido debe valer: %v", err)
	}

	var sinStock *StockInsuficienteError
	merma := models.MermaInput{ProductoID: prod.ID, Cantidad: 1, Motivo: "caducidad"}
	if _, err := st.CreateMerma(merma); !errors.As(err, &sinStock) {
		t.Fatalf("merma sin stock: quería StockInsuficienteError, obtuve %v", err)
	}
}

func TestVentaProductoInexistenteOInactivo(t *testing.T) {
	st := abrirTest(t)

	linea := func(id int64) models.VentaInput {
		return models.VentaInput{Lineas: []models.LineaInput{{ProductoID: id, Cantidad: 1, PrecioUnitario: f64(1)}}}
	}
	if _, err := st.CreateVenta(linea(999999)); !errors.Is(err, ErrProductoNoDisponible) {
		t.Fatalf("producto inexistente: obtuve %v", err)
	}
	prod, err := st.CreateProducto(models.ProductoInput{Nombre: "Descatalogado"})
	if err != nil {
		t.Fatal(err)
	}
	if err := st.SoftDeleteProducto(prod.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := st.CreateVenta(linea(prod.ID)); !errors.Is(err, ErrProductoNoDisponible) {
		t.Fatalf("producto de baja: obtuve %v", err)
	}
}
