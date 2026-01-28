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
    DT_MEMBER?: {
      isLoggedIn: boolean;
      name?: string;
      email?: string;
      memberNo?: string;
    };
  }
}

const SCRIPT_ID = "dtc-chat-widget-loader";
const LOADER_SRC = "https://chat.dreamtripclub.com/widget/loader.js";

function ensureLoaderScript() {
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) return;

  const s = document.createElement("script");
  s.id = SCRIPT_ID;
  s.src = LOADER_SRC;
  s.defer = true;
  s.async = true;

  s.onload = () => console.log("[Chatbot] DTC widget loader loaded");
  s.onerror = () => console.error("[Chatbot] Failed to load DTC widget loader");

  document.body.appendChild(s);
}

export default function ChatbotWidget({ member = null }: Props) {
  const dtMember = useMemo(() => {
    if (member?.membershipNo) {
      return {
        isLoggedIn: true,
        name: member.name,
        email: member.email,
        memberNo: member.membershipNo,
      };
    }

    return {
      isLoggedIn: false,
      name: undefined,
      email: undefined,
      memberNo: undefined,
    };
  }, [member?.membershipNo, member?.name, member?.email]);

  // 1) Update global identity (what the new widget expects)
  useEffect(() => {
    window.DT_MEMBER = dtMember;
    console.log("[Chatbot] window.DT_MEMBER set:", dtMember);
  }, [dtMember]);

  // 2) Load the widget once
  useEffect(() => {
    ensureLoaderScript();
  }, []);

  return null;
}
