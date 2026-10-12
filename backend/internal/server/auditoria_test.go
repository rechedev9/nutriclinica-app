package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAccionAuditoria(t *testing.T) {
	casos := []struct {
		metodo, ruta, quiero string
	}{
		{http.MethodPost, "/api/login", "Acceso"},
		{http.MethodPost, "/api/logout", "Salida"},
		{http.MethodPost, "/api/pacientes", http.MethodPost},
		{http.MethodDelete, "/api/usuarios/3", http.MethodDelete},
	}
	for _, c := range casos {
		r := httptest.NewRequest(c.metodo, c.ruta, nil)
		if got := accionAuditoria(r); got != c.quiero {
			t.Errorf("%s %s: acción %q, quería %q", c.metodo, c.ruta, got, c.quiero)
		}
	}
}
