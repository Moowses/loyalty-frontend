"use client";

import { useEffect, useMemo } from "react";

export type ChatbotMember = {
  membershipNo: string;
  name: string;
  email: string;
};

type Props = {
  member?: ChatbotMember | null;
  widgetId?: string;
};

const CHATBOTKIT_SRC = "https://static.chatbotkit.com/integrations/widget/v2.js";
const SCRIPT_ID = "chatbotkit-widget-script";

function removeChatbotKitWidget() {
  document
    .querySelectorAll(`script[src="${CHATBOTKIT_SRC}"], #${SCRIPT_ID}`)
    .forEach((n) => n.remove());

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
  const identityKey = useMemo(() => {
    if (!member) return "guest";
    return `${member.membershipNo}|${member.email}|${member.name}`;
  }, [member]);

  useEffect(() => {
    removeChatbotKitWidget();

    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = CHATBOTKIT_SRC;
    s.async = true;

    s.setAttribute("data-widget", widgetId);

    if (member?.membershipNo) {
      
      s.setAttribute("data-session", `member-${member.membershipNo}`);
      s.setAttribute(
        "data-meta",
        JSON.stringify({
          memberId: member.membershipNo,
          name: member.name,
          email: member.email,
        })
      );
    } else {
      //
      s.setAttribute("data-session", getGuestSessionId());
    
    }

    document.body.appendChild(s);

    return () => removeChatbotKitWidget();
  }, [identityKey, widgetId]);

  return null;
}
