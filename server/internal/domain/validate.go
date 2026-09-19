package domain

import (
	"strings"
	"unicode/utf8"
)

const (
	MaxDescriptionLen = 1000
	MaxTagNameLen     = 200
	MaxUnlockFailures = 5
)

func ValidateDescription(desc string) error {
	if utf8.RuneCountInString(desc) > MaxDescriptionLen {
		return ErrDescriptionTooLong
	}
	return nil
}

func ValidateTagName(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return ErrTagNameRequired
	}
	if utf8.RuneCountInString(name) > MaxTagNameLen {
		return ErrTagNameTooLong
	}
	return nil
}
