# Roadmap — production hardening (no publish, no destructive data ops)

1. [x] Remove MCP attack surface (routes, well-known, tools, manifest) → 404
2. [x] Server-authoritative forced password completion (`profiles.must_change_password`)
3. [x] Append-only metadata-only `audit_log`
4. [x] Kiosk hardening: throttling/lockout, token expiry + rotation, generic errors
5. [x] Disable demo mode in production; no fixture data on clinical routes
6. [x] Tighten authz: profiles RLS scoped, SECURITY DEFINER grants, Model Lab admin-only
       (server + UI), server-side identifier scan, 15-min inactivity sign-out
7. [ ] Release hygiene: /device noindex (done), lint zero errors, CI workflow
8. [ ] Final: lint + typecheck + tests + prod build + security scan; report
