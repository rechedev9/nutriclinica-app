package server

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"nutriclinica/internal/models"
	"nutriclinica/internal/naming"
)

// emptyToNil convierte un *string vacío en nil (replica "valor or None" de Flask).
func emptyToNil(p *string) *string {
	if p == nil {
		return nil
	}
	if strings.TrimSpace(*p) == "" {
		return nil
	}
	return p
}

func normalizePaciente(in *models.PacienteInput) {
	in.Nombre = strings.TrimSpace(in.Nombre)
	in.FechaNac = emptyToNil(in.FechaNac)
	in.Sexo = emptyToNil(in.Sexo)
	in.DNI = emptyToNil(in.DNI)
	in.Telefono = emptyToNil(in.Telefono)
	in.Email = emptyToNil(in.Email)
	in.Objetivo = emptyToNil(in.Objetivo)
	in.ActividadFisica = emptyToNil(in.ActividadFisica)
	in.Intolerancias = emptyToNil(in.Intolerancias)
	in.Patologias = emptyToNil(in.Patologias)
	in.Notas = emptyToNil(in.Notas)
	in.GrupoSanguineo = emptyToNil(in.GrupoSanguineo)
}

func (s *Server) handleListPacientes(w http.ResponseWriter, r *http.Request) {
	ps, err := s.db().Pacientes()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ps)
}

func (s *Server) handleCreatePaciente(w http.ResponseWriter, r *http.Request) {
	var in models.PacienteInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	normalizePaciente(&in)
	if msg := validarPaciente(&in, time.Now()); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	p, err := s.db().CreatePaciente(in)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (s *Server) handleUpdatePaciente(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var in models.PacienteInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	normalizePaciente(&in)
	if msg := validarPaciente(&in, time.Now()); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	p, err := s.db().UpdatePaciente(id, in)
	if err != nil {
		serverError(w, err)
		return
	}
	if p == nil {
		writeError(w, http.StatusNotFound, "Paciente no encontrado")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (s *Server) handleDeletePaciente(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	nombre, err := s.db().DeletePaciente(id)
	if err != nil {
		serverError(w, err)
		return
	}
	// Borrar la carpeta de fotos del paciente (best-effort, tras el commit).
	if nombre != "" {
		carpeta := filepath.Join(s.fotosDir, naming.Carpeta(nombre))
		if err := os.RemoveAll(carpeta); err != nil {
			// No es fatal: la fila ya se borró.
			_ = err
		}
	}
	writeJSON(w, http.StatusOK, ok(nil))
}
