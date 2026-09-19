package httpapi

import (
	"time"

	"github.com/krp12345/present/server/internal/domain"
)

type tagDTO struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Deleted bool   `json:"deleted"`
}

type tagRefDTO struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Deleted bool   `json:"deleted"`
}

type recordDTO struct {
	ID          string      `json:"id"`
	Description string      `json:"description"`
	MomentAt    string      `json:"momentAt"`
	Version     int         `json:"version"`
	Deleted     bool        `json:"deleted"`
	Tags        []tagRefDTO `json:"tags"`
}

func toTagDTO(t domain.Tag) tagDTO {
	return tagDTO{ID: t.ID, Name: t.Name, Deleted: t.Deleted}
}

func toTagDTOs(tags []domain.Tag) []tagDTO {
	out := make([]tagDTO, len(tags))
	for i, t := range tags {
		out[i] = toTagDTO(t)
	}
	return out
}

func toRecordDTO(r domain.Record) recordDTO {
	tags := make([]tagRefDTO, len(r.Tags))
	for i, t := range r.Tags {
		tags[i] = tagRefDTO{ID: t.ID, Name: t.Name, Deleted: t.Deleted}
	}
	return recordDTO{
		ID:          r.ID,
		Description: r.Description,
		MomentAt:    r.MomentAt.UTC().Format(time.RFC3339),
		Version:     r.Version,
		Deleted:     r.Deleted,
		Tags:        tags,
	}
}

func toRecordDTOs(records []domain.Record) []recordDTO {
	out := make([]recordDTO, len(records))
	for i, r := range records {
		out[i] = toRecordDTO(r)
	}
	return out
}
