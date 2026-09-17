# Plan: Restore the acuity model connection (AWS authorizer 403)

## What's actually wrong (verified this turn)

The roadmap's "AWS model 404" is **already resolved**. Probing the live endpoint
`https://l0cczt4zi3.execute-api.us-east-1.amazonaws.com/model-lab` shows all four
canonical routes now reach the AWS JWT authorizer:

| Request | Result | Meaning |
|---|---|---|
| no token → any route | 401 | authorizer runs, requires a token (good) |
| forged ES256 token | 403 | signature rejected (good) |
| **valid signed-in admin session token** | **403 Forbidden** | **the real blocker** |

The roadmap recorded a real admin session being **accepted** on 2026-09-05; today
the same kind of token is **403**. The authorizer now rejects *every* token.

**Root cause (high confidence, to confirm on AWS):** Supabase signs tokens with an
asymmetric **ES256** key published via JWKS. Live JWKS right now has exactly one key,
`kid = e1a23916-86bc-474d-ba1f-4d8f61bf3cef`. The authorizer was confirmed on 09-05
to be doing **signature verification** (forged→403, real→accepted). A previously-valid
token now failing while forged also fails means the authorizer can no longer verify
*any* token — the classic signature of a **stale/cached JWKS after a Supabase
signing-key rotation**. The authorizer is still trusting a key id Supabase no longer
publishes. (Stable config like `iss`/`aud` can't be the cause — they're unchanged and
it worked 7 days ago.)

The Lovable app code is **correct and needs no change**: `acuity.server.ts` forwards
the signed-in user's Supabase access token, which is exactly what the authorizer
should verify. No AWS keys exist in this app by design.

## Fix (on AWS — you have access; I guide, then verify from here)

### Step 1 — Confirm the stale-JWKS hypothesis on AWS
Inspect the Lambda authorizer (the JWT authorizer on the `/model-lab` API Gateway,
or the FastAPI/Mangum app if verification is done there). Find where it obtains the
Supabase signing key:
- If it caches the JWKS or a single key, check the cached `kid`. Compare to the live
  `kid` `e1a23916-86bc-474d-ba1f-4d8f61bf3cef` from
  `https://ziarngewwxntdchiythj.supabase.co/auth/v1/.well-known/jwks.json`.
- A mismatch confirms a stale key after rotation.

### Step 2 — Make the authorizer refresh JWKS by `kid`
Patch the verification so it never trusts a single cached key indefinitely:
- Fetch `https://ziarngewwxntdchiythj.supabase.co/auth/v1/.well-known/jwks.json`.
- Index keys by `kid`. Verify each token's `kid` against the fetched set (ES256).
- Cache the JWKS with a **short TTL** (e.g. 5–15 min) keyed on `kid`, and on an
  unknown `kid`, **refresh once** before rejecting. Do not pin a single key.
- Keep verifying `iss = https://ziarngewwxntdchiythj.supabase.co/auth/v1` and the
  expected `aud` if configured. Do not weaken to "accept any signature."
- If the authorizer is a managed API Gateway JWT authorizer (not custom Lambda),
  re-point it at the Supabase JWKS URL / issuer so it re-resolves keys, and redeploy.

### Step 3 — Redeploy / flush cache and confirm on AWS
After deploying, confirm from AWS or with curl:
- no token → 401, forged → 403, **valid admin session → 200** on `GET /v1/info`.

## Verify end-to-end from the app (I do this once AWS is fixed)

Using a signed-in admin session (dr.siddiqi, who already holds `admin` +
`clinical_reviewer`), exercise the real flow through the app's server functions:
1. `GET /v1/info` — model version, routing policy, use cases.
2. `POST /v1/decisions` with one **synthetic** specialist_consult message — confirm
   the projected contract (`decision_id`, `model_version`, `acuity.level`,
   `route`, reason_codes).
3. `POST /v1/feedback` and `POST /v1/training-intake` — confirm the schema names
   the roadmap listed as "unverifiable from here" now match (a 422 would name any
   mismatch; schemas live in `src/lib/modellab/acuity.schemas.ts`).
4. Open `/model-lab` in the preview signed in — confirm it no longer says
   "Runtime unreachable" and renders a real decision.

All test data stays synthetic; no PHI, no feedback/intake submitted to production
beyond the one synthetic decision unless you ask.

## Update the stale roadmap

`roadmap.md` still claims the model returns 404 and routes are "Runtime unreachable."
After the fix is verified, update that section to: routing/stage resolved, authorizer
fixed to refresh Supabase JWKS by `kid`, and the live flow re-verified with the date.

## Out of scope (no change)
- No app code changes (`acuity.server.ts`, schemas, contract projection are correct).
- No weakening of auth: the app keeps forwarding only the signed-in user's token; no
  AWS keys or static secrets introduced; no public registration or token exposure.
- No model retraining, promotion, or accuracy claims — the deployed model is untouched.
- Nothing published automatically; the live site already has the published frontends.
