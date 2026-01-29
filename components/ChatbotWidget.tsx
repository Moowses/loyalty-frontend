"use client";

import { useEffect, useMemo, useRef } from "react";

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
const CHAT_ORIGIN = "https://chat.dreamtripclub.com";

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

function postToChatIframes(message: any) {
  const iframes = Array.from(document.querySelectorAll("iframe")) as HTMLIFrameElement[];
  let sent = 0;

  for (const iframe of iframes) {
    const src = iframe.getAttribute("src") || "";
    if (!src.includes("chat.dreamtripclub.com")) continue;

    try {
      iframe.contentWindow?.postMessage(message, CHAT_ORIGIN);
      sent++;
    } catch {
      // ignore
    }
  }

  if (sent) console.log(`[Chatbot] postMessage sent to ${sent} chat iframe(s):`, message);
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
          memberId: membershipNo,
          memberNo: membershipNo,
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

  const identityKey = useMemo(() => {
    const loggedIn = dtMember?.isLoggedIn ? "1" : "0";
    const id = String(dtMember?.memberId || dtMember?.memberNo || dtMember?.membershipNo || "");
    const email = String(dtMember?.email || "");
    return `${loggedIn}:${id.trim()}:${email.trim()}`;
  }, [dtMember]);

  const lastIdentityKeyRef = useRef<string>("");

  useEffect(() => {
    window.DT_MEMBER = dtMember;

    const prevKey = lastIdentityKeyRef.current;
    const changed = !!prevKey && prevKey !== identityKey;

    ensureLoaderScript();

    if (changed) {
      if (dtMember?.isLoggedIn) {
        postToChatIframes({ type: "DTC_MEMBER", payload: dtMember });
        postToChatIframes({ type: "DTC_IDENTITY_CHANGED" });
      } else {
        postToChatIframes({ type: "DTC_MEMBER", payload: dtMember });
        postToChatIframes({ type: "DTC_LOGOUT" });
      }
    }

    lastIdentityKeyRef.current = identityKey;
  }, [dtMember, identityKey]);

  return null;
}
