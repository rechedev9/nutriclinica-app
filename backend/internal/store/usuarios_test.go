package store

import (
	"errors"
	"testing"
)

func TestUltimoAdminProtegido(t *testing.T) {
	st := abrirTest(t)

	if _, err := st.DB.Exec(`DELETE FROM usuarios`); err != nil {
		t.Fatal(err)
	}
	a1, err := st.CreateUsuario("ana", "hash", "admin")
	if err != nil {
		t.Fatal(err)
	}
	u, err := st.CreateUsuario("luis", "hash", "user")
	if err != nil {
		t.Fatal(err)
	}

	if err := st.DeleteUsuario(a1.ID); !errors.Is(err, ErrUltimoAdmin) {
		t.Fatalf("borrar al último admin: quería ErrUltimoAdmin, obtuve %v", err)
	}
	if _, err := st.UpdateUsuario(a1.ID, "ana", "user"); !errors.Is(err, ErrUltimoAdmin) {
		t.Fatalf("degradar al último admin: quería ErrUltimoAdmin, obtuve %v", err)
	}

	a2, err := st.CreateUsuario("eva", "hash", "admin")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.UpdateUsuario(a1.ID, "ana", "user"); err != nil {
		t.Fatalf("degradar con otro admin presente: %v", err)
	}
	if err := st.DeleteUsuario(a2.ID); !errors.Is(err, ErrUltimoAdmin) {
		t.Fatalf("borrar al admin restante: quería ErrUltimoAdmin, obtuve %v", err)
	}
	if err := st.DeleteUsuario(u.ID); err != nil {
		t.Fatalf("borrar un usuario normal: %v", err)
	}
}
