"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPassword() {
  const router = useRouter();
  const search = useSearchParams();
  const email = (search.get("email") || "").toLowerCase();

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const apiBase = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, ""),
    []
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!email) {
      setMsg({ type: "err", text: "Missing email in the link." });
      return;
    }
    if (pw1.length < 8) {
      setMsg({ type: "err", text: "Password must be at least 8 characters." });
      return;
    }
    if (pw1 !== pw2) {
      setMsg({ type: "err", text: "Passwords do not match." });
      return;
    }

    setSubmitting(true);
    try {
      const resp = await fetch(`${apiBase}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, newPassword: pw1 }),
      });
      const j = await resp.json();
      if (!resp.ok) {
        setMsg({ type: "err", text: j?.message || "Reset failed." });
        return;
      }
      setMsg({ type: "ok", text: "Password reset successful. You can log in now." });
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setMsg({ type: "err", text: "Unexpected error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#F4F6F8] flex flex-col">
      {/* Top brand headline */}
      <div className="w-full py-8">
        <h1 className="text-center text-3xl md:text-4xl font-bold text-[#8AA0AA]">
          Welcome to Dream Trip Club Rewards
        </h1>
      </div>

      {/* Centered form card */}
      <div className="flex-1 flex items-start md:items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-[#211F45]">Reset your password</h2>
          <p className="text-sm text-gray-500 mt-1">
            Enter your account email and your new password.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                aria-readonly="true"
                className="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 text-gray-700 px-3 py-2 focus:outline-none cursor-not-allowed"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <input
                type="password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                minLength={8}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#211F45]/20"
                placeholder="At least 8 characters"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                minLength={8}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#211F45]/20"
              />
            </div>

            {/* Status message */}
            {msg && (
              <div
                className={`text-sm rounded-md px-3 py-2 ${
                  msg.type === "ok"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {msg.text}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!email || submitting}
              className="w-full rounded-md bg-[#211F45] text-white font-semibold py-2 hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Reset password"}
            </button>

            {/* Optional back link */}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full mt-2 text-center text-sm text-[#211F45] underline"
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
