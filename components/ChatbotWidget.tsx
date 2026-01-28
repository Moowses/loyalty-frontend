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

/** Loads loader.js once (unless we explicitly reset it). */
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

/** Removes loader.js so it can re-bootstrap cleanly. */
function removeLoaderScript() {
  const existing = document.getElementById(SCRIPT_ID);
  if (existing) existing.remove();
}

function postToChatIframes(message: any) {
  const iframes = Array.from(document.querySelectorAll("iframe")) as HTMLIFrameElement[];
  let count = 0;

  for (const iframe of iframes) {
    const src = iframe.getAttribute("src") || "";
    // Most widgets use an iframe with chat.dreamtripclub.com
    if (!src.includes("chat.dreamtripclub.com")) continue;

    try {
      iframe.contentWindow?.postMessage(message, CHAT_ORIGIN);
      count++;
    } catch {
      // ignore
    }
  }

  console.log(`[Chatbot] postMessage sent to ${count} chat iframe(s):`, message);
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

  // Track the last identity we bootstrapped the widget with.
  const lastIdentityKeyRef = useRef<string>("");

  const identityKey = useMemo(() => {
    const id =
      String(dtMember?.memberId || dtMember?.memberNo || dtMember?.membershipNo || "").trim();
    const email = String(dtMember?.email || "").trim();
    const loggedIn = dtMember?.isLoggedIn ? "1" : "0";
    return `${loggedIn}:${id}:${email}`;
  }, [dtMember]);

  useEffect(() => {
    console.log("[Chatbot] DT_MEMBER to set:", dtMember);

    // Always keep DT_MEMBER updated for the widget handshake.
    window.DT_MEMBER = dtMember;

    ensureLoaderScript();


    const prevKey = lastIdentityKeyRef.current;
    if (prevKey && prevKey !== identityKey) {
      console.log("[Chatbot] identity changed:", { prevKey, identityKey });

      // 1) Tell widget to logout/reset (if supported on their end)
      postToChatIframes({ type: "DTC_LOGOUT" });
      postToChatIframes({ type: "DTC_RESET_SESSION" });

      // 2) Reload loader.js to re-bootstrap
      removeLoaderScript();
      ensureLoaderScript();
    }

    lastIdentityKeyRef.current = identityKey;
  }, [dtMember, identityKey]);

  return null;
}
