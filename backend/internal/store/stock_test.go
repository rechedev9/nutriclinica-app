package store

import (
	"path/filepath"
	"testing"

	"nutriclinica/internal/models"
)

// abrirTest crea una BD SQLite temporal migrada para pruebas.
func abrirTest(t *testing.T) *Store {
	t.Helper()
	st, err := Open(filepath.Join(t.TempDir(), "test.db"))
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
	if len(alm) != 1 {
		t.Fatalf("se esperaba 1 producto en almacén, hay %d", len(alm))
	}
	if alm[0].StockActual != 11 {
		t.Errorf("stock_actual = %v, se esperaba 11", alm[0].StockActual)
	}

	compras, err := st.Compras()
	if err != nil {
		t.Fatal(err)
	}
	if len(compras) != 1 || len(compras[0].Lineas) != 2 {
		t.Fatalf("se esperaba 1 compra con 2 líneas, hay %d compras", len(compras))
	}

	ventas, err := st.Ventas()
	if err != nil {
		t.Fatal(err)
	}
	if len(ventas) != 1 || len(ventas[0].Lineas) != 1 {
		t.Fatalf("se esperaba 1 venta con 1 línea")
	}
	if ventas[0].Lineas[0].ProductoNombre == nil || *ventas[0].Lineas[0].ProductoNombre != "Batido" {
		t.Errorf("la línea debería traer el nombre del producto")
	}
}
