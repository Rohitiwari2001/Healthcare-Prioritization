import "server-only";
import { FieldValue, Transaction, WriteBatch } from "firebase-admin/firestore";
import { adminDb } from "../firebase/admin";
import { AuditAction } from "../constants/enums";

export interface CreateAuditEntryParams {
  actorUid: string;
  actorRole: string;
  action: AuditAction;
  targetType: "USER" | "PATIENT" | "APPOINTMENT" | "CONFIG" | "SLOT";
  targetId: string;
  appointmentId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
}

export function buildAuditEntry(params: CreateAuditEntryParams) {
  return {
    timestamp: FieldValue.serverTimestamp(),
    actorUid: params.actorUid,
    actorRole: params.actorRole,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    appointmentId: params.appointmentId || null,
    oldValue: params.oldValue ?? null,
    newValue: params.newValue ?? null,
    reason: params.reason || null,
  };
}

export async function writeAuditLog(params: CreateAuditEntryParams) {
  const entry = buildAuditEntry(params);
  return adminDb.collection("auditLog").add(entry);
}

export function writeAuditLogInTransaction(
  transaction: Transaction,
  params: CreateAuditEntryParams
) {
  const ref = adminDb.collection("auditLog").doc();
  const entry = buildAuditEntry(params);
  transaction.set(ref, entry);
}

export function writeAuditLogInBatch(
  batch: WriteBatch,
  params: CreateAuditEntryParams
) {
  const ref = adminDb.collection("auditLog").doc();
  const entry = buildAuditEntry(params);
  batch.set(ref, entry);
}
