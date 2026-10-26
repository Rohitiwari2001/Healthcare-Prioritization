# DOC 2: Firebase Setup Guide

> A step-by-step guide to setting up Firebase for the **Smart Healthcare Appointment and Patient Prioritization System**, written for someone using Firebase for the first time. Follow it in order. At the end you will have one Firebase project that both your local Next.js app and the Vercel deployment use.

| | |
|---|---|
| **Document** | DOC_2_FIREBASE_SETUP |
| **Version** | 0.1 (Draft for review) |
| **Date** | 2026-10-25 |
| **Depends on** | DOC_1 System Architecture |
| **Used by** | DOC_3 Database Schema (rules, indexes, seed data) |

> **Screens change.** Firebase and Vercel update their dashboards often, so button labels may differ slightly from this guide. The concepts and the order of steps stay the same. When in doubt, check the official Firebase documentation.

---

## Table of Contents

1. [What You Will Have at the End](#1-what-you-will-have-at-the-end)
2. [Decisions Used in This Guide](#2-decisions-used-in-this-guide)
3. [Prerequisites](#3-prerequisites)
4. [Step 1: Create the Firebase Project](#4-step-1-create-the-firebase-project)
5. [Step 2: Register the Web App](#5-step-2-register-the-web-app)
6. [Step 3: Enable Authentication](#6-step-3-enable-authentication)
7. [Step 4: Create the Firestore Database](#7-step-4-create-the-firestore-database)
8. [Step 5: Create the Admin SDK Key](#8-step-5-create-the-admin-sdk-key)
9. [Step 6: Project Setup, Environment Files and Helper Code](#9-step-6-project-setup-environment-files-and-helper-code)
10. [Step 7: Firebase CLI, Security Rules and Indexes](#10-step-7-firebase-cli-security-rules-and-indexes)
11. [Step 8: Seed the First Admin](#11-step-8-seed-the-first-admin)
12. [Step 9: Email for Booking Confirmations](#12-step-9-email-for-booking-confirmations)
13. [Step 10: Deploy on Vercel](#13-step-10-deploy-on-vercel)
14. [Verification Checklist](#14-verification-checklist)
15. [Common Beginner Errors](#15-common-beginner-errors)
16. [Security Checklist](#16-security-checklist)
17. [Free Plan Limits and Costs](#17-free-plan-limits-and-costs)
18. [Optional Extras](#18-optional-extras)
19. [Open Items](#19-open-items)
20. [Changelog](#20-changelog)

---

## 1. What You Will Have at the End

- A Firebase project with **Authentication** (email and password) and **Cloud Firestore** switched on.
- Security rules and indexes stored **in your Git repository** and deployed with the Firebase CLI.
- Environment files for your laptop (`.env.local`) and for Vercel.
- A server-only Firebase Admin helper and a browser Firebase helper.
- The **first admin account** created by a seed script (no open path to become admin).
- A working email sender for booking confirmations.
- The app running locally and on Vercel against the **same** Firebase project.

How the pieces connect is explained in DOC_1 (Sections 4 and 12).

---

## 2. Decisions Used in This Guide

| Topic | Decision |
|---|---|
| Firebase plan | **Spark (free)**. No card needed. Cloud Functions and other paid-only features are not used. |
| Firestore location | **Mumbai (`asia-south1`)**. Cannot be changed after creation. |
| Environments | **One shared project** for local and deployed use |
| Email for booking confirmations | **Gmail SMTP with an app password, via Nodemailer** |
| Password reset emails | Sent by Firebase itself (no setup beyond the template) |
| New staff credentials | Temporary password shown once to the admin, forced change on first login |
| Patient email verification | Verification email is sent, but **optional** for the MVP |
| First admin | Created by a **one-time local seed script** |
| Emulators | Not used to run the app; optional for testing rules only |
| Language | TypeScript recommended (open item in DOC_1) |

---

## 3. Prerequisites

| Item | Notes |
|---|---|
| **Google account** | Use a dedicated project account if possible, not your personal one |
| **Node.js (current LTS)** | Check the minimum version required by your Next.js version |
| **Git and a GitHub account** | Vercel deploys from GitHub |
| **Vercel account** | Sign in with GitHub. The free (Hobby) plan is intended for non-commercial use, which fits a college project |
| **VS Code** | Any editor works |
| **A Next.js project** | Created with `npx create-next-app@latest` (App Router). The structure is defined in DOC_5 |

---

## 4. Step 1: Create the Firebase Project

1. Open the Firebase console (`console.firebase.google.com`) and sign in.
2. Click **Create a project** (or **Add project**).
3. **Project name:** for example `smart-healthcare-prioritization`.
4. Firebase shows a **project ID** under the name. Note it: the ID is permanent.
5. **Google Analytics:** switch it **off**. It is not needed.
6. Click **Create project** and wait until it finishes.

> **Tip:** the project ID goes into your environment files as `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and `FIREBASE_ADMIN_PROJECT_ID`.

---

## 5. Step 2: Register the Web App

1. On the project overview page, click the **web icon `</>`** to add a web app.
2. **App nickname:** for example `smart-healthcare-web`.
3. **Do not** tick Firebase Hosting. Hosting is done by Vercel.
4. Click **Register app**.
5. Firebase shows a `firebaseConfig` object. Copy its values. You will place them in `.env.local` in Step 6.

| `firebaseConfig` field | Environment variable |
|---|---|
| `apiKey` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `authDomain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `storageBucket` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (kept for completeness, file storage is not used) |
| `messagingSenderId` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `NEXT_PUBLIC_FIREBASE_APP_ID` |

> **These values are not secrets.** Anyone can see them in the browser. Your data is protected by security rules and server checks, not by hiding this config.

You can view the config again at any time under **Project settings, General, Your apps**.

---

## 6. Step 3: Enable Authentication

1. In the left menu open **Build, Authentication** and click **Get started**.
2. Open the **Sign-in method** tab and enable **Email/Password**. Leave "Email link (passwordless)" off.
3. Open **Settings, Authorized domains**. `localhost` is there by default. You will add your Vercel domain in Step 10.
4. Open **Templates** and review the **Password reset** and **Email address verification** emails. Change the sender name and message wording to match the project (for example "Smart Healthcare Appointment System").
5. If your console offers a **password policy** setting, set a minimum length of at least 8 characters.

What Firebase now handles for you: password storage and hashing, login, token issuing, password reset emails and verification emails.

**How roles work here:** Firebase does not know about "patient" or "doctor". Roles and permissions are stored as **custom claims** set by the server (DOC_1 Section 6, DOC_3 Section 6). A new account without a role claim has **no access**.

---

## 7. Step 4: Create the Firestore Database

1. Open **Build, Firestore Database** and click **Create database**.
2. If asked for an edition, choose the **Standard** edition (the default document database).
3. **Location:** choose **`asia-south1` (Mumbai)**.

   > **Warning:** the location **cannot be changed later**. Mumbai gives the lowest latency from India.
4. **Security rules:** choose **Start in production mode**. This starts with everything locked. Your real rules are deployed in Step 7.
5. Click **Create** and wait for provisioning.

The collections themselves do not need to be created by hand. They appear when the first document is written by the seed script or the app.

---

## 8. Step 5: Create the Admin SDK Key

The **Admin SDK** is used only by server code (route handlers and the seed script). It needs a service-account key.

1. Open **Project settings (gear icon), Service accounts**.
2. Click **Generate new private key** and confirm. A JSON file downloads.
3. Open it. You need three fields:

| JSON field | Environment variable |
|---|---|
| `project_id` | `FIREBASE_ADMIN_PROJECT_ID` |
| `client_email` | `FIREBASE_ADMIN_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_ADMIN_PRIVATE_KEY` |

4. Copy those three values into `.env.local` (Step 6), then **move the JSON file out of your project folder** (or delete it). Never commit it.

> **This key is a master key.** It bypasses all security rules. If it ever leaks (for example pushed to GitHub), delete that key immediately in the service accounts page of Google Cloud and generate a new one.

**Private key formatting:** the key contains line breaks. In `.env.local` write it in one line inside double quotes, with `\n` where the line breaks were. The helper code in Step 6 converts `\n` back into real line breaks. Do the same when pasting into Vercel.

---

## 9. Step 6: Project Setup, Environment Files and Helper Code

### 9.1 Install packages

```bash
npm install firebase firebase-admin server-only zod nodemailer
npm install -D firebase-tools dotenv-cli tsx @types/nodemailer
```

| Package | Purpose |
|---|---|
| `firebase` | Browser SDK (Auth and Firestore) |
| `firebase-admin` | Server SDK for route handlers and seed script |
| `server-only` | Makes the build fail if server code is imported into the browser |
| `zod` | Request validation in route handlers |
| `nodemailer` | Sending confirmation emails |
| `firebase-tools` | Firebase CLI (deploy rules and indexes) |
| `dotenv-cli`, `tsx` | Run the seed script with environment variables |

### 9.2 `.gitignore`

Make sure these lines exist:

```
.env
.env.local
.env.*.local
*-firebase-adminsdk-*.json
serviceAccount*.json
```

### 9.3 `.env.local` (your laptop)

Create `.env.local` in the project root. Commit a copy named `.env.example` with **empty values** so teammates know which variables exist.

```bash
# --- Browser-safe Firebase config (not secret) ---
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# --- Server-only secrets (NEVER prefix with NEXT_PUBLIC_) ---
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# --- Email (Gmail SMTP) ---
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USER=
MAIL_APP_PASSWORD=
MAIL_FROM="Smart Healthcare <your.project.account@gmail.com>"

# --- App ---
APP_BASE_URL=http://localhost:3000

# --- Seed script only (local use, remove after seeding) ---
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

| Rule | Why |
|---|---|
| Only variables starting with `NEXT_PUBLIC_` reach the browser | Everything else stays on the server |
| Restart `npm run dev` after editing `.env.local` | Next.js reads the file at startup |

### 9.4 Browser helper (`src/lib/firebase/client.ts`)

```ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
```

Write each `process.env.NEXT_PUBLIC_...` reference out in full as above. Next.js only replaces variables it can see written exactly like this.

### 9.5 Server helper (`src/lib/firebase/admin.ts`)

```ts
import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
```

The `server-only` import makes the build fail if a client component imports this file. Route handlers that use it must run on the **Node.js runtime**:

```ts
export const runtime = "nodejs";
```

---

## 10. Step 7: Firebase CLI, Security Rules and Indexes

Security rules and indexes live in the repository so changes are reviewed through pull requests (DOC_1 Section 12.3).

```bash
npx firebase login
npx firebase init firestore
```

When asked:

| Question | Answer |
|---|---|
| Use an existing project | Select your project |
| Firestore rules file | `firestore.rules` (default) |
| Firestore indexes file | `firestore.indexes.json` (default) |
| Overwrite existing files | No, if you already copied them from DOC_3 |

This creates `firebase.json`, `firestore.rules` and `firestore.indexes.json`. Replace the contents with the rules and indexes from **DOC_3 Database Schema (Sections 10 and 11)**, then deploy:

```bash
npx firebase deploy --only firestore:rules
npx firebase deploy --only firestore:indexes
```

| Fact | Detail |
|---|---|
| Rules take effect | Within a short time after deploy |
| Indexes | Take minutes to build; the console shows progress under Firestore, Indexes |
| Missing index | The browser console error contains a link that creates the index for you; copy the definition into `firestore.indexes.json` afterwards so it is not lost |
| Test rules | Use the Rules Playground in the console, or the emulator (Section 18) |

> **Never leave test mode rules** (open read and write for everyone) on this project. Production mode in Step 4 prevents that.

---

## 11. Step 8: Seed the First Admin

The first admin cannot be created through the app (the app only lets admins create staff), so a one-time script does it with the Admin SDK.

**What the seed script does** (the field shapes are defined in DOC_3):

1. Creates a Firebase Auth user from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.
2. Sets custom claims: role `admin` and the admin default permissions.
3. Writes the matching `users/{uid}` document with `mustChangePassword = true`.
4. Creates the first scoring configuration (version 1) and the active-config pointer.
5. Creates a few specializations.
6. Optionally loads fictional demo doctors, a receptionist, patients and slots (clearly marked as demo data).
7. Writes an audit entry for the seed.

**Skeleton** (`scripts/seed.ts`; the final version lives in the repository and uses the shared constants from DOC_3):

```ts
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
// import { ROLE_DEFAULTS, DEFAULT_CONFIG } from "../src/lib/constants";

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL!;
  const password = process.env.SEED_ADMIN_PASSWORD!;

  const user = await auth.createUser({ email, password, displayName: "System Admin" });
  // await auth.setCustomUserClaims(user.uid, { role: "admin", perms: ROLE_DEFAULTS.admin, pv: 1 });
  await db.doc(`users/${user.uid}`).set({
    uid: user.uid,
    email,
    role: "admin",
    active: true,
    mustChangePassword: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  // ...config version 1, specializations, optional demo data, audit entry
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
```

**Run it:**

```bash
npx dotenv -e .env.local -- npx tsx scripts/seed.ts
```

| Safety step | Reason |
|---|---|
| Run it once, then **remove** `SEED_ADMIN_PASSWORD` from `.env.local` | The password should not stay on disk |
| Log in and change the password immediately | `mustChangePassword` forces this anyway |
| Make the script refuse to run if an admin already exists | Prevents accidental duplicate or reset |
| Keep all demo data fictional | No real patient data in this project |

---

## 12. Step 9: Email for Booking Confirmations

Booking confirmation and cancellation emails are sent by a route handler using **Nodemailer with Gmail SMTP**. Password reset and verification emails come from Firebase and need no code.

1. Use a **dedicated Gmail account** for the project (not your personal one).
2. Turn on **2-Step Verification** for that Google account.
3. Create an **App password** (Google account, Security, App passwords). Google shows a 16-character password once. Copy it without spaces into `MAIL_APP_PASSWORD`.
4. Set `MAIL_USER` to the Gmail address and `MAIL_FROM` to a display name plus the same address.

Sender helper outline (`src/lib/mail.ts`, server-only):

```ts
import "server-only";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: true, // port 465
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_APP_PASSWORD },
});

export async function sendMail(to: string, subject: string, text: string) {
  await transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
}
```

| Note | Detail |
|---|---|
| Content | Appointment date, time and doctor only. **Never include symptoms or scores** in emails |
| Gmail limits | Personal Gmail accounts have a daily sending limit (roughly a few hundred recipients per day). Enough for a demo |
| Failures | A failed email must not fail the booking; log the error and continue |
| Spam | Firebase reset emails and Gmail emails may land in spam. Tell testers to check it |

---

## 13. Step 10: Deploy on Vercel

1. Push the project to **GitHub** (confirm `.env.local` and the key JSON are **not** in the repository).
2. In Vercel click **Add New, Project**, import the GitHub repository. Vercel detects **Next.js** automatically.
3. Before deploying, open **Environment Variables** and add every variable from `.env.local` **except** the seed variables.

| Variable group | Add to |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Production, Preview, Development |
| `FIREBASE_ADMIN_*` | Production and Preview (server only) |
| `MAIL_*` | Production and Preview |
| `APP_BASE_URL` | Set to your Vercel domain for Production |

4. Click **Deploy**. Note the production URL (for example `https://your-project.vercel.app`).
5. In Firebase, open **Authentication, Settings, Authorized domains**, click **Add domain** and add the Vercel domain (without `https://`).
6. Set `APP_BASE_URL` in Vercel to the production URL and redeploy.

| Fact | Detail |
|---|---|
| `NEXT_PUBLIC_` values are baked in at **build time** | After changing one in Vercel you must **redeploy** |
| Preview deployments get their own random domains | Login will fail there unless that domain is also authorized. Test login on the production URL |
| Every push to the main branch redeploys | Keep `main` demo-ready (see the Git workflow in the master document) |

---

## 14. Verification Checklist

Tick each item before moving on to feature development.

**Firebase**

- [ ] Project created and Firestore location is `asia-south1`
- [ ] Email/Password sign-in is enabled
- [ ] `localhost` and the Vercel domain are in Authorized domains
- [ ] Rules and indexes deployed from the repository (not test mode)

**Local app**

- [ ] `npm run dev` starts without environment errors
- [ ] The seed script ran and the admin appears under Authentication, Users
- [ ] The `users/{uid}` document exists and has `role: "admin"`
- [ ] Admin login works and the app forces a password change
- [ ] A new self-registered test patient can sign up and has the `patient` role claim

**Security**

- [ ] A role-less test account **cannot** read any collection
- [ ] A patient account cannot read another patient's appointment
- [ ] A browser console attempt to write to `appointments` or `configVersions` is **denied**
- [ ] The service-account JSON is not in the repository or in the browser bundle

**Vercel**

- [ ] The deployed site loads and login works on the production URL
- [ ] A user created locally can log in on the deployed site (shared project confirmed)
- [ ] A booking confirmation email arrives

---

## 15. Common Beginner Errors

| Error or symptom | Likely cause | Fix |
|---|---|---|
| `auth/unauthorized-domain` | The domain is not in Authorized domains | Add `localhost` or the Vercel domain |
| `Missing or insufficient permissions` | Rules deny the request, or the user has no role claim | Check the rules, the user's claims and whether the token was refreshed |
| `Failed to parse private key` | Private key line breaks were lost or doubled | Use one line in double quotes with `\n`, and keep the `.replace(/\\n/g, "\n")` |
| Firebase variables are `undefined` in the browser | Missing `NEXT_PUBLIC_` prefix, or dev server not restarted | Fix the name, restart `npm run dev` |
| `The query requires an index` | A composite index is missing | Click the link in the error, then copy the index into `firestore.indexes.json` |
| Role or permission change does not show up | The ID token still carries old claims | Sign out and in, or force a refresh with `getIdToken(true)` (the app does this automatically, DOC_1 Section 6.5) |
| `auth/email-already-in-use` | Account exists | Use login or forgot password |
| Build error: Admin SDK imported in a client component | `admin.ts` used in browser code | Only import it in route handlers and server files |
| Admin SDK error about unsupported runtime | Route handler running on Edge runtime | Add `export const runtime = "nodejs"` |
| Works locally, fails on Vercel | Env vars missing in Vercel, or not redeployed | Add the variables and redeploy |
| Confirmation email not sent | Wrong app password or 2-Step Verification off | Recreate the app password and check `MAIL_USER` |
| Everything shows empty after login | Rules block reads, or the query shape does not match the rules | Compare the query with DOC_3 Section 10 |

---

## 16. Security Checklist

- [ ] `.gitignore` covers `.env*` files and service-account JSON
- [ ] `FIREBASE_ADMIN_*` and `MAIL_*` variables are never prefixed `NEXT_PUBLIC_`
- [ ] The Admin SDK helper imports `server-only`
- [ ] Rules are deny-by-default and reviewed through pull requests
- [ ] Only admins can create doctor, receptionist or admin accounts (enforced in route handlers)
- [ ] The seed password was removed from `.env.local` after seeding
- [ ] The Firebase Console is shared only with team members who need it (use project roles, not a shared login)
- [ ] If a key may have leaked: delete it, create a new one, update `.env.local` and Vercel, redeploy

---

## 17. Free Plan Limits and Costs

On the **Spark** plan nothing is billed. If a free quota is exhausted, the affected operations fail until the quota resets, so watch usage before a demo.

| Area | What to know |
|---|---|
| Firestore | Daily free quotas for reads, writes and deletes, plus a storage allowance. Real-time listeners and security-rule document lookups count as reads. Check current numbers in the Firebase pricing documentation |
| Authentication | Email/password sign-in is within free usage for this project size |
| Paid-only features | Some features (for example Cloud Functions) need the paid Blaze plan. **This project does not use them** |
| Where to watch usage | Firebase console, Firestore, **Usage** tab |
| Vercel Hobby | Limits on function execution time and monthly usage. All operations here are short requests |

**Reducing reads:** keep listeners only on the page that needs them, always filter queries (by doctor and date), and avoid reading whole collections.

---

## 18. Optional Extras

| Extra | When to use it |
|---|---|
| **Firebase Emulator Suite** | To test security rules and handlers without touching the shared project. Not needed to run the app |
| **Second Firebase project for development** | If shared dev and live data becomes a problem. The same environment variable pattern supports it |
| **App Check** | Extra protection against requests from outside your app. Optional hardening |
| **Budget alerts** | Only relevant if you later move to the Blaze plan |

---

## 19. Open Items

| # | Item | Status |
|---|---|---|
| 1 | TypeScript or JavaScript | Recommended TypeScript; confirm in DOC_5 |
| 2 | Gmail account to be used for sending | To be created by the team |
| 3 | Whether to require patient email verification before online booking | Optional for MVP |
| 4 | Final seed demo data volume | Decide with DOC_3 |
| 5 | Vercel project owner and Firebase project owners | Assign in DOC_7 Task Tracker |

---

## 20. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | 2026-10-25 | Team | First draft of the Firebase setup guide for the shared Spark project. |
