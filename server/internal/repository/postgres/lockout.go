package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/krp12345/present/server/internal/domain"
)

type LockoutRepo struct {
	pool *pgxpool.Pool
}

func NewLockoutRepo(pool *pgxpool.Pool) *LockoutRepo {
	return &LockoutRepo{pool: pool}
}

func (r *LockoutRepo) Get(ctx context.Context, identity string) (domain.Lockout, error) {
	var lockout domain.Lockout
	lockout.Identity = identity
	err := r.pool.QueryRow(ctx, `SELECT failures, blocked FROM lockout WHERE identity = $1`, identity).
		Scan(&lockout.Failures, &lockout.Blocked)
	if errors.Is(err, pgx.ErrNoRows) {
		return lockout, nil
	}
	return lockout, err
}

func (r *LockoutRepo) Save(ctx context.Context, lockout domain.Lockout) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO lockout (identity, failures, blocked) VALUES ($1, $2, $3)
		ON CONFLICT (identity) DO UPDATE SET failures = EXCLUDED.failures, blocked = EXCLUDED.blocked
	`, lockout.Identity, lockout.Failures, lockout.Blocked)
	return err
}
