# Smart Healthcare Appointment and Patient Prioritization System
## Step-by-Step Setup, Execution, and Testing Guide

This guide walks you through setting up, running, testing, and demonstrating the complete hospital system from scratch on your local machine.

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Project Location & Files](#2-project-location--files)
3. [Environment Configuration (`.env.local`)](#3-environment-configuration-envlocal)
4. [Step 1: Install Dependencies](#4-step-1-install-dependencies)
5. [Step 2: Database Seeding](#5-step-2-database-seeding)
6. [Step 3: Run the Development Server](#6-step-3-run-the-development-server)
7. [Step 4: Run Automated Tests](#7-step-4-run-automated-tests)
8. [Step 5: Production Build (Verification)](#8-step-5-production-build-verification)
9. [Guided End-to-End Walkthrough of All 4 Roles](#9-guided-end-to-end-walkthrough-of-all-4-roles)
   - [A. Default Admin Account Setup](#a-default-admin-account-setup)
   - [B. Admin Staff Creation & Permission Matrix](#b-admin-staff-creation--permission-matrix)
   - [C. Patient Registration, Intake Assessment & Booking](#c-patient-registration-intake-assessment--booking)
   - [D. Reception Desk Operations & Walk-ins](#d-reception-desk-operations--walk-ins)
   - [E. Doctor Live Queue, Overrides & Consultation](#e-doctor-live-queue-overrides--consultation)
   - [F. Admin Scoring Rules Tuning & Queue Simulator](#f-admin-scoring-rules-tuning--queue-simulator)
10. [Troubleshooting & Common Questions](#10-troubleshooting--common-questions)

---

## 1. Prerequisites

Make sure the following tools are installed on your computer:
- **Node.js**: Version `18.18.0` or higher (Node `20.x` or `22.x` recommended).
  - Verify by opening PowerShell or Command Prompt and running:
    ```bash
    node -v
    npm -v
    ```
- **Web Browser**: Google Chrome, Mozilla Firefox, or Microsoft Edge.
- **Operating System**: Windows, macOS, or Linux.

---

## 2. Project Location & Files

The project is located in:
```
D:\Healthcare
```

Key directories:
- `D:\Healthcare\src`: Next.js 15 App Router source code (React 19, Tailwind CSS).
- `D:\Healthcare\Master Docs`: The 7 architectural and requirement specifications (`DOC_1` to `DOC_7`).
- `D:\Healthcare\tests`: Unit and engine tests for Vitest.
- `D:\Healthcare\scripts`: Firebase seed script (`seed.ts`).

---

## 3. Environment Configuration (`.env.local`)

The application connects to a Cloud Firestore database and Firebase Authentication instance (`asia-south1`, Mumbai).

The `.env.local` file is already created in `D:\Healthcare\.env.local` with the following variables:

```ini
# Firebase Web Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAuiBajVy06VZVD1bufCa28K4noCCU8mP8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=healthcare-prioritization.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=healthcare-prioritization
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=healthcare-prioritization.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=91623132041
NEXT_PUBLIC_FIREBASE_APP_ID=1:91623132041:web:0cf9e97a9f8e36e1d4ef58

# Clinic Local Timezone (Asia/Kolkata)
NEXT_PUBLIC_CLINIC_TIMEZONE=Asia/Kolkata

# Firebase Admin Service Account (for server-side route handlers)
FIREBASE_ADMIN_PROJECT_ID=healthcare-prioritization
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@healthcare-prioritization.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Initial Demo Admin Credentials (used during seed)
SEED_ADMIN_EMAIL=admin.demo@example.com
SEED_ADMIN_PASSWORD=AdminDemo2026!
```

> [!NOTE]
> The private service key credentials originate from `D:\Healthcare\Master Docs\FIREBASE KEY`.

---

## 4. Step 1: Install Dependencies

Open **PowerShell** or your preferred terminal and navigate to the project root:

```powershell
cd D:\Healthcare
npm install
```

This installs all dependencies including Next.js 15, React 19, Tailwind CSS, Firebase Client SDK, Firebase Admin SDK, Recharts, Lucide Icons, and Vitest.

---

## 5. Step 2: Database Seeding

Before running the app for the first time (or to re-populate master data), execute the database seed script:

```powershell
npm run seed
```

### What this script does:
1. Creates the **Initial System Administrator** account in Firebase Auth:
   - **Email:** `admin.demo@example.com`
   - **Password:** `AdminDemo2026!`
   - Sets custom claims: `{ role: "admin", permVersion: 1 }`.
2. Creates the **Active Scoring Configuration** (`configVersions/1` & `meta/activeConfig`) with the mathematical prioritization parameters.
3. Creates **Patient Sequence Counter** (`meta/counters` with `patientSeq = 0`).
4. Creates **6 Clinical Specializations** (General Medicine, Paediatrics, Orthopaedics, Dermatology, ENT, Gynaecology) with bilingual English/Hindi names.
5. Records the initial setup in the immutable `auditLog`.

---

## 6. Step 3: Run the Development Server

Start the local Next.js development server:

```powershell
npm run dev
```

Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

You will see the **Smart Healthcare Priority Portal** landing page featuring the Medical Decision-Support Disclaimer, language selector, and login links.

---

## 7. Step 4: Run Automated Tests

The project includes unit tests covering the priority engine, mathematical worked examples, age band continuous coverage, RBAC claims, and queue simulation:

```powershell
npm test
```

Expected result:
```
✓ tests/unit/i18n-parity.test.ts (1 test)
✓ tests/unit/permissions-claims.test.ts (6 tests)
✓ tests/unit/simulator.test.ts (2 tests)
✓ tests/unit/admin-config.test.ts (5 tests)
✓ tests/unit/priority-engine.test.ts (10 tests)

Test Files  5 passed (5)
     Tests  24 passed (24)
```

---

## 8. Step 5: Production Build (Verification)

To test an optimized production build:

```powershell
npm run build
```

This validates TypeScript types across all 36 pages and 23 API endpoints. To run the production server:

```powershell
npm start
```

---

## 9. Guided End-to-End Walkthrough of All 4 Roles

Here is a recommended script to experience and demonstrate all 4 user roles in action.

### A. Default Admin Account Setup
1. Open [http://localhost:3000/login](http://localhost:3000/login).
2. Enter:
   - **Email:** `admin.demo@example.com`
   - **Password:** `AdminDemo2026!`
3. Click **Sign In**.
4. Since this is the initial login with `mustChangePassword = true`, you will be redirected to `/change-password`:
   - Enter current password: `AdminDemo2026!`
   - Enter new password (e.g. `AdminDemo2026@Pass`).
5. You are now inside the **Admin Dashboard** (`/admin`).

---

### B. Admin Staff Creation & Permission Matrix
1. Go to **Staff & Users** (`/admin/users`) and click **Create User Account** (`/admin/users/new`).
2. Create a **Doctor Account**:
   - **Email:** `dr.sharma@example.com`
   - **Name:** `Dr. Ananya Sharma`
   - **Role:** `doctor`
   - **Specialization:** General Medicine
   - **Qualification:** MBBS, MD
   - **Avg Consult Duration:** 15 mins
3. Click **Create User**.
4. A **Temporary Password Dialog** will appear displaying the auto-generated password (copy this password!).
5. Go to `/admin/slots` to generate consultation slots for Dr. Sharma for today:
   - Click **Generate Slot Schedule**.
   - Select today's date, 09:00 to 17:00, 15-minute slots.
   - Click **Generate Slots**.

---

### C. Patient Registration, Intake Assessment & Booking
1. Open a new Incognito / Private window and go to [http://localhost:3000/register](http://localhost:3000/register).
2. Register a new patient account:
   - **Email:** `rahul.patient@example.com`
   - **Password:** `Patient123!`
   - **Full Name:** `Rahul Verma`
   - **Date of Birth:** `1990-05-15` (Age 36)
   - **Gender:** Male
   - **Phone:** `+919876543210`
3. Click **Register & Link File**.
4. From the Patient Dashboard, click **Book Appointment** (`/patient/book`):
   - **Step 1:** Select **General Medicine**.
   - **Step 2:** Select **Dr. Ananya Sharma**.
   - **Step 3:** Pick today's earliest available slot.
   - **Step 4 (Triage Intake):**
     - Select Chief Complaint (e.g. *Chest Pain* or *Fever*).
     - Select reported symptoms.
     > [!TIP]
     > If you check a red-flag symptom (like `CHEST_PAIN`), an emergency banner will immediately advise emergency care without locking out the patient, and the engine assigns a Critical Base Score ($100$ pts).
     - Select Severity (e.g. *Severe*), Onset (*Sudden*), Duration (*12 hours*).
     - Check *"I feel this is urgent"*.
   - **Step 5:** Confirm and book!
5. In the Patient Appointments page (`/patient/appointments`), click on the new appointment:
   - You will see the **Queue Status Tracker**: shows current position and estimated wait time without exposing other patients' clinical scores.
   - Click **Check In** to signal arrival at the hospital!

---

### D. Reception Desk Operations & Walk-ins
1. Log in as staff (Admin or Receptionist) at [http://localhost:3000/reception](http://localhost:3000/reception).
2. **Desk Home (`/reception`)**:
   - You will see today's arriving patients with quick **Check In** action buttons.
3. **Emergency Walk-in Entry (`/reception/walk-in`)**:
   - For an emergency walk-in without a prior booking slot:
   - Search or register a walk-in patient.
   - Select the consulting doctor.
   - Fill in the rapid triage symptom questionnaire.
   - Click **Check In Walk-in Immediately** -> Patient is instantly scored and placed into the live queue!
4. **Patient Directory (`/reception/patients`)**:
   - Search patient files by phone number (`+919876543210`) or ID (`P-000001`).
   - View profile history and link offline records to online accounts with physical ID verification.

---

### E. Doctor Live Queue, Overrides & Consultation
1. Log in as the doctor (`dr.sharma@example.com`) in your main browser window.
2. Go to **Live Queue** (`/doctor/queue`):
   - You will see the waiting room sorted strictly by:
     $$\text{Final Score} = \text{Base Score} + \text{Aging Bonus} + \text{Manual Adjustment}$$
   - Notice the **30-second aging ticker**: patients waiting longer steadily gain points ($+1\text{ pt per }10\text{ min}$) to eliminate low-acuity starvation!
   - Click the score button on any patient to view the **Score Breakdown Popover** (Severity, Age, Urgency, Aging bonus).
   - Click **Override**: adjust priority by $+20$ points with mandatory clinical reason (e.g. *"Patient visibly distressed with labored breathing"*).
   - Click **Call Patient** -> Transitions appointment to `IN_PROGRESS` and opens the Consultation Chart!
3. **Doctor Consultation Chart (`/doctor/consultation/[id]`)**:
   - Read the patient's self-reported triage intake and symptoms.
   - Record **Doctor Clinical Notes & Diagnosis**.
   - Add prescribed medication in the **Prescription** box.
   - Click **Complete Consultation** -> Finalizes the encounter and frees the doctor for the next waiting patient!

---

### F. Admin Scoring Rules Tuning & Queue Simulator
1. Go to **Scoring Config (`/admin/config`)**:
   - Adjust weights ($w_1, w_2, w_3$), severity points, or dynamic aging divisor/cap.
   - Provide a change note and click **Publish & Activate New Version**.
   - Review past versions and test the one-click **Rollback** mechanism.
2. **Audit Trail (`/admin/audit`)**:
   - Filter by `PRIORITY_OVERRIDE`, `CONFIG_UPDATED`, or `USER_CREATED`.
   - Export the complete audit log to CSV.
3. **Queue Discrete-Event Simulator (`/admin/simulation`)**:
   - Configure total patient arrivals (e.g. $100$ or $200$), consult duration, and aging rules.
   - Click **Run Comparative Simulation**.
   - Compare performance across all 3 models:
     1. **First-Come First-Served (FCFS)**
     2. **Static Priority Only (No Aging)** -> Observe high starvation rate for mild patients!
     3. **Proposed Dynamic Aging** -> Critical wait is minimized while mild starvation is eliminated.
   - Review the bar charts generated by Recharts and export the research data via **Export Simulation CSV**.

---

## 10. Troubleshooting & Common Questions

### 1. Port 3000 is already in use
If another process is using port 3000:
```powershell
npx kill-port 3000
npm run dev
```
Or start Next.js on an alternate port:
```powershell
npm run dev -- -p 3001
```

### 2. "Token Expired" or "Reauth Required"
If a session token expires, simply click **Sign Out** from the top right avatar menu and log in again.

### 3. Missing or Invalid Permissions
Role permissions are evaluated using custom claims and Firestore document rules. If you modify permissions in `/admin/users/[uid]`, the user's browser updates automatically on their next API request via the `X-Permissions-Stale` header.

### 4. Database Clean-up or Re-seed
To reset the demo database to default configurations:
```powershell
npm run seed
```

---

## Need Further Assistance?
Refer to the comprehensive technical documentation in `D:\Healthcare\Master Docs`:
- `DOC_1_SYSTEM_ARCHITECTURE.md`: Security model, roles, and trust boundaries.
- `DOC_3_DATABASE_SCHEMA.md`: Firestore collections, indexes, and rules.
- `DOC_4_API_SPECIFICATION.md`: API endpoints, status codes, and error envelopes.
- `DOC_5_FRONTEND_ARCHITECTURE.md`: Routing structure, permission gates, and hooks.
- `DOC_7_TASK_TRACKER.md`: Project milestones and task breakdown.
