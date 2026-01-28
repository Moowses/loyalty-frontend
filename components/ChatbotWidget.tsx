"use client";

import { useEffect, useMemo } from "react";

declare global {
  interface Window {
    DT_MEMBER?: {
      isLoggedIn: boolean;
      name?: string;
      email?: string;
      memberNo?: string;
    };
    // Optional: if loader exposes anything later, we won't break TS
    DTChatWidget?: any;
  }
}

type MemberInfo = {
  isLoggedIn: boolean;
  name?: string;
  email?: string;
  memberNo?: string;
};

function ensureLoaderScript() {
  if (typeof window === "undefined") return;

  const id = "dt-chat-widget-loader";
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing) return;

  const s = document.createElement("script");
  s.id = id;
  s.src = "https://chat.dreamtripclub.com/widget/loader.js";
  s.defer = true;
  s.async = true;
  document.body.appendChild(s);
}

export default function ChatbotWidget(props: {
  // Pass user info from your auth state (or dashboard response)
  isLoggedIn: boolean;
  name?: string | null;
  email?: string | null;
  memberNo?: string | null;
}) {
  const member: MemberInfo = useMemo(
    () => ({
      isLoggedIn: !!props.isLoggedIn,
      name: props.name ?? undefined,
      email: props.email ?? undefined,
      memberNo: props.memberNo ?? undefined,
    }),
    [props.isLoggedIn, props.name, props.email, props.memberNo]
  );

  // 1) Set window.DT_MEMBER whenever auth changes
  useEffect(() => {
    window.DT_MEMBER = member;

    // If the new loader exposes a refresh/reload later, we can hook it safely:
    // Example (only if exists):
    // window.DTChatWidget?.setMember?.(member);
    // window.DTChatWidget?.refresh?.();
  }, [member]);

  // 2) Load the widget loader once on mount
  useEffect(() => {
    ensureLoaderScript();
  }, []);

  return null;
}
