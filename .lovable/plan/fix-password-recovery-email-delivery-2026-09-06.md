# Fix password-recovery email delivery

## Problem
The "Forgot password?" request succeeds (generic confirmation shown), but no reset
email arrives. Findings from read-only checks:
- No email domain is configured for the project, so recovery emails fall back to a
  heavily-limited default sender that is frequently spam-filtered or dropped.
- No delivery events are visible in the last 14 days, so nothing is reaching a
  managed sending pipeline.
- The redirect allow-list for recovery links was previously flagged as an owner
  action and may also be unconfigured.

## Plan
1. Set up an email domain on `virtualischat.com` (the project already owns this
   domain for the live site) via the email setup dialog. User completes a short
   guided step; DNS verification can finish afterward.
2. Create the branded authentication email templates (password recovery, invite,
   sign-in link, etc.) so recovery emails send from the project's own domain
   instead of the default sender.
3. Raise the hourly auth-email allowance from the low default so resets and
   invites are not silently capped.
4. Confirm the sign-in redirect allow-list includes the live and preview site
   addresses so reset links open correctly.
5. Verify: submit one Forgot-password request for the user's own address and
   confirm a delivery event appears.

## User actions needed
- Complete the email domain setup dialog when shown (choose the sender domain).
- If DNS records are requested, add them at the domain's DNS provider (or they may
  be handled automatically if the domain is managed here).

## Out of scope
No changes to sign-in logic, passwords, or any clinical/messaging features.
Nothing is published.
