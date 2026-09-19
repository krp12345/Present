package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/krp12345/present/server/internal/domain"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrDenied):
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "denied"})
	case errors.Is(err, domain.ErrBlocked):
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "blocked"})
	case errors.Is(err, domain.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
	case errors.Is(err, domain.ErrConflict), errors.Is(err, domain.ErrTagNameExists):
		writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()})
	case errors.Is(err, domain.ErrStaleVersion):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "record changed elsewhere"})
	case errors.Is(err, domain.ErrSessionExpired):
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "session expired"})
	case errors.Is(err, domain.ErrValidation),
		errors.Is(err, domain.ErrAtLeastOneTag),
		errors.Is(err, domain.ErrFutureTime),
		errors.Is(err, domain.ErrDescriptionTooLong),
		errors.Is(err, domain.ErrTagNameRequired),
		errors.Is(err, domain.ErrTagNameTooLong):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	default:
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "server error"})
	}
}
