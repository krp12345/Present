package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/krp12345/present/server/internal/config"
	"github.com/krp12345/present/server/internal/db"
	"github.com/krp12345/present/server/internal/httpapi"
	"github.com/krp12345/present/server/internal/repository/postgres"
	"github.com/krp12345/present/server/internal/service"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	lockouts := postgres.NewLockoutRepo(pool)
	sessions := postgres.NewSessionRepo(pool)
	tags := postgres.NewTagRepo(pool)
	records := postgres.NewRecordRepo(pool)

	authSvc := service.NewAuthService(lockouts, sessions, cfg.StaticKey, cfg.SessionTTL)
	tagSvc := service.NewTagService(tags)
	recordSvc := service.NewRecordService(records)

	mux := http.NewServeMux()
	httpapi.NewRouter(authSvc, tagSvc, recordSvc).Register(mux)

	staticDir := os.Getenv("PRESENT_STATIC_DIR")
	if staticDir == "" {
		staticDir = filepath.Join("..", "web", "dist")
	}
	if info, err := os.Stat(staticDir); err == nil && info.IsDir() {
		mux.Handle("/", httpapi.StaticHandler(staticDir))
	}

	log.Printf("Present listening on %s (dev static key: %q)", cfg.Addr, cfg.StaticKey)
	if err := http.ListenAndServe(cfg.Addr, httpapi.CORSMiddleware(mux)); err != nil {
		log.Fatal(err)
	}
}
