# API security configuration

The API server applies security headers, an origin allowlist, request-size limits,
per-process IP and authenticated-user rate limits, structured security-event logging, and Supabase token
verification for the versioned `/api/v1` route namespace.

## Environment

- `SUPABASE_URL`: Supabase project URL used by the server-side Auth user lookup.
- `SUPABASE_PUBLISHABLE_KEY` (or legacy `SUPABASE_ANON_KEY`): public project key.
  Never set a service-role key here or expose one to the mobile application.
- `API_CORS_ORIGINS`: comma-separated exact browser origins permitted by CORS.
  Native Android requests without an Origin header remain supported.
- `API_RATE_LIMIT_WINDOW_MS`: fixed-window duration in milliseconds (default 60000).
- `API_RATE_LIMIT_MAX`: requests per client IP and window (default 120).
- `API_AUTH_RATE_LIMIT_WINDOW_MS`: authenticated-user window in milliseconds (default 60000).
- `API_AUTH_RATE_LIMIT_MAX`: authenticated requests per user and window (default 60).
- `API_TRUST_PROXY_HOPS`: number of trusted reverse-proxy hops (default 0).
  Set this only to the verified proxy topology; incorrect values can undermine IP-based
  rate limiting and source attribution.
- `NODE_ENV=production`: enables the HSTS response header.

## Authentication contract

Health checks remain public at `/api/healthz`. New business endpoints must be
mounted under `/api/v1`; the router applies `requireSupabaseAuth` to that namespace.
The middleware validates bearer tokens by calling Supabase Auth's `/auth/v1/user`
endpoint and places only the verified user ID in `res.locals.authUser`.

The API currently has no business routes, so this guard establishes the default
boundary for future versioned routes; it does not create business functionality.

## Monitoring and operational limits

Security events are emitted as structured Pino records. Source IPs are represented
by a truncated SHA-256 digest; tokens, cookies, request bodies, and query strings
are not included in security-event records.

Both rate limiters are in-memory and per server process. The IP limiter applies to all `/api` traffic (except health checks); the authenticated-user limiter applies after token verification to `/api/v1`. These controls are suitable as initial single-instance safeguards, not as distributed limits across multiple replicas. A multi-instance deployment needs an upstream shared limiter or a shared store.
No external SIEM or alert-delivery integration is configured by this change.
