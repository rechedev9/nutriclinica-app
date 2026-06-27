package server

import (
	"net/http"

	"nutriclinica/internal/models"
)

func normalizeRevision(r *models.Revision) {
	r.Fecha = emptyToNil(r.Fecha)
	r.Notas = emptyToNil(r.Notas)
}

func (s *Server) handleListRevisiones(w http.ResponseWriter, r *http.Request) {
	pid, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	revs, err := s.st.Revisiones(pid)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, revs)
}

func (s *Server) handleCreateRevision(w http.ResponseWriter, r *http.Request) {
	pid, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var rev models.Revision
	if err := decodeJSON(r, &rev); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	normalizeRevision(&rev)
	created, err := s.st.CreateRevision(pid, &rev)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (s *Server) handleUpdateRevision(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var rev models.Revision
	if err := decodeJSON(r, &rev); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	normalizeRevision(&rev)
	updated, err := s.st.UpdateRevision(id, &rev)
	if err != nil {
		serverError(w, err)
		return
	}
	if updated == nil {
		writeError(w, http.StatusNotFound, "Revisión no encontrada")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (s *Server) handleDeleteRevision(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := s.st.DeleteRevision(id); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}
