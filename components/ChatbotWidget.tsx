"use client";

import { useEffect, useMemo } from "react";

export type ChatbotMember = {
  // Your app’s “clean” shape (but we’ll still normalize below)
  membershipNo?: string;
  name?: string;
  email?: string;
  tier?: string;
  points?: number | string;

  // In case upstream sends alternate keys
  membershipno?: string;
  memberNo?: string;
  memberId?: string;
  memberID?: string;
};

type Props = {
  member?: ChatbotMember | null;
};

declare global {
  interface Window {
    DT_MEMBER?: any;
  }
}

const LOADER_SRC = "https://chat.dreamtripclub.com/widget/loader.js";
const SCRIPT_ID = "dtc-chat-widget-loader";

function ensureLoaderScript() {
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) return;

  const s = document.createElement("script");
  s.id = SCRIPT_ID;
  s.src = LOADER_SRC;
  s.defer = true;
  s.async = true;

  s.onload = () => console.log("[Chatbot] loader.js loaded");
  s.onerror = () => console.error("[Chatbot] failed to load loader.js");

  document.body.appendChild(s);
}

export default function ChatbotWidget({ member = null }: Props) {
  // Normalize membership number the way Prasanna asked (backward compatible)
  const normalized = useMemo(() => {
    const rawMembership =
      (member as any)?.membershipNo ??
      (member as any)?.membershipno ??
      (member as any)?.memberNo ??
      (member as any)?.memberId ??
      (member as any)?.memberID ??
      "";

    const membershipNo = String(rawMembership || "").trim();
    const hasMember = !!membershipNo;

    const fullName = String((member as any)?.name || "").trim();
    const firstName = fullName.split(" ")[0] || "";
    const email = String((member as any)?.email || "").trim();

    const dtMember = hasMember
      ? {
          isLoggedIn: true,
          firstName,
          name: fullName,
          email,

          // ✅ NEW (preferred)
          memberId: membershipNo,
          // ✅ keep old key
          memberNo: membershipNo,
          // ✅ keep original too
          membershipNo: membershipNo,
        }
      : {
          isLoggedIn: false,
          firstName: "",
          name: "",
          email: "",
          memberId: "",
          memberNo: "",
          membershipNo: "",
        };

    return { membershipNo, hasMember, dtMember };
  }, [member]);

  // Set DT_MEMBER whenever member changes
  useEffect(() => {
    window.DT_MEMBER = normalized.dtMember;
    console.log("[Chatbot] setting DT_MEMBER:", window.DT_MEMBER);
  }, [normalized.dtMember]);

  // Load loader.js ONCE only
  useEffect(() => {
    ensureLoaderScript();
  }, []);

  return null;
}
