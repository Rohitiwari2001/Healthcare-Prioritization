# DOC 5: Frontend Architecture (Next.js + React)

> How the frontend of the **Smart Healthcare Appointment and Patient Prioritization System** is structured: technology choices, routing by role, authentication and permission handling, the Firestore and API data layer, the live prioritized queue, forms, internationalisation, the full page inventory and the folder layout. Visual design (colours, layouts, component looks) is in DOC_6 UI Design.

| | |
|---|---|
| **Document** | DOC_5_FRONTEND_ARCHITECTURE |
| **Version** | 0.1 (Draft for review) |
| **Date** | 2026-10-26 |
| **Depends on** | DOC_1 System Architecture, DOC_3 Database Schema, DOC_4 API Specification |
| **Used by** | DOC_6 UI Design, DOC_7 Task Tracker |

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Technology Choices](#2-technology-choices)
3. [Rendering and Routing Model](#3-rendering-and-routing-model)
4. [Authentication and Session Handling](#4-authentication-and-session-handling)
5. [Permission-Aware UI](#5-permission-aware-ui)
6. [Data Layer](#6-data-layer)
7. [The Live Prioritized Queue](#7-the-live-prioritized-queue)
8. [Patient Status Page](#8-patient-status-page)
9. [Forms and Validation](#9-forms-and-validation)
10. [Internationalisation (English and Hindi)](#10-internationalisation-english-and-hindi)
11. [Page Inventory](#11-page-inventory)
12. [Shared Components and UI States](#12-shared-components-and-ui-states)
13. [Folder Structure and Conventions](#13-folder-structure-and-conventions)
14. [Frontend Security Notes](#14-frontend-security-notes)
15. [Performance and Cost](#15-performance-and-cost)
16. [Testing Approach](#16-testing-approach)
17. [Open Decisions](#17-open-decisions)
18. [Changelog](#18-changelog)

---

## 1. Purpose and Scope

**In scope:** application structure, routing, auth and permission handling in the browser, data fetching, the queue screen logic, forms, i18n, the page list and the folder layout.

**Out of scope:** colours, typography, spacing, wireframes and accessibility styling (DOC_6); endpoint contracts (DOC_4); Firestore shapes and rules (DOC_3).

**Guiding rules**

| Rule | Reason |
|---|---|
| The UI is a **convenience layer, not a security boundary** | Rules and route handlers enforce everything (DOC_1 Section 7) |
| **Permissions drive the menu, roles drive the area** | Admin grants and denies must change what a person sees |
| **One place for each concern**: auth, API calls, Firestore hooks, engine, i18n | Fewer bugs and easier testing |
| **Server decides, client displays** | Scores, times, statuses and roles from the server are never overridden by the client |
| **Mobile-first for patients, desktop-first for staff** | Patients use phones; reception, doctors and admin work on desktops or tablets |

---

## 2. Technology Choices

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router)** with React | Static public pages; dashboards are client components |
| Language | **TypeScript** | Typed permission keys, enums, engine functions and schemas catch mistakes at build time |
| Styling | **Tailwind CSS**, optionally **shadcn/ui** components | Accessible dialogs, tables, menus; copied into the repo (open decision F1) |
| Icons | `lucide-react` | |
| Firebase | `firebase` modular SDK (Auth and Firestore) | Helper in `lib/firebase/client.ts` (DOC_2) |
| Server calls and mutations | **TanStack Query** with an `apiFetch` wrapper | Caching, polling, mutation state |
| Forms | **React Hook Form** with **Zod** resolvers | The same Zod schemas validate on the server |
| i18n | Small custom provider with `en.json` and `hi.json` | Pages are client-rendered, so a library is not needed |
| Charts | **Recharts** | Reports and simulation graphs |
| Dates and time | `Intl.DateTimeFormat` with `timeZone: "Asia/Kolkata"` and a few helpers | No heavy date library |
| Toasts | One toast library or the shadcn toast | |
| Unit and component tests | **Vitest** and Testing Library | |
| End-to-end tests | **Playwright** (critical flows only, if time allows) | |
| Linting and formatting | ESLint (Next.js config) and Prettier | |

---

## 3. Rendering and Routing Model

**Rendering**

| Pages | Rendering |
|---|---|
| Landing, login, register, forgot password | Static or server-rendered shell with client forms |
| Everything behind login (all role areas) | **Client components** using the Firebase SDK and TanStack Query. No private data is rendered on the server |

**Why client-side route protection:** the data is protected where it lives (rules and handlers). Server-side page protection would need Firebase session cookies and would add complexity without making any data safer. The guards exist to give users the right screens and clean redirects.

**Route layout** (real folders, so URLs carry the role prefix):

```
/                         landing and disclaimer
/login  /register  /register/complete  /forgot-password
/change-password          forced first-login password change
/account                  own account settings (all roles)
/patient/...              patient area
/doctor/...               doctor area
/reception/...            receptionist area
/admin/...                admin area
/api/...                  route handlers (DOC_4)
```

| Rule | Detail |
|---|---|
| **Role decides the area** | A `patient` can enter only `/patient/*`, a `doctor` only `/doctor/*`, and so on. Each area layout wraps its pages in `<AreaGate role="...">` |
| **Permission decides the page and the controls** | Inside an area, pages and buttons use `<RequirePermission>` and `<Can>` (Section 5) |
| After login | Redirect to the role's home: `/patient`, `/doctor`, `/reception`, `/admin` |
| Wrong area | Redirect to the user's own home with a short message |
| Not signed in | Redirect to `/login?next=<path>`; after login return to `next` if it is inside the user's area |
| No permission for a page | Show the "Not allowed" page, not a blank screen |
| Unknown route | Custom 404 page |

Shared page components live in `features/*` and are mounted by route files in more than one area. For example the queue overview is used by both `/reception/queue` and `/admin/queue`, and the reports page can appear in `/reception/reports` when an admin grants `reports.view`.

---

## 4. Authentication and Session Handling

### 4.1 Session provider

One `AuthProvider` at the root owns the session. Everything else reads it through `useSession()`.

```ts
type Session =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "noRole"; user: User }               // account exists, no role claim yet
  | {
      status: "ready";
      user: User;
      role: "patient" | "doctor" | "receptionist" | "admin";
      perms: Set<Perm>;                            // effective permissions
      mustChangePassword: boolean;
      patientId: string | null;
    };
```

**How it is built**

1. `onAuthStateChanged` fires; if there is no user the status is `signedOut`.
2. `getIdTokenResult()` gives the claims (`role`, `perms`, `pv`). If there is no `role`, the status is `noRole`.
3. A listener on `users/{uid}` supplies `effectivePerms`, `active`, `mustChangePassword`, `permVersion` and `patientId`. Permissions shown in the UI come from this document (the same source of truth the server uses, DOC_4 Section 3); the token claims are the fallback until the document loads.
4. **Token refresh on access change:** if the document's `permVersion` is greater than the token's `pv`, call `getIdToken(true)` once (guarded against loops) so security rules see the new claims (DOC_1 Section 6.5).
5. **Disabled account:** if `active == false`, sign out and show "Your account has been disabled. Contact the administrator."

### 4.2 Flows

| Flow | Behaviour |
|---|---|
| **Login** | `signInWithEmailAndPassword`. Errors are mapped to one generic message ("Email or password is incorrect") so the form never reveals whether an email exists. A checkbox "Keep me signed in on this device" (default **off**) selects local or session persistence before sign-in, which suits shared reception computers |
| **Patient registration** | (1) `createUserWithEmailAndPassword`; (2) `POST /api/auth/complete-patient-profile` with the profile fields; (3) `getIdToken(true)`; (4) redirect to `/patient`. If step 2 fails, the account exists without a role, so the session is `noRole` and the user is sent to **`/register/complete`** to retry the profile step |
| **Forgot password** | `sendPasswordResetEmail`. Always shows the same "If this email is registered, a reset link has been sent" message |
| **First login of staff** | If `mustChangePassword` is true, every page redirects to `/change-password`. The form calls `POST /api/auth/change-initial-password`, then signs out and asks the user to sign in with the new password. `REAUTH_REQUIRED` sends them back to login |
| **Change password later** | On `/account`: re-authenticate with the current password, then `updatePassword` |
| **Email verification** | A verification email is sent after patient registration. A banner reminds unverified patients; verification is optional in the MVP |
| **Logout** | `signOut`, clear the TanStack Query cache, unsubscribe all listeners, redirect to `/login` |
| **Idle timeout for staff** | Optional auto sign-out after inactivity on reception, doctor and admin areas (open decision F2) |

---

## 5. Permission-Aware UI

```ts
export function useCan(...anyOf: Perm[]): boolean {
  const s = useSession();
  return s.status === "ready" && anyOf.some((p) => s.perms.has(p));
}
```

| Piece | Purpose |
|---|---|
| `useCan("queue.view_all")` | Logic checks inside components |
| `<Can anyOf={[...]}>...</Can>` | Show or hide a button, column or section |
| `<RequirePermission anyOf={[...]}>` | Wraps a whole page; shows "Not allowed" otherwise |
| `<AreaGate role="doctor">` | Role gate used in area layouts |
| `NAV` configuration | Menu items declare the permissions they need |

**Navigation is generated from permissions:**

```ts
const RECEPTION_NAV: NavItem[] = [
  { label: "nav.desk",     href: "/reception",              anyOf: ["appointments.checkin_for_patient"] },
  { label: "nav.patients", href: "/reception/patients",     anyOf: ["patients.search"] },
  { label: "nav.book",     href: "/reception/book",         anyOf: ["appointments.book_for_patient"] },
  { label: "nav.walkIn",   href: "/reception/walk-in",      anyOf: ["appointments.register_walkin"] },
  { label: "nav.queue",    href: "/reception/queue",        anyOf: ["queue.view_all"] },
  { label: "nav.reports",  href: "/reception/reports",      anyOf: ["reports.view"] },        // appears only if granted
  { label: "nav.slots",    href: "/reception/slots",        anyOf: ["slots.manage"] },        // appears only if granted
];
```

An admin who grants `reports.view` to one receptionist makes the Reports item appear for that person only. An admin who denies `appointments.register_walkin` makes the Walk-in item disappear. Action buttons inside pages follow the same rule (for example the **Override** button in the queue needs `priority.override`; the **score breakdown** column needs `queue.view_breakdown`).

**Remember:** hiding something is not protection. If a user opens a URL directly or calls an API by hand, the rules and handlers still decide.

---

## 6. Data Layer

Two channels, with clear rules about which to use:

| Channel | Use for | Tool |
|---|---|---|
| **Firestore (direct)** | Reads protected by rules; live data | Custom hooks with `onSnapshot` or `getDocs` |
| **API (route handlers)** | Every write, and the patient queue-status read | `apiFetch` with TanStack Query |

### 6.1 `apiFetch`

```ts
export async function apiFetch<T>(
  path: string,
  init: Omit<RequestInit, "body"> & { json?: unknown } = {}
): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new ApiError("UNAUTHENTICATED", 401);
  const token = await user.getIdToken();               // refreshed automatically when expired
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
    body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
  });
  if (res.headers.get("X-Permissions-Stale") === "true") void user.getIdToken(true);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.error?.code ?? "INTERNAL_ERROR", res.status, body?.error?.details);
  return body.data as T;
}
```

| Behaviour | Detail |
|---|---|
| Error mapping | `ApiError.code` maps to the translation key `errors.<CODE>` (Section 10) |
| Global reactions | `UNAUTHENTICATED` leads to sign-out and redirect; `ACCOUNT_DISABLED` shows the disabled message and signs out; `PASSWORD_CHANGE_REQUIRED` redirects to `/change-password` |
| Mutations | `useMutation` wrappers, one per endpoint, with typed inputs and outputs. **No automatic retry** for mutations |
| After a mutation | Firestore listeners update the screens by themselves. Show a toast, then navigate or close the dialog |
| Double submit | Buttons disable while a mutation is pending |

### 6.2 Firestore hooks

| Hook | Query (DOC_3 Section 10) | Mode | Used by |
|---|---|---|---|
| `useActiveConfig()` | `meta/activeConfig`, then `configVersions/{n}` | Pointer listener, version cached | Queue pages, symptom form, simulation |
| `useSpecializations()` | `specializations` where `active` | One-time read, cached 10 min | Booking, admin |
| `useDoctors(specId)` | `doctors` where `specializationId`, `active` | One-time read, cached | Booking |
| `useSlots(doctorId, dateKey)` | `slots`, status `AVAILABLE`, order by `startAt` | Listener (so a taken slot disappears) | Slot picker |
| `useMyAppointments()` | `appointments` where `patientUid == uid`, newest first, limit 20 | Listener | Patient pages |
| `useAppointment(id)` | `appointments/{id}` | Listener | Detail pages |
| `useAssessment(id)`, `useConsultation(id)` | `appointments/{id}/clinical/*` | One-time read | Detail and consultation pages |
| `useLiveQueue(doctorUid)` | Today, status `CHECKED_IN` or `IN_PROGRESS` | Listener plus ticker (Section 7) | Doctor queue |
| `useQueueOverview(dateKey, doctorId?)` | Same for all or one doctor | Listener | Reception and admin queue |
| `useBookingsForDate(dateKey)` | `appointments` where `dateKey`, status `BOOKED` | Listener | Reception desk |
| `usePatientSearch(term)` | Phone equality, code equality or `nameLower` prefix | One-time read (debounced) | Reception search |
| `usePatient(id)` | `patients/{id}` | One-time read | Patient detail |
| `useUsers(filters)`, `useUser(uid)` | `users` | One-time read, paginated | Admin |
| `useAuditLog(filters)` | `auditLog` with the right composite index | One-time read, paginated with cursor | Admin |
| `useDoctorStats(range)` | `appointments` where `doctorId`, `dateKey` range | One-time read | Doctor stats, reports |

**Hook rules**

- One generic `useFirestoreQuery` handles subscribe, unsubscribe on unmount, loading and error state.
- Use **listeners only where live updates matter** (queue, slots, own appointments). Reference data and lists use one-time reads with caching to save quota.
- Every list is **paginated** (default 25 per page, cursor based).
- Mapping from Firestore documents to typed objects happens in the hook (timestamps converted to `Date`).

### 6.3 Time handling

| Topic | Rule |
|---|---|
| Display | Always in **Asia/Kolkata**, whatever the device time zone |
| Today's `dateKey` | Computed from the server-corrected "now" in Asia/Kolkata (for example `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" })`) |
| Server clock offset | `useServerNow()` calls `GET /api/health` at sign-in and every 10 minutes, stores `serverTime - Date.now()` and adds it to `Date.now()`. This keeps aging displays correct even if the device clock is wrong |

---

## 7. The Live Prioritized Queue

Used on `/doctor/queue` and the reception and admin queue overview.

```ts
export function useLiveQueue(doctorUid: string) {
  const config = useActiveConfig();
  const now = useServerNow(30_000);                 // re-evaluates every 30 seconds
  const { data: appts } = useQueueListener(doctorUid, todayKey(now));
  return useMemo(
    () => (config.data ? sortQueue(appts, now, config.data.params) : []),
    [appts, now, config.data]
  );
}
```

| Aspect | Design |
|---|---|
| Data | One listener on the doctor's `CHECKED_IN` and `IN_PROGRESS` appointments for today |
| Ordering | Shared engine: `sortQueue` by final score descending, then `tieBreakAt` ascending (DOC_1 Section 8). Aging uses the **server** `checkInTime` and the corrected clock |
| Updates | Re-sorts on every snapshot and every 30 seconds, so aging advances without extra reads |
| Pinned entry | The `IN_PROGRESS` patient is shown first as "Current consultation" |
| Columns | Rank, patient name and age, waiting time, final score with a breakdown popover (only with `queue.view_breakdown`), source badge (`ONLINE`, `RECEPTION`, `WALK_IN`), emergency flag |
| Actions | **Call patient** (start, B6), **Override** (needs `priority.override`, opens a dialog with value and mandatory reason, B8), **Open** (assessment) |
| Emergency | Rows with `emergencyFlag` get a strong red marker and an optional alert (open decision F3) |
| Stability | Rows animate when they move; the list does not re-order while a row menu or dialog is open |
| Sweep | On opening the doctor, reception or admin dashboard, call `POST /api/appointments/sweep` once, then every 5 minutes while open |
| Derived no-show | A shared `displayStatus(appt, now, config)` shows overdue `BOOKED` appointments as `NO_SHOW` before the sweep has saved them |
| Empty and error states | "No patients are waiting" and a retry message if the listener fails |

**Reception and admin overview** uses the same hook without the doctor filter, with a doctor filter dropdown and a per-doctor grouping. Receptionists see status and order; the score columns follow `queue.view_breakdown`.

---

## 8. Patient Status Page

On `/patient/appointments/[id]`:

| Element | Source |
|---|---|
| Status, doctor, date, time | Listener `useAppointment(id)` |
| Position, patients ahead, estimated wait | `useQueueStatus(id)`: TanStack Query on `GET /api/appointments/{id}/queue-status`, **enabled only while the status is `CHECKED_IN` or `IN_PROGRESS`**, `refetchInterval` 30 seconds, paused when the tab is hidden |
| Emergency advisory | Shown from `emergencyFlag` using the translated text (Section 10); the server text is only a fallback |
| Actions | **Check in** (B5, only on the appointment date), **Edit symptoms** (B3, only while `BOOKED`), **Cancel** (B4) |
| Consultation notes and prescription | Shown read-only after `COMPLETED` if the final rules allow it (DOC_3 decision O4) |
| Reassurance text | "Your position can change if more urgent patients arrive" |

The page shows no score numbers and no other patients' information (DOC_1 decision O5).

---

## 9. Forms and Validation

| Rule | Detail |
|---|---|
| Library | React Hook Form with the `zodResolver` |
| Schemas | Shared with the server. Schemas used on both sides live in `src/lib/schemas/` (DOC_4 Section 11 lists server-side schemas under `lib/api/schemas`; the shared ones move here) |
| Client validation | For usability only. The server validates again |
| Errors | Field errors under inputs, announced to screen readers; API `details` are mapped back onto fields |
| Submit | Disabled while pending; a clear success or error message after |

**Forms in the app**

| Area | Forms |
|---|---|
| Public | Login, register, forgot password, change password |
| Patient | Profile edit; **booking flow**; symptom form (shared with reception); cancel dialog |
| Reception | Patient create and edit; link-account dialog (with ID-check note); **book for patient**; walk-in registration |
| Doctor | Override dialog (value and reason); consultation completion (notes, prescription); slot generation; slot block |
| Admin | User create (shows the temporary password once, with a copy button and a warning); **access editor** (role defaults shown, grants and denies as checkbox groups, reason field); reset password; specialization and doctor edit; **scoring configuration editor** (structured fields, live validation of age ranges, diff preview, change note) |

**Symptom form (multi-step wizard)**

1. **What is the problem?** Chief complaint and symptom checklist. Ticking a **red-flag** symptom immediately shows an emergency notice: "These symptoms can be serious. Please go to the nearest emergency department or call your local emergency number now." Booking is **not blocked**.
2. **Details:** severity (mild, moderate, severe), onset (sudden or gradual), duration, "I feel this is urgent".
3. **Review and confirm.**

The red-flag list for the immediate notice comes from the same constants as the engine; the **server result is authoritative** for the stored flag.

**Booking flow** (patient and reception): choose specialization, then doctor, then date, then slot, then symptoms, then confirm. Reception adds an initial step to find or create the patient. A slot that disappears during the flow produces a clear "slot just taken, please choose another" message and returns to the slot step.

**Temporary password display:** kept only in component state, never in URLs, local storage or logs; cleared when the dialog closes.

---

## 10. Internationalisation (English and Hindi)

| Topic | Design |
|---|---|
| Provider | `I18nProvider` and `useT()` returning `t("key", params)` |
| Dictionaries | `src/locales/en.json` and `src/locales/hi.json`, grouped by prefix (`nav.`, `forms.`, `status.`, `errors.`, `queue.`, `emergency.`, `common.`) |
| Language choice | Switcher in the header; saved in local storage; default English |
| Fallback | A missing Hindi key falls back to English and logs a warning in development |
| Parity test | A unit test fails if `en.json` and `hi.json` have different keys |
| API errors | `errors.<CODE>` for every code in DOC_4 Section 6, so users see translated messages |
| Emergency advisory | A translated `emergency.advisory` text shown when `emergencyFlag` is true; the server's English string is only a fallback |
| Data from the database | Specialization names use `nameHi` when the language is Hindi and it exists; doctor names stay as stored |
| Formats | `Intl` with `en-IN` or `hi-IN` for dates and numbers |
| Review | Medical wording in Hindi should be checked by a native speaker, ideally a clinician (open decision F4) |

---

## 11. Page Inventory

Route files are listed per area. **Perm** is the permission that gates the page (any of); **Reads** are direct Firestore hooks; **Calls** are DOC_4 endpoints.

### 11.1 Public and shared

| Route | Page | Perm | Reads | Calls |
|---|---|---|---|---|
| `/` | Landing, disclaimer, login and register links | none | none | none |
| `/login` | Login | none | none | Firebase Auth |
| `/register` | Patient registration | none | none | Firebase Auth, A1 |
| `/register/complete` | Finish registration after a failed profile step | session `noRole` | none | A1 |
| `/forgot-password` | Password reset request | none | none | Firebase Auth |
| `/change-password` | Forced first-login change | `mustChangePassword` | none | A2 |
| `/account` | Own account: language, change password, email and verification status | any role | `users/{uid}` | Firebase Auth |

### 11.2 Patient (`/patient`)

| Route | Page | Perm | Reads | Calls |
|---|---|---|---|---|
| `/patient` | Dashboard: next appointment card, book button, status summary | role patient | `useMyAppointments` | none |
| `/patient/book` | Booking wizard | `appointments.book_self` | Specializations, doctors, slots | B1 |
| `/patient/appointments` | History and upcoming list | role patient | `useMyAppointments` | none |
| `/patient/appointments/[id]` | Detail: status, position and wait, check-in, edit symptoms, cancel | role patient (owner) | `useAppointment`, assessment, consultation | B3, B4, B5, B9 |
| `/patient/profile` | View and edit profile | role patient | `usePatient` | P2 (name edit is direct) |

### 11.3 Doctor (`/doctor`)

| Route | Page | Perm | Reads | Calls |
|---|---|---|---|---|
| `/doctor` | Today overview: counts, next patient, quick links | `queue.view_own` | `useLiveQueue` | B10 |
| `/doctor/queue` | **Live prioritized queue** | `queue.view_own` | `useLiveQueue`, config | B6, B8, B10 |
| `/doctor/consultation/[id]` | Consultation: patient summary, symptom form (read-only), notes and prescription, complete | `consultation.manage` | appointment, assessment | B7 |
| `/doctor/appointments` | Today's appointments (including `BOOKED` and derived no-shows) and history by date | `queue.view_own` | `appointments` by doctor and date | B10 |
| `/doctor/slots` | Own slots: generate, view, block | `slots.manage_own` | `useSlots` | S1, S2 |
| `/doctor/stats` | Own statistics | `reports.view_own` | `useDoctorStats` | none |

### 11.4 Receptionist (`/reception`)

| Route | Page | Perm | Reads | Calls |
|---|---|---|---|---|
| `/reception` | **Desk home:** today's bookings with check-in action, queue snapshot | `appointments.checkin_for_patient` | `useBookingsForDate`, `useQueueOverview` | B5, B10 |
| `/reception/patients` | Patient search (phone, code, name) and create | `patients.search` | `usePatientSearch` | P1 |
| `/reception/patients/[id]` | Profile, appointments, edit, **link account** | `patients.search` | `usePatient`, appointments by patient | P2, P3 |
| `/reception/book` | Book a slot for a patient (find or create patient first) | `appointments.book_for_patient` | Specializations, doctors, slots | P1, B1 |
| `/reception/walk-in` | Register a walk-in with no slot | `appointments.register_walkin` | doctors, patient search | P1, B2 |
| `/reception/queue` | Queue overview, all doctors | `queue.view_all` | `useQueueOverview` | B8 only if `priority.override` is granted |
| `/reception/appointments/[id]` | Check in, edit symptoms, cancel on behalf | `appointments.edit_symptoms_for_patient`, `appointments.cancel_for_patient`, or `appointments.checkin_for_patient` | appointment, assessment | B3, B4, B5 |
| `/reception/reports` | Reports (**only if granted**) | `reports.view` | Reports queries | none |
| `/reception/slots` | Slot management (**only if granted**) | `slots.manage` | `useSlots` | S1, S2 |
| `/reception/doctors` | Doctors list (**only if granted**) | `doctors.manage` | doctors | C3 |

### 11.5 Admin (`/admin`)

| Route | Page | Perm | Reads | Calls |
|---|---|---|---|---|
| `/admin` | Dashboard: today's counts, waiting times, recent audit entries | role admin | Summary queries | B10 |
| `/admin/users` | User list, search and filters (role, active) | `users.manage` | `useUsers` | none |
| `/admin/users/new` | Create doctor, receptionist or admin account | `users.manage` | specializations | U1 |
| `/admin/users/[uid]` | User detail and **access editor** (role defaults, grants, denies, enable or disable, reset password) | `permissions.manage` or `users.manage` | `useUser` | U2, U3 |
| `/admin/doctors` | Doctors list and edit | `doctors.manage` | doctors | C3 |
| `/admin/specializations` | Specializations | `specializations.manage` | specializations | C1, C2 |
| `/admin/slots` | Slots for any doctor | `slots.manage` | `useSlots` | S1, S2 |
| `/admin/patients` | Patient search (shares pages with reception) | `patients.search` | `usePatientSearch` | P1, P2, P3 |
| `/admin/queue` | Queue overview for all doctors | `queue.view_all` | `useQueueOverview` | B8 |
| `/admin/appointments` | Browse by date, status, doctor | `queue.view_all` | `appointments` by date and status | B4, B5 |
| `/admin/reports` | Wait times, volumes, priority distribution, no-shows, overrides; CSV export | `reports.view` | Report queries | none |
| `/admin/config` | Scoring configuration editor and version history, rollback | `config.edit` | `configVersions`, pointer | G1, G2 |
| `/admin/audit` | Audit log with filters | `audit.view` | `useAuditLog` | none |
| `/admin/simulation` | Simulation runner: FCFS compared with priority scheduling, charts, CSV export | `simulation.run` | `useActiveConfig` | none (runs in the browser with the shared engine) |

---

## 12. Shared Components and UI States

| Component | Purpose |
|---|---|
| `AppShell` | Header (language switch, user menu, role badge), side navigation on desktop, bottom navigation for patients on mobile, disclaimer footer |
| `AreaGate`, `RequirePermission`, `Can` | Access gates (Section 5) |
| `DataTable` | Sorting, filtering, pagination, empty state |
| `StatusBadge`, `SourceBadge`, `PriorityBadge` | Status, booking source and priority labels |
| `EmergencyBanner` | Red-flag notice, used in booking and detail pages |
| `QueueTable`, `QueueRow` | Live queue display (Section 7) |
| `ScoreBreakdownPopover` | Component breakdown (needs `queue.view_breakdown`) |
| `SlotPicker`, `DoctorCard` | Booking steps |
| `SymptomWizard` | Multi-step symptom form |
| `ConfirmDialog`, `ReasonDialog` | Confirmations and mandatory-reason entry |
| `SecretOnce` | Shows the temporary password once with copy and a warning |
| `FormField`, `Toast`, `EmptyState`, `Skeleton`, `ErrorBoundary` | Common UI states |
| `DateTime` | Formats timestamps in Asia/Kolkata and the chosen language |
| `DisclaimerBanner` | "Decision-support prototype. Not a diagnostic tool. In an emergency call your local emergency number." (master document Section 24) |

**State rules for every data screen**

| State | Behaviour |
|---|---|
| Loading | Skeleton placeholders, never a blank page |
| Empty | A friendly message and, where useful, the next action |
| Error | A short message with **Retry**; technical details only in the console |
| Offline | A banner when the browser is offline; actions disabled |
| Permission lost while open | The permission listener hides the controls and shows a message |

---

## 13. Folder Structure and Conventions

```
src/
  app/
    (public)/               landing, login, register, forgot-password, register/complete
    change-password/
    account/
    patient/                layout.tsx with AreaGate, pages (Section 11.2)
    doctor/
    reception/
    admin/
    api/                    route handlers (DOC_4 Section 11)
    layout.tsx              providers: I18n, Auth, Query, Toast
    not-found.tsx
  features/
    auth/                   AuthProvider, gates, login and register forms
    booking/                booking wizard, slot picker, symptom wizard
    appointments/           detail views, actions (check-in, cancel, edit symptoms)
    queue/                  queue hooks, QueueTable, override dialog
    patients/               search, profile, link-account
    slots/
    users/                  user list, access editor
    catalogue/              doctors and specializations
    config/                 configuration editor and history
    audit/
    reports/
    simulation/
  components/
    ui/                     shadcn/ui primitives
    shared/                 AppShell, DataTable, badges, banners
  hooks/                    useSession, useCan, useServerNow, useFirestoreQuery
  lib/
    firebase/               client.ts (admin.ts is server-only)
    api/                    apiFetch, ApiError, mutation hooks
    priority-engine/        shared pure functions
    schemas/                shared Zod schemas
    constants/              permission keys, role defaults, enums
    i18n/                   provider and helpers
    time/                   Asia/Kolkata helpers, displayStatus
  locales/                  en.json, hi.json
tests/
  unit/  components/  e2e/
```

| Convention | Rule |
|---|---|
| File names | `kebab-case.ts(x)`; components in `PascalCase` |
| Hooks | Start with `use` and live in `hooks/` or the feature folder |
| Constants | Permission keys, enums and role defaults come from `lib/constants` only; no string literals scattered in pages |
| Imports | Absolute imports with the `@/` alias |
| Route files | Thin: they gate access and mount a feature component |
| Server-only code | Never imported by `features/`; the build fails if attempted (`server-only`, DOC_2) |
| Environment | Only `NEXT_PUBLIC_*` variables are read on the client |
| Commits | Conventional commits as in the master document's Git workflow |

---

## 14. Frontend Security Notes

| Topic | Rule |
|---|---|
| Secrets | None in the client bundle; only the public Firebase config |
| Tokens | Never stored manually; the Firebase SDK manages them. Never put them in URLs or logs |
| Untrusted text | Symptom notes, names and reasons are rendered as escaped text. No `dangerouslySetInnerHTML` |
| Temporary passwords | Only in component state; cleared on close |
| Logout | Clears caches and listeners |
| Console | No patient data or tokens in `console.log` |
| Shared computers | "Keep me signed in" off by default; optional idle sign-out for staff |
| Open redirects | The `next` parameter is accepted only if it is a relative path inside the user's area |
| Disclaimer | Visible on landing, booking and queue-status pages |

---

## 15. Performance and Cost

| Practice | Effect |
|---|---|
| Listeners only on the page that needs them; unsubscribe on unmount | Saves Firestore reads |
| One-time reads with caching (10 minutes) for reference data | Fewer reads and faster pages |
| Pagination everywhere, 25 rows by default | Bounded reads |
| Pause polling and listeners-driven work when the tab is hidden for a long time | Saves quota |
| Local aging tick, no Firestore reads for time changes | Core reason for the design |
| Dynamic import for charts and the simulation | Smaller first load |
| No large images; icons only | Fast mobile load |
| Debounced search input (300 ms) | Fewer queries |

Target (from NFR-03): the doctor's queue shows within 500 ms of data arriving for 200 entries; to be measured.

---

## 16. Testing Approach

| Level | What | Tools |
|---|---|---|
| Unit | Priority engine integration, `displayStatus`, permission helpers, time helpers, **i18n key parity** | Vitest |
| Component | Forms and validation, `<Can>`, gates, `QueueTable` ordering with a fixed `now`, symptom wizard red-flag notice, temporary password display | Vitest and Testing Library |
| Hooks | `useLiveQueue` and `useSession` with mocked Firebase | Vitest |
| End-to-end (critical flows only) | Register and book; reception books an offline patient; check-in and queue order; doctor override; admin creates staff and changes access | Playwright against a test project or the emulator |
| Accessibility | Automated checks on key pages plus keyboard walk-through | axe and manual |
| Devices | Phone, tablet and desktop widths; Chrome and Firefox | Manual checklist |

---

## 17. Open Decisions

| # | Decision | Proposal | Status |
|---|---|---|---|
| F1 | Use shadcn/ui or plain Tailwind components | shadcn/ui for dialogs, tables, menus | Proposed |
| F2 | Idle sign-out for staff | 30 minutes of inactivity on staff areas | Open |
| F3 | Sound or visual alert for a new emergency in the doctor's queue | Visual alert, optional sound | Open |
| F4 | Native-speaker review of Hindi medical wording | Before the final demo | Open |
| F5 | "Keep me signed in" default | Off | Proposed |
| F6 | Default page size | 25 | Proposed |
| F7 | Patient reads own consultation notes | Follows DOC_3 decision O4 | Open |
| F8 | Reception reuse of reports, slots and doctors pages when granted | Reuse shared feature components under `/reception/*` | Proposed |
| F9 | Move shared Zod schemas to `src/lib/schemas` | Yes; update DOC_4 Section 11 | Proposed |

---

## 18. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | 2026-10-26 | Team | First draft of the frontend architecture: routing by role, session and permission handling, data layer, live queue, forms, i18n, page inventory and folder structure. |
