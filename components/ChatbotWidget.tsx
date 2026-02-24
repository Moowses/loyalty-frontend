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
    __dtcChatLauncherHidden?: boolean;
    __dtcHideChatAll?: boolean;
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

function resizeChatLauncherForMobile() {
  if (typeof window === "undefined") return;
  const isMobile = window.innerWidth < 768;
  const iframes = Array.from(document.querySelectorAll("iframe")) as HTMLIFrameElement[];
  const hidden = (window as any).__dtcChatLauncherHidden === true;
  const hideAll = (window as any).__dtcHideChatAll === true;
  let launcherRect: DOMRect | null = null;
  let hasChatIframe = false;

  for (const iframe of iframes) {
    const src = iframe.getAttribute("src") || "";
    if (!src.includes("chat.dreamtripclub.com")) continue;
    hasChatIframe = true;

    if (hideAll) {
      iframe.style.display = "none";
      continue;
    } else {
      iframe.style.display = "";
    }

    const rect = iframe.getBoundingClientRect();
    const looksLikeLauncher = rect.width > 0 && rect.height > 0 && rect.width <= 120 && rect.height <= 120;
    if (!looksLikeLauncher) continue;
    launcherRect = rect;

    if (isMobile) {
      iframe.style.transform = "scale(0.82)";
      iframe.style.transformOrigin = "bottom right";
      iframe.style.display = hidden ? "none" : "";
    } else {
      iframe.style.transform = "";
      iframe.style.transformOrigin = "";
      iframe.style.display = "";
    }
  }

  const btnId = "dtc-chat-launcher-close-btn";
  let btn = document.getElementById(btnId) as HTMLButtonElement | null;
  if (!btn) {
    btn = document.createElement("button");
    btn.id = btnId;
    btn.type = "button";
    btn.textContent = "×";
    btn.setAttribute("aria-label", "Hide chat launcher");
    Object.assign(btn.style, {
      position: "fixed",
      zIndex: "2147483647",
      width: "20px",
      height: "20px",
      borderRadius: "999px",
      border: "1px solid rgba(0,0,0,.12)",
      background: "white",
      color: "#111827",
      fontSize: "12px",
      lineHeight: "18px",
      cursor: "pointer",
      boxShadow: "0 2px 8px rgba(0,0,0,.12)",
      display: "none",
    } as CSSStyleDeclaration);
    btn.onclick = () => {
      (window as any).__dtcChatLauncherHidden = true;
      resizeChatLauncherForMobile();
    };
    document.body.appendChild(btn);
  }

  if (!isMobile || !hasChatIframe || hidden || hideAll) {
    btn.style.display = "none";
    return;
  }

  btn.style.display = "block";
  if (launcherRect) {
    btn.style.left = `${Math.max(8, launcherRect.left - 6)}px`;
    btn.style.top = `${Math.max(8, launcherRect.top - 6)}px`;
  } else {
    btn.style.right = "66px";
    btn.style.bottom = "82px";
    btn.style.left = "";
    btn.style.top = "";
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

  useEffect(() => {
    ensureLoaderScript();

    const run = () => resizeChatLauncherForMobile();
    run();

    const observer = new MutationObserver(() => run());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", run);
    window.addEventListener("dtc-chat-visibility-change", run as EventListener);

    const t1 = window.setTimeout(run, 800);
    const t2 = window.setTimeout(run, 2000);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", run);
      window.removeEventListener("dtc-chat-visibility-change", run as EventListener);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return null;
}
