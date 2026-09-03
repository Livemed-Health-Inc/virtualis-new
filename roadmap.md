# Roadmap — production hardening (no publish, no destructive data ops)

1. [ ] Remove MCP attack surface (routes, well-known, tools, manifest) → 404
2. [ ] Server-authoritative forced password completion (`profiles.must_change_password`)
3. [ ] Append-only metadata-only `audit_log`
4. [ ] Kiosk hardening: throttling/lockout, token expiry + rotation, generic errors
5. [ ] Disable demo mode in production; no fixture data on clinical routes
6. [ ] Tighten authz: profiles/facilities RLS, SECURITY DEFINER grants, Model Lab admin-only,
       server-side identifier scan, 15-min inactivity sign-out
7. [ ] Release hygiene: /device noindex, lint zero errors, tests, CI workflow
8. [ ] Final: lint + typecheck + tests + prod build + security scan; report
