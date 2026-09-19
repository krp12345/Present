package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/krp12345/present/server/internal/domain"
)

type TagRepo struct {
	pool *pgxpool.Pool
}

func NewTagRepo(pool *pgxpool.Pool) *TagRepo {
	return &TagRepo{pool: pool}
}

func (r *TagRepo) List(ctx context.Context, includeDeleted bool) ([]domain.Tag, error) {
	query := `SELECT id, name, deleted FROM tags`
	if !includeDeleted {
		query += ` WHERE NOT deleted`
	}
	query += ` ORDER BY name`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tags []domain.Tag
	for rows.Next() {
		var t domain.Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.Deleted); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

func (r *TagRepo) GetByName(ctx context.Context, name string) (domain.Tag, error) {
	var t domain.Tag
	err := r.pool.QueryRow(ctx, `SELECT id, name, deleted FROM tags WHERE name = $1`, name).
		Scan(&t.ID, &t.Name, &t.Deleted)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Tag{}, domain.ErrNotFound
	}
	return t, err
}

func (r *TagRepo) GetByID(ctx context.Context, id string) (domain.Tag, error) {
	var t domain.Tag
	err := r.pool.QueryRow(ctx, `SELECT id, name, deleted FROM tags WHERE id = $1`, id).
		Scan(&t.ID, &t.Name, &t.Deleted)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Tag{}, domain.ErrNotFound
	}
	return t, err
}

func (r *TagRepo) Create(ctx context.Context, name string) (domain.Tag, error) {
	var t domain.Tag
	err := r.pool.QueryRow(ctx, `INSERT INTO tags (name) VALUES ($1) RETURNING id, name, deleted`, name).
		Scan(&t.ID, &t.Name, &t.Deleted)
	return t, err
}

func (r *TagRepo) ReEnable(ctx context.Context, id string) (domain.Tag, error) {
	var t domain.Tag
	err := r.pool.QueryRow(ctx, `UPDATE tags SET deleted = FALSE WHERE id = $1 RETURNING id, name, deleted`, id).
		Scan(&t.ID, &t.Name, &t.Deleted)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Tag{}, domain.ErrNotFound
	}
	return t, err
}

func (r *TagRepo) Rename(ctx context.Context, id, name string) (domain.Tag, error) {
	var t domain.Tag
	err := r.pool.QueryRow(ctx, `UPDATE tags SET name = $2 WHERE id = $1 AND NOT deleted RETURNING id, name, deleted`, id, name).
		Scan(&t.ID, &t.Name, &t.Deleted)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Tag{}, domain.ErrNotFound
	}
	return t, err
}

func (r *TagRepo) SoftDelete(ctx context.Context, id string) error {
	res, err := r.pool.Exec(ctx, `UPDATE tags SET deleted = TRUE WHERE id = $1 AND NOT deleted`, id)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}
