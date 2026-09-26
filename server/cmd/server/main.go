package main

import (
	"context"
	"crypto/tls"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

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

	// HTTPS only. There is no HTTP listener and no redirect, by design:
	// architecture/transport.md.
	for _, path := range []string{cfg.TLSCertFile, cfg.TLSKeyFile} {
		if _, err := os.Stat(path); err != nil {
			log.Fatalf("TLS material %s is missing: run ./scripts/make-ca.py and "+
				"./scripts/issue-cert.py, or set PRESENT_TLS_CERT and PRESENT_TLS_KEY", path)
		}
	}

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           httpapi.CORSMiddleware(mux),
		TLSConfig:         &tls.Config{MinVersion: tls.VersionTLS12},
		ReadHeaderTimeout: 10 * time.Second,
	}

	log.Printf("Present listening on https://%s (dev static key: %q)", cfg.Addr, cfg.StaticKey)
	if err := srv.ListenAndServeTLS(cfg.TLSCertFile, cfg.TLSKeyFile); err != nil {
		log.Fatal(err)
	}
}
