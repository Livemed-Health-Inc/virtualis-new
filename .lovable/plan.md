# Admin Console: hospital provisioning, staff onboarding, kiosk deployment

## Where things stand today

- The only admin surface is **Account → Team Access**: an email invite form, admin-gated by `has_role(admin)`. It can set a facility on the invite record, but nothing enforces it afterwards.
- Facility access is decided by `has_facility_access()`, which reads `provider_credentials`. The signup trigger `handle_new_user()` currently grants **every new account credentials at Saint, Edgerton and Mercy**. So today an onsite nurse would see all three hospitals. This is the core gap to close.
- Hospital carts are local demo data (`fleet.data.js`); there is no device table.
- `/device` is an unauthenticated kiosk. It picks a cart from that same demo list and remembers the choice in browser storage. Nothing ties a physical cart to a hospital.

## What we build

### 1. Admin Console (new tab, admins only)

A dedicated **Admin** tab in the signed-in app with three sections. Team Access moves in here as the People section.

```text
Admin
 ├── Facilities   hospitals we've gone live in
 ├── People       invite + manage staff, per facility
 └── Devices      cart registry, enrollment codes / QR, kiosk status
```

Non-admins never see the tab, and every action is re-verified server side.

### 2. Two kinds of user

Invites become explicit about who the person is:

- **Virtual physician** — specialty required, may be granted **multiple** hospitals. This is the only multi-facility class.
- **Onsite hospital staff** — bound to **exactly one** hospital. Staff type covers physicians, APPs and all ancillary roles: RN, RT, SW, case management, pharmacy, tech, unit clerk, admin.

The invite writes real access rows for the chosen hospital(s), and the blanket three-hospital grant in the signup trigger is removed. From then on the existing facility rules do the enforcing: an onsite RN at Edgerton sees Edgerton threads, carts and team only.

Admins can later add/remove a facility for a virtual physician, change staff type, or suspend access.

### 3. Device / cart provisioning

Admin registers each physical cart in **Admin → Devices**: hospital, unit, room or "floating", label, and whether a Mintti stethoscope is attached.

Each registered cart gets a **one-time enrollment token**, shown as both:

- a **QR code** the tech scans on the cart tablet, and
- a **short code** typed into `/device` when the tablet can't scan.

Enrolling stores a long-lived device token on the tablet and permanently binds it to that hospital and unit. Admin sees each cart as *Not enrolled → Enrolled → Last seen*, and can revoke a device (stolen, retired, re-imaged), which invalidates the tablet immediately.

### 4. Kiosk behaviour

- **Provisioned**: kiosk shows its own hospital/unit, real registered carts for that hospital only, and routes consults to on-call specialty as it does now.
- **Unprovisioned**: keeps working exactly as today but is clearly marked **Demo — not provisioned**, with an "Enroll this device" action.

The kiosk stays sign-in free. It never lists clinician names, and it can only ever see its own hospital's data.

## Rollout, in order

1. Admin creates the hospital in Facilities.
2. Admin invites onsite staff for that hospital, and grants virtual physicians access to it.
3. Admin registers each cart, prints/shows the QR + code.
4. Tech opens `/device` on the cart tablet, scans or types the code — the cart is live and locked to that hospital.

## Technical notes

- **Schema**: extend `invites` with `user_class` (virtual/onsite), `staff_type`, `specialty`, and multi-facility support; new `devices` table (facility, unit, room, label, mintti flag, status, last_seen) and `device_enrollments` (hashed token, expiry, consumed_at, revoked_at). All with GRANTs, RLS admin-manage policies, and updated_at triggers.
- **Access**: keep `provider_credentials` + `has_facility_access()` as the single source of truth; the invite flow writes those rows. Remove the seed grants from `handle_new_user()`.
- **Server functions** (`src/lib/admin.functions.ts`), each re-checking `has_role(admin)`: list/create facility, invite user with class + facilities, update/suspend access, register/update/revoke device, mint enrollment token.
- **Kiosk pairing** is a public endpoint under `src/routes/api/public/` that accepts a code, verifies the hashed unenrolled token, marks it consumed and returns a device token. Rate-limited, single-use, expiring; it returns only that cart's hospital/unit, never PHI or user data.
- **UI**: new `src/components/virtualis/admin/` (Console shell, Facilities, People — absorbing `TeamAccess.jsx` — and Devices with the QR/code sheet). `DeviceStation.jsx` gains an enrollment screen and a provisioned/demo banner. Existing inbox, telehealth, auscultation and V-menu workflows are untouched.
- Nothing is published as part of this work.
