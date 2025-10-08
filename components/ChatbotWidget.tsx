'use client';
import { useEffect } from 'react';

export default function ChatbotWidget() {
  useEffect(() => {
    if (document.getElementById('chatbotkit-widget')) return; // avoid duplicates
    const s = document.createElement('script');
    s.id = 'chatbotkit-widget';
    s.src = 'https://static.chatbotkit.com/integrations/widget/v2.js';
    s.async = true;
    s.dataset.widget = 'cmfofmmqn84umyredb9q4j46d';
    document.body.appendChild(s);
    return () => { document.getElementById('chatbotkit-widget')?.remove(); };
  }, []);
  return null;
}