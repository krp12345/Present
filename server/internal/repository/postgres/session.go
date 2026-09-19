package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SessionRepo struct {
	pool *pgxpool.Pool
}

func NewSessionRepo(pool *pgxpool.Pool) *SessionRepo {
	return &SessionRepo{pool: pool}
}

func (r *SessionRepo) Create(ctx context.Context, token string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO sessions (token, expires_at) VALUES ($1, $2)`, token, expiresAt)
	return err
}

func (r *SessionRepo) GetExpiry(ctx context.Context, token string) (time.Time, error) {
	var expires time.Time
	err := r.pool.QueryRow(ctx, `SELECT expires_at FROM sessions WHERE token = $1`, token).Scan(&expires)
	if errors.Is(err, pgx.ErrNoRows) {
		return time.Time{}, pgx.ErrNoRows
	}
	return expires, err
}

func (r *SessionRepo) Delete(ctx context.Context, token string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM sessions WHERE token = $1`, token)
	return err
}
