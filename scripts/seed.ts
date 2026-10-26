import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as path from "path";
import { DEFAULT_CONFIG_PARAMS } from "../src/lib/priority-engine/default-config";
import { ROLE_DEFAULTS } from "../src/lib/constants/permissions";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin credentials in .env.local");
  console.log("Please populate FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY");
  process.exit(1);
}

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

const auth = getAuth(app);
const db = getFirestore(app);

async function seed() {
  console.log("Starting Firebase database seed...");

  // 1. Config Version 1
  console.log("Creating scoring config version 1...");
  await db.collection("configVersions").doc("1").set({
    version: 1,
    params: DEFAULT_CONFIG_PARAMS,
    changeNote: "Initial configuration version 1 from Master Document",
    createdAt: FieldValue.serverTimestamp(),
    createdByUid: "system",
  });

  // 2. Meta activeConfig pointer
  console.log("Setting meta/activeConfig pointer...");
  await db.collection("meta").doc("activeConfig").set({
    version: 1,
    updatedAt: FieldValue.serverTimestamp(),
    updatedByUid: "system",
  });

  // 3. Meta counters
  console.log("Initializing meta/counters...");
  await db.collection("meta").doc("counters").set({
    patientSeq: 0,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 4. Default Specializations
  console.log("Seeding clinical specializations...");
  const specializations = [
    { id: "gen_med", name: "General Medicine", nameHi: "सामान्य चिकित्सा", active: true },
    { id: "paed", name: "Paediatrics", nameHi: "बाल रोग", active: true },
    { id: "ortho", name: "Orthopaedics", nameHi: "हड्डी रोग", active: true },
    { id: "derm", name: "Dermatology", nameHi: "त्वचा रोग", active: true },
    { id: "ent", name: "ENT", nameHi: "कान, नाक और गला", active: true },
    { id: "gynae", name: "Gynaecology", nameHi: "स्त्री रोग", active: true },
  ];

  for (const spec of specializations) {
    await db.collection("specializations").doc(spec.id).set({
      name: spec.name,
      nameHi: spec.nameHi,
      active: spec.active,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // 5. First Admin User
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin.demo@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "AdminDemo2026!";

  console.log(`Setting up initial administrator account: ${adminEmail}`);

  let adminUid: string;
  try {
    const existing = await auth.getUserByEmail(adminEmail);
    adminUid = existing.uid;
    console.log(`Administrator account already exists (UID: ${adminUid}). Updating claims and document...`);
  } catch {
    const created = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: "System Administrator",
    });
    adminUid = created.uid;
    console.log(`Created new Firebase user for Admin (UID: ${adminUid})`);
  }

  const adminPerms = [...ROLE_DEFAULTS.admin];

  // Set custom claims
  await auth.setCustomUserClaims(adminUid, {
    role: "admin",
    perms: adminPerms,
    pv: 1,
  });

  // Write users/{uid} document
  await db.collection("users").doc(adminUid).set({
    uid: adminUid,
    email: adminEmail,
    displayName: "System Administrator",
    role: "admin",
    grants: [],
    denies: [],
    effectivePerms: adminPerms,
    active: true,
    mustChangePassword: true,
    permVersion: 1,
    patientId: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdByUid: null,
  });

  // 6. Audit Log entry
  await db.collection("auditLog").add({
    timestamp: FieldValue.serverTimestamp(),
    actorUid: "system",
    actorRole: "system",
    action: "SEED_RUN",
    targetType: "CONFIG",
    targetId: "initial_setup",
    appointmentId: null,
    oldValue: null,
    newValue: {
      adminEmail,
      configVersion: 1,
      specializations: specializations.map((s) => s.id),
    },
    reason: "Initial project setup seed execution",
  });

  console.log("Database seed completed successfully!");
}

seed().catch((err) => {
  console.error("Seed execution failed:", err);
  process.exit(1);
});
