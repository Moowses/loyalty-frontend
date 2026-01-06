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
const WIDGET_ID = "cmfofmmqn84umyredb9q4j46d"; // your data-widget id

function getGuestSessionId() {
  const key = "dtc_chat_guest_session";
  let id = typeof window !== "undefined" ? localStorage.getItem(key) : null;

  if (!id) {
    id = `guest-${crypto.randomUUID()}`;
    localStorage.setItem(key, id);
  }

  return id;
}

function ensureWidgetScript(session: string) {
  // If script already exists, don't add another one (prevents double widget)
  let s = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (s) return;

  s = document.createElement("script");
  s.id = SCRIPT_ID;
  s.src = WIDGET_SRC;
  s.async = true;

  // v2 embed attributes
  s.setAttribute("data-widget", WIDGET_ID);
  s.setAttribute("data-session", session);

  document.body.appendChild(s);
}

async function getWidgetInstance() {
  // Wait until the widget creates its global
  const w = (window as any).chatbotkitWidget;
  if (!w?.instancePromise) return null;
  return await w.instancePromise;
}

export default function ChatbotWidget({ member = null }: Props) {
  const desiredSession = useMemo(() => {
    return member?.membershipNo ? member.membershipNo : getGuestSessionId();
  }, [member?.membershipNo]);

  const meta = useMemo(() => {
    if (!member) {
      return {
        membershipId: null,
        name: null,
        email: null,
        tier: null,
        points: null,
      };
    }

    return {
      membershipId: member.membershipNo,
      name: member.name,
      email: member.email,
      tier: member.tier ?? null,
      points: member.points ?? null,
    };
  }, [member]);

  const identityKey = useMemo(() => {
    // triggers updates only when identity meaningfully changes
    return JSON.stringify({ session: desiredSession, meta });
  }, [desiredSession, meta]);

  useEffect(() => {
    // 1) Ensure script exists ONCE
    ensureWidgetScript(desiredSession);

    // 2) Update running widget instance
    (async () => {
      const instance = await getWidgetInstance();
      if (!instance) return;

      const currentSession = instance.session;

      // Apply session + meta
      instance.session = desiredSession;
      instance.meta = meta;

      // 3) If session changed (guest -> member or member -> guest), restart ONCE
      if (currentSession && currentSession !== desiredSession) {
        instance.restartConversation();
      }
    })();
  }, [identityKey]);

  return null;
}
