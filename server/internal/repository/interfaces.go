package repository

import (
	"context"
	"time"

	"github.com/krp12345/present/server/internal/domain"
)

type LockoutRepository interface {
	Get(ctx context.Context, identity string) (domain.Lockout, error)
	Save(ctx context.Context, lockout domain.Lockout) error
}

type SessionRepository interface {
	Create(ctx context.Context, token string, expiresAt time.Time) error
	GetExpiry(ctx context.Context, token string) (time.Time, error)
	Delete(ctx context.Context, token string) error
}

type TagRepository interface {
	List(ctx context.Context, includeDeleted bool) ([]domain.Tag, error)
	GetByName(ctx context.Context, name string) (domain.Tag, error)
	GetByID(ctx context.Context, id string) (domain.Tag, error)
	Create(ctx context.Context, name string) (domain.Tag, error)
	ReEnable(ctx context.Context, id string) (domain.Tag, error)
	Rename(ctx context.Context, id, name string) (domain.Tag, error)
	SoftDelete(ctx context.Context, id string) error
}

type RecordRepository interface {
	List(ctx context.Context, filter domain.RecordFilter) ([]domain.Record, error)
	GetByID(ctx context.Context, id string) (domain.Record, error)
	Create(ctx context.Context, input domain.RecordInput) (domain.Record, error)
	Update(ctx context.Context, id string, input domain.RecordInput) (domain.Record, error)
	SoftDelete(ctx context.Context, id string) error
}
