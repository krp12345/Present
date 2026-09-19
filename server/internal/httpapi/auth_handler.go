package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/krp12345/present/server/internal/domain"
	"github.com/krp12345/present/server/internal/service"
)

type AuthHandler struct {
	auth *service.AuthService
}

func NewAuthHandler(auth *service.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

func (h *AuthHandler) Unlock(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	identity := service.ClientIdentity(r)
	blocked, _, _, err := h.auth.Status(r.Context(), identity, "")
	if err != nil {
		writeError(w, err)
		return
	}
	if blocked {
		writeError(w, domain.ErrBlocked)
		return
	}
	key := r.Header.Get(service.HeaderStaticKey)
	if key == "" {
		var body struct {
			Key string `json:"key"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		key = body.Key
	}
	result, err := h.auth.Unlock(r.Context(), identity, key)
	if err != nil {
		if errors.Is(err, domain.ErrDenied) {
			writeJSON(w, http.StatusUnauthorized, map[string]any{
				"error":          "denied",
				"triesRemaining": result.Remaining,
			})
			return
		}
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"sessionToken": result.Session.Token,
		"expiresAt":    result.Session.ExpiresAt,
	})
}

func (h *AuthHandler) Status(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	identity := service.ClientIdentity(r)
	blocked, remaining, valid, err := h.auth.Status(r.Context(), identity, r.Header.Get(service.HeaderSession))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"blocked":        blocked,
		"triesRemaining": remaining,
		"sessionValid":   valid,
	})
}
