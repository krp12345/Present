package config

import (
	"os"
	"time"
)

type Config struct {
	Addr       string
	DatabaseURL string
	StaticKey  string
	SessionTTL time.Duration
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
		addr = ":8080"
	}
	return Config{
		Addr:        addr,
		DatabaseURL: db,
		StaticKey:   key,
		SessionTTL:  ttl,
	}
}
