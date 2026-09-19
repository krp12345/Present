package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/krp12345/present/server/internal/domain"
	"github.com/krp12345/present/server/internal/repository"
)

const (
	HeaderStaticKey = "X-Present-Key"
	HeaderSession   = "X-Present-Session"
	HeaderClientID  = "X-Present-Client-Id"
)

type AuthService struct {
	lockouts repository.LockoutRepository
	sessions repository.SessionRepository
	staticKey string
	sessionTTL time.Duration
}

func NewAuthService(lockouts repository.LockoutRepository, sessions repository.SessionRepository, staticKey string, sessionTTL time.Duration) *AuthService {
	return &AuthService{
		lockouts:   lockouts,
		sessions:   sessions,
		staticKey:  staticKey,
		sessionTTL: sessionTTL,
	}
}

func ClientIdentity(r *http.Request) string {
	ip := r.RemoteAddr
	if host, _, err := net.SplitHostPort(ip); err == nil {
		ip = host
	}
	clientID := strings.TrimSpace(r.Header.Get(HeaderClientID))
	if clientID == "" {
		clientID = "anonymous"
	}
	return ip + "|" + clientID
}

type UnlockResult struct {
	Session domain.Session
	Remaining int
}

func (s *AuthService) Status(ctx context.Context, identity string, sessionToken string) (blocked bool, remaining int, sessionValid bool, err error) {
	lockout, err := s.lockouts.Get(ctx, identity)
	if err != nil {
		return false, 0, false, err
	}
	if lockout.Blocked {
		return true, 0, false, nil
	}
	remaining = domain.MaxUnlockFailures - lockout.Failures
	if sessionToken != "" {
		sessionValid, _ = s.ValidateSession(ctx, sessionToken)
	}
	return false, remaining, sessionValid, nil
}

func (s *AuthService) Unlock(ctx context.Context, identity, key string) (UnlockResult, error) {
	lockout, err := s.lockouts.Get(ctx, identity)
	if err != nil {
		return UnlockResult{}, err
	}
	if lockout.Blocked {
		return UnlockResult{}, domain.ErrBlocked
	}
	if strings.TrimSpace(key) != s.staticKey {
		lockout.Failures++
		lockout.Blocked = lockout.Failures >= domain.MaxUnlockFailures
		if err := s.lockouts.Save(ctx, lockout); err != nil {
			return UnlockResult{}, err
		}
		remaining := domain.MaxUnlockFailures - lockout.Failures
		if remaining < 0 {
			remaining = 0
		}
		return UnlockResult{Remaining: remaining}, domain.ErrDenied
	}
	lockout.Failures = 0
	lockout.Blocked = false
	if err := s.lockouts.Save(ctx, lockout); err != nil {
		return UnlockResult{}, err
	}
	token, err := randomToken()
	if err != nil {
		return UnlockResult{}, err
	}
	session := domain.Session{Token: token, ExpiresAt: time.Now().UTC().Add(s.sessionTTL)}
	if err := s.sessions.Create(ctx, session.Token, session.ExpiresAt); err != nil {
		return UnlockResult{}, err
	}
	return UnlockResult{Session: session, Remaining: domain.MaxUnlockFailures}, nil
}

func (s *AuthService) ValidateSession(ctx context.Context, token string) (bool, error) {
	if strings.TrimSpace(token) == "" {
		return false, nil
	}
	expires, err := s.sessions.GetExpiry(ctx, token)
	if err != nil {
		return false, nil
	}
	if time.Now().UTC().After(expires) {
		_ = s.sessions.Delete(ctx, token)
		return false, nil
	}
	return true, nil
}

func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
