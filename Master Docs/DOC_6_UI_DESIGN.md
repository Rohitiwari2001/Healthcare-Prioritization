# DOC 6: UI Design

> Visual and interaction design of the **Smart Healthcare Appointment and Patient Prioritization System**: principles, design tokens, the priority and status system, component specifications, layouts, text wireframes of the key screens, content guidelines, accessibility rules and responsive behaviour. How the screens are built in code is in DOC_5.

| | |
|---|---|
| **Document** | DOC_6_UI_DESIGN |
| **Version** | 0.1 (Draft for review) |
| **Date** | 2026-10-26 |
| **Depends on** | DOC_1 System Architecture, DOC_3 Database Schema, DOC_5 Frontend Architecture |
| **Used by** | DOC_7 Task Tracker |
| **Working product name** | "Smart Healthcare" (placeholder wordmark, to be replaced if the team chooses a name) |

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Users and Contexts](#2-users-and-contexts)
3. [Design Tokens](#3-design-tokens)
4. [Priority and Status System](#4-priority-and-status-system)
5. [Component Specifications](#5-component-specifications)
6. [Layout and Navigation](#6-layout-and-navigation)
7. [Screen Wireframes](#7-screen-wireframes)
8. [State Patterns](#8-state-patterns)
9. [Content and Microcopy](#9-content-and-microcopy)
10. [Accessibility](#10-accessibility)
11. [Responsive Rules and Print](#11-responsive-rules-and-print)
12. [UI Review Checklist](#12-ui-review-checklist)
13. [Open Decisions](#13-open-decisions)
14. [Changelog](#14-changelog)

---

## 1. Design Principles

| # | Principle | In practice |
|---|---|---|
| 1 | **Calm and trustworthy** | Clinical teal and blue, white space, soft corners, no flashy effects |
| 2 | **Urgent information is never hidden** | Emergency notices, red-flag warnings and queue changes are visible without scrolling or hovering |
| 3 | **Plain language** | No jargon for patients; short sentences; explain what happens next |
| 4 | **One main action per screen** | One clearly primary button; secondary actions are visually quieter |
| 5 | **Never rely on colour alone** | Every status, priority and error uses colour, an icon and a text label together |
| 6 | **Show the system's reasoning to the people who need it** | Doctors can open the score breakdown; patients see only position and wait; reasons are mandatory for overrides |
| 7 | **Safe by design** | Destructive and sensitive actions use confirmation and, where required, a reason |
| 8 | **Respect time pressure** | Doctors and reception need dense, scannable screens with keyboard-friendly actions |
| 9 | **Bilingual from the start** | Layouts allow longer Hindi text; fonts support Devanagari |
| 10 | **Consistent** | The same component looks and behaves the same everywhere |

---

## 2. Users and Contexts

| User | Typical device | Situation | Design priority |
|---|---|---|---|
| **Patient** | Phone, sometimes anxious or unwell | Booking, checking in, waiting | Large touch targets, very clear steps, reassurance, simple words |
| **Doctor** | Desktop or tablet in the clinic | Between patients, seconds to decide | Fast scanning of the queue, one-click call, clear emergency marking |
| **Receptionist** | Desktop at a busy desk, shared computer | Queues of people, phone calls, interruptions | Speed, search first, few clicks, safe sign-out |
| **Admin** | Desktop | Careful, infrequent configuration | Clarity, previews, confirmations, audit trail |

---

## 3. Design Tokens

Tokens are defined once (as CSS variables, mapped into the Tailwind theme of the installed version) so a dark mode or a new brand colour can be added later without touching components.

### 3.1 Colour

**Brand and neutral**

| Token | Hex | Use | Contrast note |
|---|---|---|---|
| `--primary-700` | `#0F766E` | Primary buttons, links, active navigation | About 5.5:1 with white text |
| `--primary-800` | `#115E59` | Button hover and pressed | Higher than 7:1 with white |
| `--primary-50` | `#F0FDFA` | Light highlight backgrounds | |
| `--ink-900` | `#0F172A` | Main text | About 17:1 on white |
| `--ink-600` | `#475569` | Secondary text | About 7.5:1 on white |
| `--ink-500` | `#64748B` | Hints and placeholders (**white backgrounds only**) | About 4.8:1 on white; too low on grey, do not use on grey |
| `--line-300` | `#CBD5E1` | Borders and dividers | |
| `--bg-50` | `#F8FAFC` | Page background | |
| `--surface` | `#FFFFFF` | Cards and panels | |

**Semantic**

| Token | Hex (text) | Hex (tint background) | Use |
|---|---|---|---|
| `--success` | `#15803D` | `#DCFCE7` | Success messages |
| `--info` | `#1E40AF` | `#DBEAFE` | Information, "Booked" |
| `--warning` | `#92400E` | `#FEF3C7` | Cautions |
| `--danger` | `#B91C1C` | `#FEE2E2` | Errors, critical |

All pairs of tint background and dark text in this document have a contrast ratio of at least **6:1** (calculated, then to be re-checked with a contrast checker during implementation). Plain text must reach **4.5:1** and interface boundaries and focus rings **3:1**.

### 3.2 Typography

| Item | Choice |
|---|---|
| English | **Inter** (free), with system sans-serif fallback |
| Hindi | **Noto Sans Devanagari** (free), with system fallback |
| Numbers | `font-variant-numeric: tabular-nums` for scores, waits and times so columns do not jitter |

| Style | Size / line height | Weight | Use |
|---|---|---|---|
| Page title | 24 / 32 | 600 | Page headings |
| Section title | 20 / 28 | 600 | Card and section headings |
| Subsection | 18 / 28 | 600 | |
| Body (patient) | 16 / 24 | 400 | All patient pages and forms |
| Body (staff tables) | 14 / 20 | 400 | Dense staff screens |
| Caption | 13 / 18 | 400 | Secondary details only, never essential information |
| Button | 16 / 24 (patient), 14 / 20 (staff) | 500 | |

Hindi text uses a line height about 20% larger than English to avoid clipped matras (for example 16 / 28 for body). Minimum text size for anything the user must read is 14 px.

### 3.3 Spacing, shape, elevation

| Token | Value |
|---|---|
| Spacing scale | 4, 8, 12, 16, 24, 32, 48 px |
| Corner radius | 8 px (controls), 12 px (cards, dialogs) |
| Elevation | Cards use a 1 px border and a very soft shadow; dialogs a larger soft shadow; no heavy shadows |
| Touch target (patient pages) | At least **44 x 44 px** |
| Click target (staff) | At least 32 px high; spacing prevents mis-clicks on destructive actions |
| Motion | Short (150 to 200 ms), only for feedback and queue reordering; disabled by `prefers-reduced-motion` |

### 3.4 Breakpoints

| Name | Width | Typical layout |
|---|---|---|
| Base | below 640 px | Phone: one column, bottom navigation for patients |
| `sm` | 640 px and up | Large phone: wider cards |
| `md` | 768 px and up | Tablet: collapsible sidebar for staff |
| `lg` | 1024 px and up | Desktop: persistent sidebar, two-panel layouts |
| `xl` | 1280 px and up | Wide desktop: more table columns visible |

### 3.5 Focus

A visible 2 px focus ring in `--primary-700` with a 2 px offset on every interactive element. Never remove the outline without a replacement.

---

## 4. Priority and Status System

Every label shows **icon + text + colour**. The icon names refer to the `lucide-react` set (names may differ slightly between versions).

### 4.1 Severity and priority

| Level | Label (EN / HI draft) | Colours (text on tint) | Icon | Used for |
|---|---|---|---|---|
| Critical | Critical / गंभीर आपात | `#991B1B` on `#FEE2E2`; solid variant white on `#B91C1C` | siren | Red-flag cases (severity forced to Critical) |
| Severe | Severe / गंभीर | `#9A3412` on `#FFEDD5` | triangle-alert | Severe self-reported or computed |
| Moderate | Moderate / मध्यम | `#92400E` on `#FEF3C7` | circle-alert | |
| Mild | Mild / हल्का | `#166534` on `#DCFCE7` | circle-check | |

The doctor's queue shows the **final score** as a number next to the label. Patients never see these labels or numbers (DOC_1 decision O5).

### 4.2 Appointment status

| Status | Display label (EN / HI draft) | Colours | Icon |
|---|---|---|---|
| `BOOKED` | Booked / बुक किया गया | `#1E40AF` on `#DBEAFE` | calendar-check |
| `CHECKED_IN` | Waiting / प्रतीक्षा में | `#115E59` on `#CCFBF1` | clock |
| `IN_PROGRESS` | In consultation / परामर्श जारी | `#3730A3` on `#E0E7FF` | stethoscope |
| `COMPLETED` | Completed / पूर्ण | `#166534` on `#DCFCE7` | circle-check |
| `CANCELLED` | Cancelled / रद्द | `#334155` on `#E2E8F0` | circle-x |
| `NO_SHOW` | No-show / उपस्थित नहीं | `#92400E` on `#FEF3C7` | user-x |

### 4.3 Booking source and flags

| Item | Label | Icon | Style |
|---|---|---|---|
| `ONLINE` | Online | globe | Neutral grey badge |
| `RECEPTION` | Reception | building | Neutral grey badge |
| `WALK_IN` | Walk-in | footprints | Neutral grey badge |
| Emergency flag | Emergency flagged / आपात संकेत | flag | Red tint badge plus a **4 px red left border** on the row |
| Overridden | Priority adjusted | arrow-up-down | Small badge with the adjustment and a tooltip showing the reason |
| Disabled account | Disabled | ban | Dark grey badge |

---

## 5. Component Specifications

| Component | Specification |
|---|---|
| **Primary button** | `--primary-700` fill, white text, 8 px radius; hover `--primary-800`; loading state shows a spinner and the label stays; disabled is clearly greyed and not focusable. Only one per view area |
| **Secondary button** | White fill, `--primary-700` border and text |
| **Destructive button** | `--danger` fill, white text, always followed by a confirmation dialog |
| **Text link** | Underlined, `--primary-700` |
| **Form field** | Visible label above the input (not placeholder-only), optional hint below, error text below in `--danger` with an icon, 44 px minimum height on patient pages. Required fields marked with text "(required)", not only an asterisk |
| **Select, radio, checkbox** | Native-feeling, large labels that are also clickable; checkbox groups for symptoms use a two-column grid on tablets and above |
| **Card** | White, 1 px border, 12 px radius, 16 to 24 px padding; header with title and optional actions |
| **Badge** | Pill with icon and text (Section 4); never colour only |
| **Data table** | Sticky header, sortable columns marked with an icon, row hover, 14 px text, pagination (25 per page), empty state row. On small screens rows turn into cards |
| **Dialog** | Centred, focus trapped, title, short explanation, the action buttons right-aligned (primary last), Escape and close button both close it |
| **Reason dialog** | Dialog with a required text area and a live character counter; the confirm button stays disabled until the reason meets the minimum length |
| **Toast** | Bottom right on desktop, top on mobile; success disappears after 5 seconds, errors stay until dismissed; announced politely to screen readers |
| **Banner** | Full-width strip under the header for offline, verification reminders and the disclaimer |
| **Emergency banner** | Red tint, strong border, siren icon, bold first sentence, always visible (not dismissible) on the page where it appears |
| **Slot picker** | Date chips on top (next 7 days), then a grid of time buttons (44 px high). Unavailable slots are hidden, not greyed. The selected slot gets a filled style plus a check icon |
| **Symptom wizard** | Progress indicator "Step 2 of 3", back and next buttons, answers kept when going back |
| **Queue row** | See Section 7.5 |
| **Score breakdown popover** | Plain table: Severity, Age, Urgency, Base, Aging, Adjustment, Final (Section 7.5) |
| **Secret-once box** | Shows the temporary password in a monospace field with a **Copy** button and the warning "This is shown only once. Copy it now and pass it to the staff member securely." Closing the dialog clears it |
| **Access editor matrix** | Permission groups as collapsible sections; each permission has a three-state control: **Default**, **Granted**, **Denied** (see Section 7.12) |
| **Version history list** | Chronological list with version number, date, author, change note and a **Make active** action |

---

## 6. Layout and Navigation

### 6.1 Patient (phone first)

- **Top bar:** product wordmark, language switch, account menu.
- **Bottom navigation (4 items):** Home, Book, My appointments, Profile.
- Content in one column, maximum width 640 px on larger screens, centred.
- Disclaimer in a small footer on booking and status pages.

### 6.2 Staff (doctor, receptionist, admin)

- **Top bar:** wordmark, global search where relevant (patient search for reception), language switch, user menu with role badge and **Sign out**.
- **Left sidebar** (desktop): menu items generated from permissions (DOC_5 Section 5); collapses to an icon rail on tablet and to a menu button on phones.
- **Main area:** page title, optional action buttons on the right, content.
- A permission the admin has granted adds its menu item; a denied one removes it. Nothing is shown disabled without a reason.

### 6.3 Page frame

```
+--------------------------------------------------------------+
| Top bar                                                      |
+-----------+--------------------------------------------------+
| Sidebar   | Page title                       [Primary action] |
|           | ------------------------------------------------ |
|           | Content                                          |
+-----------+--------------------------------------------------+
| Disclaimer                                                    |
+--------------------------------------------------------------+
```

---

## 7. Screen Wireframes

Text diagrams show structure and priorities, not final visuals.

### 7.1 Login and registration (phone)

```
+--------------------------------+
|  Smart Healthcare       EN|हिं  |
+--------------------------------+
|  Sign in                       |
|                                |
|  Email                         |
|  [____________________________]|
|  Password                      |
|  [____________________________]|
|  [ ] Keep me signed in on this |
|      device                    |
|                                |
|  [        Sign in            ] |
|  Forgot password?              |
|  ----------------------------- |
|  New patient?  Create account  |
|                                |
|  Doctors and staff: your       |
|  account is created by the     |
|  administrator.                |
|                                |
|  Decision-support prototype.   |
|  Not a diagnostic tool.        |
+--------------------------------+
```

Registration is one short form (name, phone, date of birth, gender, email, password) with the password rules visible while typing.

### 7.2 Patient home (phone)

```
+--------------------------------+
|  Hello, Ravi               EN|हिं
+--------------------------------+
|  NEXT APPOINTMENT              |
|  +---------------------------+ |
|  | Dr. Sharma - General Med. | |
|  | Tue 5 Nov, 10:30          | |
|  | [Booked]                  | |
|  | [ View details ]          | |
|  +---------------------------+ |
|                                |
|  [      Book an appointment  ] |
|                                |
|  RECENT                        |
|  Completed - 28 Oct - Dr. Rao  |
|  Cancelled - 12 Oct - Dr. Sen  |
+--------------------------------+
| Home | Book | Appts | Profile  |
+--------------------------------+
```

### 7.3 Booking wizard (phone)

**Step 1: choose doctor and time**

```
+--------------------------------+
|  Book an appointment    1 of 3 |
+--------------------------------+
|  Specialty                     |
|  [ General Medicine         v ]|
|  Doctor                        |
|  ( ) Dr. Sharma  MBBS, MD      |
|  ( ) Dr. Rao     MBBS          |
|                                |
|  Date                          |
|  [Tue 5][Wed 6][Thu 7][Fri 8]  |
|  Time                          |
|  [09:00][09:15][09:30][09:45]  |
|  [10:00][10:15][10:30 v]       |
|                                |
|  [ Back ]        [   Next    ] |
+--------------------------------+
```

**Step 2: symptoms (with red-flag notice)**

```
+--------------------------------+
|  Tell us what is wrong  2 of 3 |
+--------------------------------+
|  Main problem                  |
|  [ Chest pain              v ] |
|  Tick all that apply           |
|  [x] Chest pain or pressure    |
|  [ ] Fever                     |
|  [ ] Cough                     |
|  [ ] Severe bleeding           |
|                                |
|  +---------------------------+ |
|  | (siren) These symptoms    | |
|  | can be serious. Go to the | |
|  | nearest emergency         | |
|  | department or call your   | |
|  | local emergency number    | |
|  | now. You can still book.  | |
|  +---------------------------+ |
|                                |
|  How bad is it?                |
|  ( ) Mild ( ) Moderate (x) Severe
|  Did it start suddenly? [Yes]  |
|  For how long? [ 2 ] hours     |
|  [ ] I feel this is urgent     |
|  [ Back ]        [   Next    ] |
+--------------------------------+
```

**Step 3: review and confirm** shows doctor, date and time, a short summary of the answers with **Edit** links, the disclaimer, and the primary button **Confirm booking**. After confirming, the confirmation screen shows the booking details, the emergency notice again if flagged, and **What happens next** (arrive on the day, check in, track your position).

### 7.4 Patient appointment status (phone)

```
+--------------------------------+
|  < Appointment                 |
+--------------------------------+
|  Dr. Sharma - General Medicine |
|  Tue 5 Nov, 10:30              |
|  [Waiting]                     |
|                                |
|  +---------------------------+ |
|  | YOUR PLACE IN THE QUEUE   | |
|  |   3rd                     | |
|  |   2 patients ahead        | |
|  |   About 30 minutes        | |
|  |   Updated 10:02           | |
|  +---------------------------+ |
|  Your position can change if   |
|  more urgent patients arrive.  |
|                                |
|  [ Cancel appointment ]        |
+--------------------------------+
```

- Before the appointment day: shows details, **Edit symptoms**, **Cancel**.
- On the day while `BOOKED`: a large **Check in** button.
- While `IN_PROGRESS`: "It is your turn. Please go to the consultation room."
- After `COMPLETED`: summary, and notes only if permitted (DOC_3 decision O4).
- The queue card is the only element that updates automatically (every 30 seconds).

### 7.5 Doctor live queue (desktop, the key screen)

```
+----------------------------------------------------------------------------+
| Smart Healthcare        Dr. Sharma (Doctor)         EN|हिं     [Sign out]    |
+------------+---------------------------------------------------------------+
| Overview   | Live queue            Tue 5 Nov 2026         (o) Live  10:02    |
| > Queue    |                                                               |
| Appts      | CURRENT CONSULTATION                                          |
| My slots   | +-----------------------------------------------------------+ |
| Statistics | | (stetho) R. Devi, 72    since 09:48          [ Complete ]  | |
|            | +-----------------------------------------------------------+ |
|            | WAITING (4)                       [ ] Show score breakdown     |
|            | +---+----------------+------+-------+---------+-------------+ |
|            | | # | Patient        | Wait | Score | Source  | Actions     | |
|            | +---+----------------+------+-------+---------+-------------+ |
|            | |#R | A. Khan, 58    | 12m  |  94   | Online  | [Call][...] | |
|            | |   | (flag) EMERGENCY FLAGGED                              | |
|            | | 2 | S. Iyer, 34    | 25m  |  72   | Walk-in | [Call][...] | |
|            | | 3 | M. Das, 8      | 8m   |  68   | Reception [Call][...] | |
|            | | 4 | P. Singh, 45   | 31m  |  55   | Online  | [Call][...] | |
|            | +---+----------------+------+-------+---------+-------------+ |
+------------+---------------------------------------------------------------+
```

| Element | Behaviour |
|---|---|
| Emergency row | Red tint, 4 px red left border, flag badge, shown even if its rank is not first |
| `Call` | Primary small button; starts the consultation (asks for confirmation if the doctor already has someone in progress) |
| `...` menu | Open details, Override priority (only with `priority.override`) |
| Wait | Minutes since check-in, updates every 30 seconds |
| Score | Final score. With the breakdown toggle (needs `queue.view_breakdown`) the row expands |
| Reordering | Rows animate to the new place and a short "moved up" marker appears for 5 seconds; no reordering while a menu or dialog is open |
| Live indicator | "Live" dot turns amber and says "Reconnecting" if the connection drops |

**Score breakdown (expanded row or popover)**

```
Severity  60   Age 15   Urgency 15      Base  90
Aging    +4    Adjustment  0            FINAL 94
Config version 1
```

**Override dialog**

```
+------------------------------------------+
| Adjust priority - A. Khan                |
| Current adjustment: 0                    |
| New adjustment (-50 to +50): [ +20 ]     |
| Reason (required, 10 to 300 characters): |
| [ Patient became breathless in the      ]|
| [ waiting area                          ]|
|                              24 / 300    |
| [ Cancel ]            [ Save adjustment ]|
+------------------------------------------+
```

### 7.6 Doctor consultation (desktop)

```
+------------------------------------------------------------------+
| < Queue    Consultation - A. Khan, 58                [Emergency] |
+--------------------------------+---------------------------------+
| PATIENT-REPORTED SYMPTOMS      | CONSULTATION NOTES              |
| Main problem: Chest pain       | [                              ]|
| Symptoms: chest pain, sweating | [                              ]|
| Severity: Severe  Sudden: Yes  | Prescription (optional)         |
| Duration: 2 hours  Urgent: Yes | [                              ]|
| Notes: "Started after stairs"  |                                 |
| Red flags: Chest pain          | [ Complete consultation ]       |
+--------------------------------+---------------------------------+
```

The symptom panel is read-only. Complete asks for confirmation.

### 7.7 Reception desk home (desktop)

```
+----------------------------------------------------------------------------+
| Smart Healthcare       Reception                    EN|हिं    [Sign out]    |
+------------+---------------------------------------------------------------+
| > Desk     | [ Find patient (phone, code or name)  ____________ ] [Search]  |
| Patients   | [ Book for patient ]  [ Register walk-in ]                     |
| Book       |                                                               |
| Walk-in    | TODAY'S BOOKINGS                      Doctor: [ All        v ]   |
| Queue      | +--------+----------------+-----------+---------+------------+ |
|            | | Time   | Patient        | Doctor    | Status  | Action     | |
|            | | 10:30  | R. Devi        | Dr. Sharma| Booked  | [Check in] | |
|            | | 10:45  | A. Khan        | Dr. Rao   | Booked  | [Check in] | |
|            | | 09:30  | K. Paul        | Dr. Sharma| No-show |            | |
|            | +--------+----------------+-----------+---------+------------+ |
|            | QUEUE SNAPSHOT:  Dr. Sharma 4 waiting | Dr. Rao 2 waiting      |
+------------+---------------------------------------------------------------+
```

The search box is the first thing reached by keyboard. Pressing Enter searches. A phone-number match shows all profiles sharing it with name, date of birth and patient code so the receptionist can choose the right one.

### 7.8 Patient search, create, and book for patient (desktop)

```
+---------------------------------------------------------------+
| Book for patient                                       Step 1 of 4 |
| 1 Patient  >  2 Doctor and slot  >  3 Symptoms  >  4 Confirm      |
+---------------------------------------------------------------+
| Search: [ 98000 00000        ] [Search]                        |
|                                                                |
| P-000123  Ramesh Kumar   M  12 Apr 1958   +91 98000 00000      |
|                                              [ Select ]        |
| P-000140  Rekha Kumar    F  03 Sep 1962   +91 98000 00000      |
|                                              [ Select ]        |
|                                                                |
| Not found?   [ Create new patient profile ]                    |
+---------------------------------------------------------------+
```

Creating a profile opens a short form (name, phone, date of birth, gender) and warns "Possible duplicate" if a similar profile exists. After the booking, a **Print slip** action shows the printable appointment slip (Section 11.2). Steps 2 to 4 reuse the patient booking components.

### 7.9 Walk-in registration (desktop)

```
+---------------------------------------------------------------+
| Register walk-in                                               |
+---------------------------------------------------------------+
| Patient:  Ramesh Kumar (P-000123)               [ Change ]     |
| Doctor:   [ Dr. Sharma - General Medicine     v ]              |
| Symptoms (answer with the patient)                             |
| ...same fields as the symptom form...                          |
| (emergency notice appears here if a red flag is ticked)        |
|                                                                |
| [ Cancel ]                       [ Add to queue now ]          |
+---------------------------------------------------------------+
```

After saving: "Added to Dr. Sharma's queue. Waiting time starts now." with **Print slip**.

### 7.10 Admin user list (desktop)

```
+---------------------------------------------------------------+
| Users                                         [ + Create user ]|
| Search [__________]  Role [All v]  Status [All v]              |
| +--------------------+--------------+----------+--------------+ |
| | Name / email       | Role         | Status   | Access       | |
| | Dr. Demo Sharma    | Doctor       | Active   | Defaults     | |
| | Demo Receptionist  | Receptionist | Active   | +1 grant     | |
| | Old Staff Member   | Receptionist | Disabled | -            | |
| +--------------------+--------------+----------+--------------+ |
+---------------------------------------------------------------+
```

"Access" shows "Defaults", "+N grants", "-N denies" or both, so unusual accounts stand out.

### 7.11 Create user (desktop)

A form with name, email, role (doctor, receptionist, admin), optional doctor details (specialization, qualification, average consultation minutes) and an optional "Adjust access" section (same control as Section 7.12). On success a dialog shows the **secret-once box** with the temporary password.

### 7.12 Admin access editor (desktop)

```
+------------------------------------------------------------------+
| Demo Receptionist  -  Receptionist  [Active]                      |
| [ Reset password ]   [ Disable account ]                          |
+------------------------------------------------------------------+
| ACCESS                                       Default is from role |
|                                                                  |
| v Appointments                                                   |
|   Book slot for patient         ( Default ) ( Grant ) ( Deny )   |
|   Register walk-in              (*Default*) ( Grant ) ( Deny )   |
|   Cancel for patient            (*Default*) ( Grant ) ( Deny )   |
| v Queue                                                          |
|   View all queues               (*Default*) ( Grant ) ( Deny )   |
|   View score breakdown          ( Default ) (*Grant*) ( Deny )   |
| v Reports                                                        |
|   View reports                  ( Default ) (*Grant*) ( Deny )   |
|                                                                  |
| Reason for change (required): [______________________________]  |
| Effective permissions: 14  (was 12)         [ Review and save ]  |
+------------------------------------------------------------------+
```

| Rule | Behaviour |
|---|---|
| Three-state control | **Default** follows the role; **Grant** adds; **Deny** removes. A short legend explains each |
| Marking | Changed rows are highlighted; the summary line says what will change |
| Review step | A confirmation lists "Granted: ... Denied: ... Reason: ..." |
| Own account | The controls are disabled with the message "You cannot change your own access. Ask another admin." |
| Last admin | Disable and demotion are blocked with an explanation |
| After save | Message "The user will see the change within seconds" (the browser refreshes the token automatically) |

### 7.13 Scoring configuration editor (desktop)

```
+------------------------------------------------------------------+
| Scoring configuration     Active: version 3        [ History ]    |
+------------------------------------------------------------------+
| WEIGHTS         w1 [1.0]  w2 [1.0]  w3 [1.0]                      |
| SEVERITY POINTS Mild [10] Moderate [30] Severe [60] Critical [100]|
| AGE POINTS      0 yrs      [25]        1-5   [20]                 |
|                 6-17       [5]         18-59 [0]                  |
|                 60-74      [15]        75+   [25]                 |
|                 (!) Ranges must cover 0 to 150 without gaps       |
| URGENCY         Sudden [10]  Under 24h [5]  Self-urgent [10]      |
| AGING           1 point per [10] minutes, cap [30]                |
| NO-SHOW GRACE   [20] minutes                                      |
|                                                                  |
| Change note (required): [_________________________________]      |
| [ Cancel ]       [ Preview changes ]       [ Save as version 4 ]  |
+------------------------------------------------------------------+
```

The **Preview changes** step shows a before and after table of changed values and a sentence reminding that **aging changes apply to people already waiting**. **History** lists versions with **Make active** (rollback).

### 7.14 Audit log (desktop)

```
+------------------------------------------------------------------+
| Audit log                                                         |
| Actor [All v]  Action [All v]  Date [from] [to]   [ Export CSV ] |
| +-----------+---------------+----------------------+-----------+  |
| | Time      | Actor         | Action               | Details   |  |
| | 10:12     | Dr. Sharma    | Priority override    | 0 -> +20  |  |
| | 09:40     | Admin         | Permission granted   | reports   |  |
| +-----------+---------------+----------------------+-----------+  |
+------------------------------------------------------------------+
```

Entries are read-only. Selecting a row opens a side panel with old and new values and the reason.

### 7.15 Other screens

Reports, the simulation runner, patient profile, slot management, user detail and doctor and specialization lists follow the same page frame, tables, filters and chart cards. Charts use the colour tokens, always have a title, axis labels and a text summary, and never rely on colour alone (patterns or direct labels where several series are shown).

---

## 8. State Patterns

| State | Design |
|---|---|
| **Loading** | Skeleton shapes matching the final layout; no full-page spinners except on first sign-in |
| **Empty list** | Icon, one friendly sentence and the next action. Examples: "No patients are waiting right now." and "You have no appointments yet. [Book an appointment]" |
| **Error with retry** | "We could not load this. Check your connection and try again." with **Retry** |
| **Form error summary** | At the top of a long form: "Please fix 2 problems" with links to the fields |
| **Offline** | Persistent amber banner "You are offline. Changes cannot be saved." Buttons that need the network are disabled |
| **Reconnecting (live data)** | The live indicator changes to "Reconnecting"; stale data is marked "Last updated 10:02" |
| **Not allowed** | Page with a lock icon: "You do not have access to this page. If you think this is a mistake, contact the administrator." and a button to the home page |
| **Account disabled** | Message at login and when it happens during a session: "Your account has been disabled. Please contact the administrator." |
| **Password change required** | The page "Choose a new password" with the rules and nothing else |
| **Session expired** | "Please sign in again" with a return to the same page afterwards |
| **404** | "We could not find that page" with links home |
| **Slot taken** | In booking: inline message "That time was just taken. Please choose another slot." and the slot step is shown again |

---

## 9. Content and Microcopy

### 9.1 Tone

| Do | Avoid |
|---|---|
| Short, calm sentences in the active voice | Jargon, abbreviations, blame ("You entered an invalid value") |
| Say what happened and what to do next | Alarmist language except in the emergency notice |
| Name buttons by their action ("Confirm booking") | "Submit", "OK", "Yes" |
| Reassure about position changes | Promising exact waiting times |

### 9.2 Key texts (English, with Hindi drafts that need native-speaker review)

| Place | English | Hindi (draft) |
|---|---|---|
| Emergency notice | "These symptoms can be serious. Please go to the nearest emergency department or call your local emergency number (112 in India) now. You can still book an appointment." | "ये लक्षण गंभीर हो सकते हैं। कृपया तुरंत नज़दीकी आपातकालीन विभाग जाएँ या अपने स्थानीय आपातकालीन नंबर (भारत में 112) पर कॉल करें। आप फिर भी अपॉइंटमेंट बुक कर सकते हैं।" |
| Disclaimer | "This is a decision-support prototype, not a diagnostic tool. In an emergency, call your local emergency number." | "यह एक निर्णय-सहायता प्रोटोटाइप है, निदान उपकरण नहीं। आपातकाल में अपने स्थानीय आपातकालीन नंबर पर कॉल करें।" |
| Queue note | "Your position can change if more urgent patients arrive." | "अधिक आवश्यक मरीज़ आने पर आपकी स्थिति बदल सकती है।" |
| Check-in success | "You are checked in. Please wait to be called." | "आपका चेक-इन हो गया है। कृपया अपनी बारी की प्रतीक्षा करें।" |
| Temporary password | "This is shown only once. Copy it now and pass it to the staff member securely." | "यह केवल एक बार दिखाया जाएगा। इसे अभी कॉपी करें और कर्मचारी को सुरक्षित रूप से दें।" |

### 9.3 Error messages (by API code, DOC_4 Section 6)

| Code | Message shown |
|---|---|
| `SLOT_UNAVAILABLE` | "That time was just taken. Please choose another slot." |
| `PATIENT_DOUBLE_BOOKED` | "You already have an appointment at this time." |
| `NOT_TODAY` | "You can check in only on the day of your appointment." |
| `INVALID_STATE` | "This appointment can no longer be changed this way. Please refresh." |
| `FORBIDDEN` | "You do not have permission to do this." |
| `ACCOUNT_DISABLED` | "Your account has been disabled. Please contact the administrator." |
| `EMAIL_IN_USE` | "An account with this email already exists." |
| `LAST_ADMIN` | "This would leave the system without an active administrator." |
| `SELF_ACCESS_CHANGE_BLOCKED` | "You cannot change your own access. Ask another administrator." |
| `INTERNAL_ERROR` | "Something went wrong on our side. Please try again in a moment." |

### 9.4 Hindi layout guidance

Allow roughly 30% more width in buttons, table headers and labels; avoid fixed-width labels; do not truncate medical terms; test every screen in both languages; use the Devanagari font only for Hindi text.

---

## 10. Accessibility

Target: **WCAG 2.1 level AA**.

| Area | Requirement |
|---|---|
| Contrast | Text 4.5:1, large text and interface boundaries 3:1; verified in the final palette |
| Not colour alone | Status, priority and errors always include icon and text |
| Keyboard | Everything reachable and usable by keyboard; logical tab order; visible focus (Section 3.5); skip-to-content link |
| Forms | Every input has a programmatic label; hints and errors linked with `aria-describedby`; errors announced; errors never rely on colour |
| Dialogs | Focus trap, focus returns to the trigger on close, Escape closes |
| Live updates | The queue region uses `aria-live="polite"` and announces only meaningful changes (a new emergency entry, "your turn"); it does not announce every re-sort. Updates never move keyboard focus |
| Emergency notice | `role="alert"` so it is announced immediately |
| Tables | Proper header cells and captions; row actions have accessible names that include the patient name |
| Language | The `lang` attribute follows the selected language (`en` or `hi`) |
| Zoom and reflow | Usable at 200% zoom and at 320 px width without horizontal scrolling for patient pages |
| Motion | Respect `prefers-reduced-motion`: no reorder animation, no pulsing |
| Touch | Patient controls at least 44 x 44 px with spacing |
| Timeouts | Staff idle sign-out (if enabled) warns 60 seconds before and can be extended |
| Time and numbers | Wait times written in words as well ("12 minutes"), not only symbols |

---

## 11. Responsive Rules and Print

### 11.1 Responsive

| Screen type | Phone | Tablet | Desktop |
|---|---|---|---|
| Patient pages | Primary design, one column, bottom navigation | Centred column, wider cards | Centred column, top navigation |
| Doctor queue | Condensed cards (patient, wait, flag, Call) | Table with fewer columns | Full table with breakdown toggle |
| Reception pages | Usable, search-first, tables become cards | Collapsible sidebar | Full layout |
| Admin pages | Read-only friendly; forms stack | Sidebar collapses | Full layout |
| Wide tables | Become stacked cards on small screens; no horizontal scrolling of the whole page |
| Dialogs | Full screen on phones, centred on larger screens |

### 11.2 Print and export

| Item | Design |
|---|---|
| **Appointment slip** (proposed) | A print-friendly page for reception: product name, patient name and code, doctor, date and time, "Please check in at the desk on arrival." No symptoms or scores |
| Reports and audit log | CSV export; no special print layout |
| Page printing | A basic print stylesheet hides navigation and buttons |

---

## 12. UI Review Checklist

Before a screen is accepted:

- [ ] Works at 320 px, 768 px and 1280 px widths
- [ ] Works in English and Hindi without clipped or overflowing text
- [ ] Every status, priority and error has an icon and text, not only colour
- [ ] Contrast checked for new colour pairs
- [ ] Fully usable with keyboard only; focus order is logical
- [ ] Loading, empty, error and offline states exist
- [ ] Buttons name their action; destructive actions are confirmed
- [ ] Patients cannot see scores, other patients or staff-only controls
- [ ] Controls for actions the user lacks permission for are hidden, not disabled without explanation
- [ ] The disclaimer is present where required (landing, booking, queue status)
- [ ] No sensitive data in page titles, URLs or console messages

---

## 13. Open Decisions

| # | Decision | Proposal | Status |
|---|---|---|---|
| U1 | Product name and logo | Placeholder text wordmark "Smart Healthcare"; choose a name later | Open |
| U2 | Visual mockups for the viva | Text wireframes now; Figma or generated mockups later if wanted | Open |
| U3 | Dark mode | Not in the MVP; tokens already allow it | Proposed |
| U4 | Printable appointment slip | Include for reception | Proposed |
| U5 | Sound alert for new emergency entries (DOC_5 F3) | Visual alert by default; sound as an option | Open |
| U6 | Hindi wording review | Native speaker or clinician before the final demo (DOC_5 F4) | Open |
| U7 | Emergency number text | "(112 in India)" is shown in the notice; confirm for the deployment context | Proposed |
| U8 | Score visibility for the receptionist | Hidden by default, grantable (DOC_1 O7); the breakdown toggle follows `queue.view_breakdown` | Proposed |
| U9 | Colour palette final check | Verify all pairs with a contrast tool once implemented | Open |

---

## 14. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | 2026-10-26 | Team | First draft of the UI design: principles, tokens, priority and status system, components, layouts, wireframes for the key screens, content guidelines, accessibility and responsive rules. |
