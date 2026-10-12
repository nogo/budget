package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
)

var b64 = base64.RawURLEncoding

// errBadCookie covers every cookie that fails to decode or verify.
var errBadCookie = errors.New("auth: bad cookie")

// seal encodes v as JSON and signs it. The purpose is part of the MAC, so a
// login cookie never verifies as a session cookie and the other way round.
func seal(key []byte, purpose string, v any) (string, error) {
	payload, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	p := b64.EncodeToString(payload)
	return p + "." + b64.EncodeToString(mac(key, purpose, p)), nil
}

// open verifies a value made by seal and decodes it into v.
func open(key []byte, purpose, value string, v any) error {
	p, sig, ok := strings.Cut(value, ".")
	if !ok {
		return errBadCookie
	}
	got, err := b64.DecodeString(sig)
	if err != nil || !hmac.Equal(got, mac(key, purpose, p)) {
		return errBadCookie
	}
	payload, err := b64.DecodeString(p)
	if err != nil {
		return errBadCookie
	}
	if err := json.Unmarshal(payload, v); err != nil {
		return errBadCookie
	}
	return nil
}

func mac(key []byte, purpose, payload string) []byte {
	h := hmac.New(sha256.New, key)
	h.Write([]byte(purpose))
	h.Write([]byte{0})
	h.Write([]byte(payload))
	return h.Sum(nil)
}
