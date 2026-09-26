package config

import (
	"os"
	"path/filepath"
	"time"
)

type Config struct {
	Addr        string
	DatabaseURL string
	StaticKey   string
	SessionTTL  time.Duration
	// TLSCertFile and TLSKeyFile are required: the app is served over HTTPS
	// only (architecture/transport.md). Both are produced by
	// ./scripts/issue-cert.py.
	TLSCertFile string
	TLSKeyFile  string
}

func Load() Config {
	ttl := time.Hour
	if v := os.Getenv("PRESENT_SESSION_TTL"); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			ttl = d
		}
	}
	key := os.Getenv("PRESENT_STATIC_KEY")
	if key == "" {
		key = "present-demo"
	}
	db := os.Getenv("DATABASE_URL")
	if db == "" {
		db = "postgres://present:present@localhost:5432/present?sslmode=disable"
	}
	addr := os.Getenv("PRESENT_ADDR")
	if addr == "" {
		addr = ":8443"
	}
	certFile := os.Getenv("PRESENT_TLS_CERT")
	if certFile == "" {
		certFile = filepath.Join("..", "pki", "server.fullchain.pem")
	}
	keyFile := os.Getenv("PRESENT_TLS_KEY")
	if keyFile == "" {
		keyFile = filepath.Join("..", "pki", "server.key.pem")
	}
	return Config{
		Addr:        addr,
		DatabaseURL: db,
		StaticKey:   key,
		SessionTTL:  ttl,
		TLSCertFile: certFile,
		TLSKeyFile:  keyFile,
	}
}
