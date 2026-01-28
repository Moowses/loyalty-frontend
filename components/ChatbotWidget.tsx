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
  ready?: boolean; // NEW
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

function removeLoaderScript() {
  const s = document.getElementById(SCRIPT_ID);
  if (s) s.remove();
}

function ensureLoaderScript() {
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) return;

  const s = document.createElement("script");
  s.id = SCRIPT_ID;
  s.src = LOADER_SRC;
  s.defer = true;
  s.async = true;
  document.body.appendChild(s);
}

export default function ChatbotWidget({ member = null, ready = true }: Props) {
  const isLoggedIn = !!member?.membershipNo;

  const dtMember = useMemo(() => {
    if (member?.membershipNo) {
      return {
        isLoggedIn: true,
        name: member.name,
        email: member.email,
        memberNo: member.membershipNo,
      };
    }
    return { isLoggedIn: false as const };
  }, [member?.membershipNo, member?.name, member?.email]);

  // Always keep global up to date
  useEffect(() => {
    window.DT_MEMBER = dtMember;
  }, [dtMember]);

  // Load widget only after auth check is done
  useEffect(() => {
    if (!ready) return;

    // Set DT_MEMBER first (again, just to be extra safe), then load
    window.DT_MEMBER = dtMember;

    // If script is already there but auth just changed to logged-in,
    // reload it so the widget initializes with the correct identity.
    const scriptAlreadyThere = !!document.getElementById(SCRIPT_ID);
    if (scriptAlreadyThere && isLoggedIn) {
      removeLoaderScript();
      // small delay to avoid race with browser caching
      setTimeout(() => ensureLoaderScript(), 50);
      return;
    }

    ensureLoaderScript();
  }, [ready, isLoggedIn, dtMember]);

  return null;
}
