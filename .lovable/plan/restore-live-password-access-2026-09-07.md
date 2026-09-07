# Restore live password access

## What is confirmed

- The account for `dr.siddiqi@livemedhealth.com` exists, is confirmed, and previously signed in successfully.
- The most recent recovery email was accepted for sending from the verified Virtualis email domain.
- The prepared `/reset-password` page exists in the current project and the latest preview build is healthy.
- The live `https://virtualischat.com/reset-password` address currently returns **404**. The dedicated recovery repair is therefore not live, so a link targeting that page cannot work in production.

## Plan

1. Re-run the complete release checks: password-link tests, all tests, type checking, lint, production build, auth-negative checks, and facility-isolation checks.
2. Publish the already-prepared recovery repair without unrelated changes.
3. Confirm the live `/reset-password` page loads outside the signed-in app and that an invalid or expired link shows the safe request-new-link screen rather than returning to sign-in.
4. Confirm the live branded email handler still uses `Virtualis Nue <noreply@virtualischat.com>` and the verified Virtualis sending domain.
5. Send exactly one fresh password-recovery email to `dr.siddiqi@livemedhealth.com`, targeting the live reset page, only after steps 1–4 pass.
6. Verify that the mail provider accepted that single message. Do not expose or consume its one-time credential; the user will click it and choose their own password.
7. If the user still cannot complete the link, inspect the resulting auth event and live page state before making any further change or sending another email.

## Security boundaries

- Do not set, reveal, or log a password or recovery credential.
- Keep public registration disabled and preserve account verification.
- Do not expose patient or clinical data, change roles/facility access, or modify unrelated functionality.
- Do not claim full end-to-end success until the user completes the fresh link; provider acceptance and live route behavior can be verified independently.
