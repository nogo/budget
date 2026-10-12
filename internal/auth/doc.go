// Package auth signs people in through OpenID Connect and keeps them signed
// in with a signed session cookie. Reach for it to mount the /auth routes and
// to ask "which account sent this request?".
//
// Without an issuer it runs in development mode: /auth/login signs in one
// fixed account and no provider is contacted.
package auth
