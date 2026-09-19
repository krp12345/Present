package service

import (
	"context"
	"time"

	"github.com/krp12345/present/server/internal/domain"
	"github.com/krp12345/present/server/internal/repository"
)

type RecordService struct {
	records repository.RecordRepository
}

func NewRecordService(records repository.RecordRepository) *RecordService {
	return &RecordService{records: records}
}

func (s *RecordService) List(ctx context.Context, filter domain.RecordFilter) ([]domain.Record, error) {
	return s.records.List(ctx, filter)
}

func (s *RecordService) Get(ctx context.Context, id string) (domain.Record, error) {
	return s.records.GetByID(ctx, id)
}

func (s *RecordService) Create(ctx context.Context, input domain.RecordInput) (domain.Record, error) {
	if len(input.TagIDs) == 0 {
		return domain.Record{}, domain.ErrAtLeastOneTag
	}
	if err := domain.ValidateDescription(input.Description); err != nil {
		return domain.Record{}, err
	}
	if input.MomentAt.IsZero() {
		input.MomentAt = time.Now().UTC()
	}
	if input.MomentAt.After(time.Now().UTC()) {
		return domain.Record{}, domain.ErrFutureTime
	}
	return s.records.Create(ctx, input)
}

func (s *RecordService) Update(ctx context.Context, id string, input domain.RecordInput) (domain.Record, error) {
	if len(input.TagIDs) == 0 {
		return domain.Record{}, domain.ErrAtLeastOneTag
	}
	if err := domain.ValidateDescription(input.Description); err != nil {
		return domain.Record{}, err
	}
	if input.MomentAt.After(time.Now().UTC()) {
		return domain.Record{}, domain.ErrFutureTime
	}
	return s.records.Update(ctx, id, input)
}

func (s *RecordService) Remove(ctx context.Context, id string) error {
	return s.records.SoftDelete(ctx, id)
}
