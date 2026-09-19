package domain

import "errors"

var (
	ErrDenied             = errors.New("denied")
	ErrBlocked            = errors.New("blocked")
	ErrNotFound           = errors.New("not found")
	ErrConflict           = errors.New("conflict")
	ErrValidation         = errors.New("validation")
	ErrStaleVersion       = errors.New("stale version")
	ErrSessionExpired     = errors.New("session expired")
	ErrAtLeastOneTag      = errors.New("at least one tag required")
	ErrFutureTime         = errors.New("future time not allowed")
	ErrDescriptionTooLong = errors.New("description too long")
	ErrTagNameRequired    = errors.New("tag name required")
	ErrTagNameTooLong     = errors.New("tag name too long")
	ErrTagNameExists      = errors.New("tag name already exists")
)
