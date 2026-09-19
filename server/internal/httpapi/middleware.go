package httpapi

import (
	"net/http"

	"github.com/krp12345/present/server/internal/domain"
	"github.com/krp12345/present/server/internal/service"
)

func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Present-Key, X-Present-Session, X-Present-Client-Id")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func RequireSession(auth *service.AuthService, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get(service.HeaderSession)
		ok, err := auth.ValidateSession(r.Context(), token)
		if err != nil || !ok {
			writeError(w, domain.ErrSessionExpired)
			return
		}
		next(w, r)
	}
}
