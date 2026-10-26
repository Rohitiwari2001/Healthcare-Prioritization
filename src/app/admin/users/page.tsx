"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Role } from "@/lib/constants/enums";
import { Plus, Shield, ShieldOff, Search, UserCheck } from "lucide-react";

interface UserItem {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  active: boolean;
  grants: string[];
  denies: string[];
  permVersion: number;
}

export default function UsersListPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(100));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => d.data() as UserItem);
      setUsers(list);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchName = u.displayName?.toLowerCase().includes(q);
      return matchEmail || matchName;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
            User & Access Management
          </h1>
          <p className="text-xs text-ink-600 mt-0.5">
            Manage institutional staff accounts, grant per-user privileges, and enforce access denies.
          </p>
        </div>

        <Link
          href="/admin/users/new"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Staff Account
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-line-300 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-ink-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-line-300 text-xs text-ink-900 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-primary-700"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-ink-600">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-line-300 text-xs text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-700"
          >
            <option value="all">All Roles</option>
            <option value="doctor">Doctors</option>
            <option value="receptionist">Receptionists</option>
            <option value="admin">Administrators</option>
            <option value="patient">Patients</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-surface border border-line-300 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-ink-500">
            Loading user directory...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-500">
            No accounts match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-line-300 text-ink-600 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Custom Grants / Denies</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-300">
                {filtered.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink-900">
                        {u.displayName || "Anonymous User"}
                      </div>
                      <div className="text-[11px] text-ink-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.active ? (
                        <span className="inline-flex items-center text-green-700 font-medium">
                          <Shield className="w-3.5 h-3.5 mr-1" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-700 font-medium">
                          <ShieldOff className="w-3.5 h-3.5 mr-1" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      <span className="text-teal-700 font-medium">
                        +{u.grants?.length || 0} granted
                      </span>
                      {" / "}
                      <span className="text-red-700 font-medium">
                        -{u.denies?.length || 0} denied
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/users/${u.uid}`}
                        className="px-3 py-1 rounded bg-slate-100 hover:bg-primary-50 text-ink-900 hover:text-primary-700 font-medium transition-colors"
                      >
                        Edit Access
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
