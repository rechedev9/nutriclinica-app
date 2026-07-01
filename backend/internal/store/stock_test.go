package store

import (
	"path/filepath"
	"testing"

	"nutriclinica/internal/models"
)

// abrirTest crea una BD SQLite temporal migrada para pruebas.
func abrirTest(t *testing.T) *Store {
	t.Helper()
	st, err := Open(filepath.Join(t.TempDir(), "test.db"), nil)
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
