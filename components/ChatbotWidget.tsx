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

const WIDGET_SRC = "https://static.chatbotkit.com/integrations/widget/v2.js";
const SCRIPT_ID = "chatbotkit-widget-script";
const WIDGET_ID = "cmfofmmqn84umyredb9q4j46d"; 

function getGuestSessionId() {
  const key = "dtc_chat_guest_session";
  let id = typeof window !== "undefined" ? localStorage.getItem(key) : null;

  if (!id) {
    id = `guest-${crypto.randomUUID()}`;
    localStorage.setItem(key, id);
    console.log("[Chatbot] Generated new guest session:", id);
  }

  return id;
}

function ensureWidgetScript(session: string) {
  let s = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (s) {
    console.log("[Chatbot] Widget script already loaded");
    return;
  }

  console.log("[Chatbot] Injecting widget script with initial session:", session);

  s = document.createElement("script");
  s.id = SCRIPT_ID;
  s.src = WIDGET_SRC;
  s.async = true;

  s.setAttribute("data-widget", WIDGET_ID);
  s.setAttribute("data-session", session);

  document.body.appendChild(s);
}

async function getWidgetInstance() {
  const w = (window as any).chatbotkitWidget;
  if (!w?.instancePromise) {
    console.warn("[Chatbot] chatbotkitWidget not ready yet");
    return null;
  }

  const instance = await w.instancePromise;
  console.log("[Chatbot] Widget instance ready");
  return instance;
}

export default function ChatbotWidget({ member = null }: Props) {
  const isLoggedIn = !!member?.membershipNo;

  const desiredSession = useMemo(() => {
    const session = member?.membershipNo
      ? member.membershipNo
      : getGuestSessionId();

    console.log("[Chatbot] Desired session:", session);
    return session;
  }, [member?.membershipNo]);

  const meta = useMemo(() => {
    const m = member
      ? {
          membershipId: member.membershipNo,
          name: member.name,
          email: member.email,
          tier: member.tier ?? null,
          points: member.points ?? null,
        }
      : {
          membershipId: null,
          name: null,
          email: null,
          tier: null,
          points: null,
        };

    console.log("[Chatbot] Desired meta:", m);
    return m;
  }, [member]);

  const identityKey = useMemo(() => {
    return JSON.stringify({ session: desiredSession, meta });
  }, [desiredSession, meta]);

  useEffect(() => {
    console.log("[Chatbot] Identity effect triggered");

    // 1) Ensure script exists ONCE
    ensureWidgetScript(desiredSession);

    // 2) Update running widget instance
    (async () => {
      const instance = await getWidgetInstance();
      if (!instance) return;

      const currentSession: string | undefined = instance.session;
      const wasLoggedIn =
        typeof currentSession === "string" &&
        !currentSession.startsWith("guest-");

      console.log("[Chatbot] Current session:", currentSession);
      console.log("[Chatbot] Was logged in:", wasLoggedIn);
      console.log("[Chatbot] Is logged in:", isLoggedIn);

      // Apply identity
      instance.session = desiredSession;
      instance.meta = meta;

      // Helps Inbox labeling
      (instance as any).contact = {
        name: meta.name,
        email: meta.email,
      };

      console.log("[Chatbot] Applied session + meta to widget");

     
      if (isLoggedIn !== wasLoggedIn) {
        console.log(
          "[Chatbot] Auth boundary changed → restarting conversation"
        );
        instance.restartConversation();
        return;
      }

      if (
        isLoggedIn === wasLoggedIn &&
        typeof currentSession === "string" &&
        currentSession !== desiredSession
      ) {
        console.log(
          "[Chatbot] Session value changed → restarting conversation"
        );
        instance.restartConversation();
      }
    })();
  }, [identityKey, isLoggedIn, desiredSession, meta]);

  return null;
}
