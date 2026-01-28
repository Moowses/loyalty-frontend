"use client";

import { useEffect, useMemo } from "react";

export type ChatbotMember = {
  membershipNo?: string;
  membershipno?: string;
  memberNo?: string;
  memberId?: string;
  memberID?: string;
  name?: string;
  email?: string;
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
  s.onerror = () => console.error("[Chatbot] failed to load loader.js");

  document.body.appendChild(s);
}

function trySetDocumentDomainToRoot() {
  // Only attempt on dreamtripclub.com + subdomains
  const host = window.location.hostname || "";
  if (host === "dreamtripclub.com" || host.endsWith(".dreamtripclub.com")) {
    try {
      document.domain = "dreamtripclub.com";
      console.log("[Chatbot] document.domain set to dreamtripclub.com");
    } catch (e) {
      console.warn("[Chatbot] document.domain set failed (ok on some browsers/policies)", e);
    }
  }
}

export default function ChatbotWidget({ member = null }: Props) {
  const dtMember = useMemo(() => {
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

    return hasMember
      ? {
          isLoggedIn: true,
          firstName,
          name: fullName,
          email,

          // NEW preferred
          memberId: membershipNo,
          // keep old
          memberNo: membershipNo,
          // keep original too
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
  }, [member]);

  useEffect(() => {
    console.log("[Chatbot] DT_MEMBER to set:", dtMember);
    trySetDocumentDomainToRoot();

    window.DT_MEMBER = dtMember;
    console.log("[Chatbot] setting DT_MEMBER:", window.DT_MEMBER);

    ensureLoaderScript();
  }, [dtMember]);

  return null;
}
