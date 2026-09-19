package service

import (
	"context"
	"strings"

	"github.com/krp12345/present/server/internal/domain"
	"github.com/krp12345/present/server/internal/repository"
)

type TagService struct {
	tags repository.TagRepository
}

func NewTagService(tags repository.TagRepository) *TagService {
	return &TagService{tags: tags}
}

func (s *TagService) List(ctx context.Context, includeDeleted bool) ([]domain.Tag, error) {
	return s.tags.List(ctx, includeDeleted)
}

func (s *TagService) Create(ctx context.Context, name string) (domain.Tag, error) {
	name = strings.TrimSpace(name)
	if err := domain.ValidateTagName(name); err != nil {
		return domain.Tag{}, err
	}
	existing, err := s.tags.GetByName(ctx, name)
	if err == nil {
		if existing.Deleted {
			return s.tags.ReEnable(ctx, existing.ID)
		}
		return domain.Tag{}, domain.ErrTagNameExists
	}
	if err != domain.ErrNotFound {
		return domain.Tag{}, err
	}
	return s.tags.Create(ctx, name)
}

func (s *TagService) Rename(ctx context.Context, id, name string) (domain.Tag, error) {
	name = strings.TrimSpace(name)
	if err := domain.ValidateTagName(name); err != nil {
		return domain.Tag{}, err
	}
	existing, err := s.tags.GetByName(ctx, name)
	if err == nil && existing.ID != id {
		return domain.Tag{}, domain.ErrTagNameExists
	}
	if err != nil && err != domain.ErrNotFound {
		return domain.Tag{}, err
	}
	return s.tags.Rename(ctx, id, name)
}

func (s *TagService) Remove(ctx context.Context, id string) error {
	return s.tags.SoftDelete(ctx, id)
}
