"use client";

import { useEffect } from "react";

export type ChatbotMember = {
  membershipNo: string;
  name: string;
  email: string;
  tier?: string;
  points?: number | string;
};

type Props = {
  member: ChatbotMember; // NOT optional anymore
};

declare global {
  interface Window {
    DT_MEMBER?: {
      isLoggedIn: boolean;
      name: string;
      email: string;
      memberNo: string;
    };
  }
}

const SCRIPT_ID = "dtc-chat-widget-loader";
const LOADER_SRC = "https://chat.dreamtripclub.com/widget/loader.js";

function loadWidgetOnce() {
  if (document.getElementById(SCRIPT_ID)) return;

  const s = document.createElement("script");
  s.id = SCRIPT_ID;
  s.src = LOADER_SRC;
  s.defer = true;
  s.async = true;

  document.body.appendChild(s);
}

export default function ChatbotWidget({ member }: Props) {
  useEffect(() => {
    // 1) Set identity FIRST
    window.DT_MEMBER = {
      isLoggedIn: true,
      name: member.name,
      email: member.email,
      memberNo: member.membershipNo,
    };

    // 2) Load widget AFTER identity is ready
    loadWidgetOnce();
  }, [member.membershipNo]);

  return null;
}
