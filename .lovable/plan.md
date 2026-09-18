# Fix the model 403 — Supabase signing-key migration + verify

## Verified current state (no assumptions)

- Model endpoint `https://l0cczt4zi3.execute-api.us-east-1.amazonaws.com/model-lab`:
  - no token → **401 Unauthorized**
  - dr.siddiqi's real admin token → **403 Forbidden** on both `/v1/info` and `/v1/decisions`
- Model is **NOT live**.
- Root cause confirmed by inspecting the live token: the admin access token is **HS256** (shared-secret signature) with **no key id**. Supabase's published JWKS contains only an **ES256** asymmetric key (`e1a23916-86bc-474d-ba1f-4d8f61bf3cef`). The token the app sends and the only published verification key do not match — so the AWS authorizer has no valid key to verify any token.
  - This **revises** the earlier "stale cached JWKS" theory. The mismatch is algorithm-level, not a stale cache.
- The 401/403 bodies are the gateway's own (`{"message":"Unauthorized"}` / `{"message":"Forbidden"}`, no app headers), so rejection happens in the **API Gateway Lambda authorizer**, before FastAPI.
- App code `src/lib/modellab/acuity.server.ts` correctly forwards the signed-in user's token — **no app code change is needed**.

## The fix — one Supabase-side step, then verify

1. **Migrate this Lovable Cloud project's Supabase auth to asymmetric (ES256) JWT signing keys** via `supabase--migrate_signing_keys`.
   - Idempotent; Supabase's recommended modern signing. The JWKS already has a standby ES256 key, so this activates it for token signing.
   - Safe for the running app: the Supabase JS SDK verifies through the Auth service, not by checking JWT signatures in app code, so HS256→ES256 is transparent to the app.
   - Non-disruptive: existing HS256 sessions keep verifying until they expire; new tokens after next sign-in are ES256 with a `kid` matching the JWKS.
   - This is an auth-config change, **not** a code deploy — no build/typecheck/test cycle, and nothing is published.
2. **Re-mint dr.siddiqi's admin session and re-test** `/v1/info` and `/v1/decisions`:
   - **If 200** → the authorizer was JWKS-based; mismatch resolved; model is live. Run the full end-to-end check (info → one synthetic decision → feedback/training-intake schema match) and update `roadmap.md`.
   - **If still 403** → the authorizer is HS256/shared-secret based with a stale secret. The fix then moves to AWS: update the Lambda authorizer to use the current Supabase JWT secret, or switch it to JWKS verification. I'll hand you the exact steps/patch at that point.

## Why this is the safe, preferred path

- It is the one fix I can drive entirely from the Lovable Cloud side without AWS access or the authorizer source (you skipped pasting it).
- It is the Supabase-recommended signing mode and also unblocks MCP OAuth (which requires ES256 ID-token signing).
- Active user sessions are not invalidated; the published app keeps working.

## Out of scope

- No app code changes (`acuity.server.ts` is already correct).
- No AWS changes unless step 2 still shows 403.
- No changes to RLS, other auth behavior, or the published build.

## Exact route after fix

`/model-lab` on virtualischat.com — the "Runtime unreachable" state clears once `/v1/info` returns 200.
