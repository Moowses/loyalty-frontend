"use client";

import { useEffect, useMemo } from "react";

export type ChatbotMember = {
  membershipNo: string;
  name: string;
  email: string;
  tier?: string;
  points?: number | string;
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
  s.onerror = () => console.error(" [Chatbot] failed to load loader.js");

  document.body.appendChild(s);
}

export default function ChatbotWidget({ member = null }: Props) {
  const dtMember = useMemo(() => {
    const hasMember = !!member?.membershipNo;

    if (!hasMember) {
      return {
        isLoggedIn: false,
        firstName: "",
        name: "",
        email: "",
        memberId: "",
        memberNo: "",
        membershipNo: "",
      };
    }

    const fullName = String(member?.name ?? "");
    const firstName = fullName.trim().split(" ")[0] || "";
    const membershipNo = String(member.membershipNo);

    return {
      isLoggedIn: true,
      firstName,
      name: fullName,
      email: String(member?.email ?? ""),

      // NEW (preferred)
      memberId: membershipNo,

      // keep old key
      memberNo: membershipNo,

      // Keep original too
      membershipNo: membershipNo,
    };
  }, [member?.membershipNo, member?.name, member?.email]);

  useEffect(() => {
    console.log(" [Chatbot] setting DT_MEMBER:", dtMember);
    window.DT_MEMBER = dtMember;
  }, [dtMember]);

  useEffect(() => {
    // Load ONCE only (no resets)
    ensureLoaderScript();
  }, []);

  return null;
}
