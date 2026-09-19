package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/krp12345/present/server/internal/domain"
	"github.com/krp12345/present/server/internal/service"
)

type RecordHandler struct {
	records *service.RecordService
	auth    *service.AuthService
}

func NewRecordHandler(records *service.RecordService, auth *service.AuthService) *RecordHandler {
	return &RecordHandler{records: records, auth: auth}
}

func (h *RecordHandler) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/records", RequireSession(h.auth, h.recordsRoot))
	mux.HandleFunc("/api/records/", RequireSession(h.auth, h.recordByID))
}

func (h *RecordHandler) recordsRoot(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		filter, err := parseRecordFilter(r)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		records, err := h.records.List(r.Context(), filter)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, toRecordDTOs(records))
	case http.MethodPost:
		input, err := decodeRecordInput(r)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		rec, err := h.records.Create(r.Context(), input)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, toRecordDTO(rec))
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func (h *RecordHandler) recordByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/records/")
	if id == "" || strings.Contains(id, "/") {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		rec, err := h.records.Get(r.Context(), id)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, toRecordDTO(rec))
	case http.MethodPut:
		input, err := decodeRecordInput(r)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		rec, err := h.records.Update(r.Context(), id, input)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, toRecordDTO(rec))
	case http.MethodDelete:
		if err := h.records.Remove(r.Context(), id); err != nil {
			writeError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func parseRecordFilter(r *http.Request) (domain.RecordFilter, error) {
	filter := domain.RecordFilter{TagID: r.URL.Query().Get("tagId")}
	if from := r.URL.Query().Get("from"); from != "" {
		t, err := time.Parse(time.RFC3339, from)
		if err != nil {
			return filter, err
		}
		filter.From = &t
	}
	if to := r.URL.Query().Get("to"); to != "" {
		t, err := time.Parse(time.RFC3339, to)
		if err != nil {
			return filter, err
		}
		filter.To = &t
	}
	return filter, nil
}

func decodeRecordInput(r *http.Request) (domain.RecordInput, error) {
	var body struct {
		Description string   `json:"description"`
		MomentAt    string   `json:"momentAt"`
		TagIDs      []string `json:"tagIds"`
		Version     int      `json:"version"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		return domain.RecordInput{}, err
	}
	input := domain.RecordInput{
		Description: body.Description,
		TagIDs:      body.TagIDs,
		Version:     body.Version,
	}
	if body.MomentAt != "" {
		t, err := time.Parse(time.RFC3339, body.MomentAt)
		if err != nil {
			return domain.RecordInput{}, err
		}
		input.MomentAt = t.UTC()
	}
	return input, nil
}
