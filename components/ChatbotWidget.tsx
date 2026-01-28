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
  member: ChatbotMember;
};

declare global {
  interface Window {
    DT_MEMBER?: any;
  }
}

const SCRIPT_ID = "dtc-chat-widget-loader";
const LOADER_SRC = "https://chat.dreamtripclub.com/widget/loader.js";

export default function ChatbotWidget({ member }: Props) {
  useEffect(() => {
    console.log("🟢 [Chatbot] component mounted");
    console.log("🟢 [Chatbot] member prop:", member);

    // 1️⃣ Set DT_MEMBER
    window.DT_MEMBER = {
      isLoggedIn: true,
      name: member.name,
      email: member.email,
      memberNo: member.membershipNo,
    };

    console.log("🟢 [Chatbot] window.DT_MEMBER set to:", window.DT_MEMBER);

    // 2️⃣ Check if script already exists
    const existing = document.getElementById(SCRIPT_ID);
    console.log("🟡 [Chatbot] loader script exists?", !!existing);

    if (!existing) {
      console.log("🟡 [Chatbot] injecting loader.js");

      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = LOADER_SRC;
      s.defer = true;
      s.async = true;

      s.onload = () => {
        console.log("✅ [Chatbot] loader.js loaded");
        console.log("🔍 [Chatbot] window.DT_MEMBER after load:", window.DT_MEMBER);
        console.log("🔍 [Chatbot] window keys:", Object.keys(window));
      };

      s.onerror = () => {
        console.error("❌ [Chatbot] failed to load loader.js");
      };

      document.body.appendChild(s);
    }
  }, [member.membershipNo]);

  return null;
}
