'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    CollectJS?: { configure(cfg: any): void };
  }
}

export default function TestPayPage() {
  const [status, setStatus] = useState('Loading…');
  const configuredRef = useRef(false);

  const apiBase   = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
  const publicKey = process.env.NEXT_PUBLIC_NMI_PUBLIC_KEY || '';

  function configureCollect() {
    if (!window.CollectJS || configuredRef.current) return;
    try {
      window.CollectJS.configure({
        variant: 'inline',
        paymentSelector: '#pay1', // Collect.js will tokenize on this button
        fields: {
          ccnumber: { selector: '#ccnumber', placeholder: 'Card number' },
          ccexp:    { selector: '#ccexp',    placeholder: 'MM / YY' },
          cvv:      { selector: '#cvv',      placeholder: 'CVV' },
          // If live tokenization requires AVS at tokenization, also include:
          // postal:   { selector: '#postal',   placeholder: 'Postal code' },
        },
        callback: async (resp: any) => {
          // Show raw tokenize result so we can debug easily
          setStatus('Tokenize response:\n' + JSON.stringify(resp, null, 2));

          // Support both response shapes: `payment_token` or `token`
          const tok = resp?.payment_token || resp?.token;
          if (!tok) return; // tokenization failed (error details are in resp)

          try {
            setStatus(s => s + '\n\nSending $1 test payment…');
            const r = await fetch(`${apiBase}/api/booking/confirm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                quote:  { grossAmount: 1, currency: 'CAD' },
                guest:  { firstName: 'Test', lastName: 'User', email: 'test@example.com' },
                payment:{ token: tok },
              }),
            });
            const j = await r.json();
            setStatus(s => s + '\n\nBackend response:\n' + JSON.stringify(j, null, 2));
          } catch (e: any) {
            setStatus(s => s + '\n\nError: ' + (e?.message || 'payment failed'));
          }
        },
      });
      configuredRef.current = true;
      setStatus('CollectJS ready');
    } catch (e: any) {
      setStatus('Configure error: ' + e.message);
    }
  }

  // Safety net: configure once CollectJS exists
  useEffect(() => {
    const id = setInterval(() => {
      if (window.CollectJS && !configuredRef.current) {
        configureCollect();
        clearInterval(id);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-xl p-6">
      {publicKey ? (
        <Script
          src="https://secure.nmi.com/token/Collect.js"
          strategy="afterInteractive"
          onLoad={configureCollect}
          data-tokenization-key={publicKey}
          data-variant="inline"
        />
      ) : (
        <div className="mb-3 text-red-600">Missing NEXT_PUBLIC_NMI_PUBLIC_KEY.</div>
      )}

      <h1 className="text-xl font-semibold mb-4">Test $1 CAD Payment</h1>

      <div className="space-y-3">
        <label className="block text-sm">Card number</label>
        <div id="ccnumber" className="nmi-field" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Expiry</label>
            <div id="ccexp" className="nmi-field" />
          </div>
          <div>
            <label className="block text-sm">CVV</label>
            <div id="cvv" className="nmi-field" />
          </div>
        </div>

        {/* If you enable postal in configure, also render:
        <div>
          <label className="block text-sm">Postal code</label>
          <div id="postal" className="nmi-field" />
        </div>
        */}

        <button id="pay1" className="px-4 py-2 rounded bg-[#211F45] text-white">Pay $1</button>
      </div>

      <pre className="mt-3 text-sm whitespace-pre-wrap">{status}</pre>

      <style jsx>{`
        .nmi-field {
          position: relative;
          z-index: 20;
          pointer-events: auto;
          height: 48px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px;
          background: #fff;
        }
        .nmi-field iframe {
          width: 100% !important;
          height: 100% !important;
          border: 0;
          display: block;
        }
      `}</style>
    </div>
  );
}
