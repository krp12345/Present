package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/krp12345/present/server/internal/service"
)

type TagHandler struct {
	tags *service.TagService
	auth *service.AuthService
}

func NewTagHandler(tags *service.TagService, auth *service.AuthService) *TagHandler {
	return &TagHandler{tags: tags, auth: auth}
}

func (h *TagHandler) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/tags", RequireSession(h.auth, h.tagsRoot))
	mux.HandleFunc("/api/tags/", RequireSession(h.auth, h.tagByID))
}

func (h *TagHandler) tagsRoot(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		includeDeleted := r.URL.Query().Get("includeDeleted") == "true"
		tags, err := h.tags.List(r.Context(), includeDeleted)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, toTagDTOs(tags))
	case http.MethodPost:
		var body struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
			return
		}
		tag, err := h.tags.Create(r.Context(), body.Name)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, toTagDTO(tag))
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func (h *TagHandler) tagByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/tags/")
	if id == "" || strings.Contains(id, "/") {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	switch r.Method {
	case http.MethodPut:
		var body struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
			return
		}
		tag, err := h.tags.Rename(r.Context(), id, body.Name)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, toTagDTO(tag))
	case http.MethodDelete:
		if err := h.tags.Remove(r.Context(), id); err != nil {
			writeError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}
