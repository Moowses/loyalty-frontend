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
  widgetId?: string; // this is your ChatBotKit widget integration id
};

const CHATBOTKIT_SRC = "https://static.chatbotkit.com/integrations/widget/v2.js";
const SCRIPT_ID = "chatbotkit-widget-script";

function removeChatbotKitWidget() {
  // remove our injected script
  document
    .querySelectorAll(`script[src="${CHATBOTKIT_SRC}"], #${SCRIPT_ID}`)
    .forEach((n) => n.remove());

  // remove widget DOM remnants
  document
    .querySelectorAll(
      "[data-chatbotkit-widget], iframe[src*='chatbotkit'], div[id*='chatbotkit']"
    )
    .forEach((n) => n.remove());
}

function getGuestSessionId() {
  const key = "dtc_chat_guest_session";
  let id = localStorage.getItem(key);

  if (!id) {
    id = `guest-${crypto.randomUUID()}`;
    localStorage.setItem(key, id);
  }

  return id;
}

export default function ChatbotWidget({
  member = null,
  widgetId = "cmfofmmqn84umyredb9q4j46d",
}: Props) {
  // triggers re-init only when identity payload changes
  const identityKey = useMemo(() => {
    if (!member) return "guest";
    return [
      member.membershipNo,
      member.email,
      member.name,
      member.tier ?? "",
      member.points ?? "",
    ].join("|");
  }, [member]);

  useEffect(() => {
    removeChatbotKitWidget();

    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = CHATBOTKIT_SRC;
    s.async = true;

    // Widget integration ID (this is what ChatBotKit uses to load your widget)
    s.setAttribute("data-widget", widgetId);

    if (member?.membershipNo) {
     
      s.setAttribute("data-session", member.membershipNo);
      s.setAttribute(
        "data-meta",
        JSON.stringify({
          membershipId: member.membershipNo,
          name: member.name,
          email: member.email,
          tier: member.tier ?? null,
          points: member.points ?? null,
        })
      );
    } else {
      // guest session persists across tabs/windows (your current behavior)
      s.setAttribute("data-session", getGuestSessionId());

      // optional: keep meta minimal for guests
      s.setAttribute(
        "data-meta",
        JSON.stringify({
          membershipId: null,
          name: null,
          email: null,
          tier: null,
          points: null,
        })
      );
    }

    document.body.appendChild(s);

    return () => removeChatbotKitWidget();
  }, [identityKey, widgetId]);

  return null;
}
