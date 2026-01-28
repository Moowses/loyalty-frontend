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

const LOADER_SRC = "https://chat.dreamtripclub.com/widget/loader.js";
const SCRIPT_ID = "dtc-chat-widget-loader";

function removeExistingWidgetArtifacts() {
  // Remove the loader script (so we can re-run fresh)
  const existing = document.getElementById(SCRIPT_ID);
  if (existing) existing.remove();

  // Remove any iframes injected by the widget (conservative filter)
  document
    .querySelectorAll('iframe[src*="chat.dreamtripclub.com"]')
    .forEach((el) => el.remove());

  // Remove any obvious widget containers the loader might inject
  document
    .querySelectorAll('[id*="dtc"], [class*="dtc"], [data-dtc]')
    .forEach((el) => {
      // Avoid deleting your whole app by being strict:
      // only remove nodes that look widget-related
      const tag = el.tagName.toLowerCase();
      const id = (el as HTMLElement).id?.toLowerCase() ?? "";
      const cls = (el as HTMLElement).className?.toString().toLowerCase() ?? "";
      const isProbablyWidget =
        id.includes("chat") ||
        id.includes("widget") ||
        cls.includes("chat") ||
        cls.includes("widget") ||
        (el as HTMLElement).dataset?.dtc !== undefined;

      if (isProbablyWidget && (tag === "div" || tag === "section")) {
        (el as HTMLElement).remove();
      }
    });
}

function injectLoaderScript() {
  const exists = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (exists) return;

  const s = document.createElement("script");
  s.id = SCRIPT_ID;
  s.src = LOADER_SRC;

  // NOTE: "defer" doesn't really apply to dynamically injected scripts,
  // but harmless to set.
  s.defer = true;

  s.onload = () => console.log(" [Chatbot] loader.js loaded");
  s.onerror = () => console.error(" [Chatbot] loader.js failed to load");

  document.body.appendChild(s);
}

export default function ChatbotWidget({ member = null }: Props) {
  const identityKey = useMemo(() => {
    const isLoggedIn = !!member?.membershipNo;
    const memberNo = member?.membershipNo ? String(member.membershipNo) : "";
    const name = member?.name ? String(member.name) : "";
    const email = member?.email ? String(member.email) : "";
    return JSON.stringify({ isLoggedIn, memberNo, name, email });
  }, [member?.membershipNo, member?.name, member?.email]);

  useEffect(() => {
    console.log(" [Chatbot] component mounted/identity changed");
    console.log(" [Chatbot] member prop:", member);

    // Set DT_MEMBER first 
    (window as any).DT_MEMBER = member?.membershipNo
      ? {
          isLoggedIn: true,
          name: String(member.name),
          email: String(member.email),
          memberNo: String(member.membershipNo),
        }
      : {
          isLoggedIn: false,
          name: "",
          email: "",
          memberNo: "",
        };

    console.log(" [Chatbot] window.DT_MEMBER set to:", (window as any).DT_MEMBER);

    // Hard reset + re-inject loader so it re-reads DT_MEMBER
    console.log(" [Chatbot] resetting widget + reloading loader");
    removeExistingWidgetArtifacts();
    injectLoaderScript();

    // 3) Debug after a short delay
    const t = window.setTimeout(() => {
      console.log("[Chatbot] window.DT_MEMBER after load:", (window as any).DT_MEMBER);
    }, 700);

    return () => window.clearTimeout(t);
  }, [identityKey]);

  return null;
}
