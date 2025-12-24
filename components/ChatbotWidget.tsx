"use client";

import { useEffect, useMemo } from "react";

export type ChatbotMember = {
  membershipNo: string; // memberId
  name: string;
  email: string;
};

type Props = {
  member?: ChatbotMember | null;
  widgetId?: string;
  extraMeta?: Record<string, unknown>;
};

const CHATBOTKIT_SRC = "https://static.chatbotkit.com/integrations/widget/v2.js";
const SCRIPT_ID = "chatbotkit-widget-script";

function removeChatbotKitWidget() {
  // remove any chatbotkit scripts (best effort)
  document
    .querySelectorAll(`script[src="${CHATBOTKIT_SRC}"], #${SCRIPT_ID}`)
    .forEach((n) => n.remove());

  // remove common injected nodes
  document
    .querySelectorAll(
      "[data-chatbotkit-widget], iframe[src*='chatbotkit'], div[id*='chatbotkit']"
    )
    .forEach((n) => n.remove());
}

export default function ChatbotWidget({
  member = null,
  widgetId = "cmfofmmqn84umyredb9q4j46d",
  extraMeta,
}: Props) {
  
  const identityKey = useMemo(() => {
    if (!member) return "logged-out";
    return `${member.membershipNo}|${member.email}|${member.name}`;
  }, [member]);

  useEffect(() => {
    
    removeChatbotKitWidget();

    
    if (!member) return;

    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = CHATBOTKIT_SRC;
    s.async = true;

    s.setAttribute("data-widget", widgetId);
    s.setAttribute("data-session", `member-${member.membershipNo}`);

    s.setAttribute(
      "data-meta",
      JSON.stringify({
        memberId: member.membershipNo,
        name: member.name,
        email: member.email,
        ...(extraMeta || {}),
      })
    );

    document.body.appendChild(s);

    return () => {
      removeChatbotKitWidget();
    };
  }, [identityKey, widgetId, extraMeta, member]);

  return null;
}
