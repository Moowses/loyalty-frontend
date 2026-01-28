"use client";

import Script from "next/script";

export type ChatbotMember = {
  membershipNo: string;
  name: string;
  email: string;
};

export default function DTCChatLoader({ member }: { member: ChatbotMember }) {
  // IMPORTANT: render only when member exists
  if (!member?.membershipNo) return null;

  return (
    <>
      {/* This must be an inline script tag (like Prasanna's snippet) */}
      <Script
        id="dt-member-inline"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.DT_MEMBER = ${JSON.stringify({
            isLoggedIn: true,
            name: member.name,
            email: member.email,
            memberNo: member.membershipNo,
          })};`,
        }}
      />
      <Script
        id="dt-chat-loader"
        src="https://chat.dreamtripclub.com/widget/loader.js"
        strategy="beforeInteractive"
      />
    </>
  );
}
