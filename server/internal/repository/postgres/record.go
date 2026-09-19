package postgres

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/krp12345/present/server/internal/domain"
)

type RecordRepo struct {
	pool *pgxpool.Pool
}

func NewRecordRepo(pool *pgxpool.Pool) *RecordRepo {
	return &RecordRepo{pool: pool}
}

func (r *RecordRepo) List(ctx context.Context, filter domain.RecordFilter) ([]domain.Record, error) {
	query := `SELECT id, description, moment_at, version, deleted FROM records WHERE NOT deleted`
	args := []any{}
	n := 1
	if filter.TagID != "" {
		query += fmt.Sprintf(` AND EXISTS (SELECT 1 FROM record_tags rt WHERE rt.record_id = records.id AND rt.tag_id = $%d)`, n)
		args = append(args, filter.TagID)
		n++
	}
	if filter.From != nil {
		query += ` AND moment_at >= $` + strconv.Itoa(n)
		args = append(args, *filter.From)
		n++
	}
	if filter.To != nil {
		query += ` AND moment_at <= $` + strconv.Itoa(n)
		args = append(args, *filter.To)
		n++
	}
	query += ` ORDER BY moment_at DESC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []domain.Record
	for rows.Next() {
		rec, err := scanRecord(rows)
		if err != nil {
			return nil, err
		}
		rec.Tags, err = r.loadTags(ctx, rec.ID)
		if err != nil {
			return nil, err
		}
		records = append(records, rec)
	}
	return records, rows.Err()
}

func (r *RecordRepo) GetByID(ctx context.Context, id string) (domain.Record, error) {
	row, err := r.pool.Query(ctx, `SELECT id, description, moment_at, version, deleted FROM records WHERE id = $1 AND NOT deleted`, id)
	if err != nil {
		return domain.Record{}, err
	}
	defer row.Close()
	if !row.Next() {
		return domain.Record{}, domain.ErrNotFound
	}
	rec, err := scanRecord(row)
	if err != nil {
		return domain.Record{}, err
	}
	rec.Tags, err = r.loadTags(ctx, rec.ID)
	return rec, err
}

func (r *RecordRepo) Create(ctx context.Context, input domain.RecordInput) (domain.Record, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.Record{}, err
	}
	defer tx.Rollback(ctx)

	var rec domain.Record
	err = tx.QueryRow(ctx, `
		INSERT INTO records (description, moment_at) VALUES ($1, $2)
		RETURNING id, description, moment_at, version, deleted
	`, input.Description, input.MomentAt).Scan(&rec.ID, &rec.Description, &rec.MomentAt, &rec.Version, &rec.Deleted)
	if err != nil {
		return domain.Record{}, err
	}
	for _, tagID := range input.TagIDs {
		if _, err := tx.Exec(ctx, `INSERT INTO record_tags (record_id, tag_id) VALUES ($1, $2)`, rec.ID, tagID); err != nil {
			return domain.Record{}, domain.ErrValidation
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.Record{}, err
	}
	rec.Tags, _ = r.loadTags(ctx, rec.ID)
	return rec, nil
}

func (r *RecordRepo) Update(ctx context.Context, id string, input domain.RecordInput) (domain.Record, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.Record{}, err
	}
	defer tx.Rollback(ctx)

	var currentVersion int
	var deleted bool
	err = tx.QueryRow(ctx, `SELECT version, deleted FROM records WHERE id = $1`, id).Scan(&currentVersion, &deleted)
	if errors.Is(err, pgx.ErrNoRows) || deleted {
		return domain.Record{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.Record{}, err
	}
	if input.Version != currentVersion {
		return domain.Record{}, domain.ErrStaleVersion
	}

	var rec domain.Record
	err = tx.QueryRow(ctx, `
		UPDATE records SET description = $2, moment_at = $3, version = version + 1, updated_at = NOW()
		WHERE id = $1 AND version = $4 AND NOT deleted
		RETURNING id, description, moment_at, version, deleted
	`, id, input.Description, input.MomentAt, input.Version).Scan(&rec.ID, &rec.Description, &rec.MomentAt, &rec.Version, &rec.Deleted)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Record{}, domain.ErrStaleVersion
	}
	if err != nil {
		return domain.Record{}, err
	}

	_, _ = tx.Exec(ctx, `DELETE FROM record_tags WHERE record_id = $1`, id)
	for _, tagID := range input.TagIDs {
		if _, err := tx.Exec(ctx, `INSERT INTO record_tags (record_id, tag_id) VALUES ($1, $2)`, id, tagID); err != nil {
			return domain.Record{}, domain.ErrValidation
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.Record{}, err
	}
	rec.Tags, _ = r.loadTags(ctx, rec.ID)
	return rec, nil
}

func (r *RecordRepo) SoftDelete(ctx context.Context, id string) error {
	res, err := r.pool.Exec(ctx, `UPDATE records SET deleted = TRUE WHERE id = $1 AND NOT deleted`, id)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *RecordRepo) loadTags(ctx context.Context, recordID string) ([]domain.TagRef, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT t.id, t.name, t.deleted
		FROM record_tags rt JOIN tags t ON t.id = rt.tag_id
		WHERE rt.record_id = $1 ORDER BY t.name
	`, recordID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tags []domain.TagRef
	for rows.Next() {
		var t domain.TagRef
		if err := rows.Scan(&t.ID, &t.Name, &t.Deleted); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

func scanRecord(rows pgx.Rows) (domain.Record, error) {
	var rec domain.Record
	if err := rows.Scan(&rec.ID, &rec.Description, &rec.MomentAt, &rec.Version, &rec.Deleted); err != nil {
		return domain.Record{}, err
	}
	return rec, nil
}
