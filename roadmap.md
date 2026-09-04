# Roadmap — production hardening (no publish, no destructive data ops)

1. [x] Remove MCP attack surface (routes, well-known, tools, manifest) → 404
2. [x] Server-authoritative forced password completion (`profiles.must_change_password`)
       — BEFORE UPDATE trigger rejects any change from a non-service role; verified by SQL
3. [x] Append-only metadata-only `audit_log` — no client INSERT policy or grant; all writes
       go through `recordAuditEvent` (authenticated server fn, actor from the verified session)
4. [x] Kiosk hardening: throttling/lockout, token expiry + rotation, generic errors
5. [x] Disable demo mode in production; no fixture data on clinical routes
6. [x] Tighten authz: profiles RLS scoped, SECURITY DEFINER grants, Model Lab admin-only
       (server + UI), server-side identifier scan, 15-min inactivity sign-out
7. [x] Least-privilege grants: `anon` has none; `authenticated` holds only the exact DML
       each surface needs; TRUNCATE/TRIGGER/REFERENCES/MAINTAIN revoked everywhere;
       `rate_limits` server-only; default privileges revoked for future tables
8. [x] Rate-limit identity: only the hosting edge header (`cf-connecting-ip`) is trusted;
       spoofed `X-Forwarded-For`/`X-Real-IP` ignored, missing header fails closed (503)
9. [x] Release hygiene: /device noindex, zero lint errors, CI workflow (lint, typecheck,
       tests, production build, dependency audit)

## Accepted residual scanner findings

- `rate_limits` has RLS enabled with no policy — deliberate deny-all; only server code
  (service role) reaches it through the SECURITY DEFINER rate-limit functions.
- `has_role`, `shares_facility` remain executable by signed-in users: RLS policies call
  them as the invoking role, so revoking EXECUTE would break every scoped read.
- `respond_to_encounter_request` is client-callable by design and authorizes internally
  (facility membership or admin, plus valid state transition).
- 7 lint warnings, all `react-refresh/only-export-components` in shadcn UI primitives and
  the stethoscope provider — dev-only fast-refresh hints, no runtime effect.
