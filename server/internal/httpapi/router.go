package httpapi

import (
	"net/http"

	"github.com/krp12345/present/server/internal/service"
)

type Router struct {
	auth    *AuthHandler
	tags    *TagHandler
	records *RecordHandler
}

func NewRouter(auth *service.AuthService, tags *service.TagService, records *service.RecordService) *Router {
	return &Router{
		auth:    NewAuthHandler(auth),
		tags:    NewTagHandler(tags, auth),
		records: NewRecordHandler(records, auth),
	}
}

func (r *Router) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/unlock", r.auth.Unlock)
	mux.HandleFunc("/api/status", r.auth.Status)
	r.tags.Register(mux)
	r.records.Register(mux)
}
