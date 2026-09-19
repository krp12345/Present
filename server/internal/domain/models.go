package domain

import "time"

type Tag struct {
	ID      string
	Name    string
	Deleted bool
}

type TagRef struct {
	ID      string
	Name    string
	Deleted bool
}

type Record struct {
	ID          string
	Description string
	MomentAt    time.Time
	Version     int
	Deleted     bool
	Tags        []TagRef
}

type Session struct {
	Token     string
	ExpiresAt time.Time
}

type Lockout struct {
	Identity string
	Failures int
	Blocked  bool
}

type RecordFilter struct {
	TagID string
	From  *time.Time
	To    *time.Time
}

type RecordInput struct {
	Description string
	MomentAt    time.Time
	TagIDs      []string
	Version     int
}
