'use client';

import React, { useEffect, useRef, useState } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_KEXT_API_URL ||
  'https://api.dreamtripclub.com/api/kext/external-ref';

type PosContext = any;

export default function KextExternalRefPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<any>(null);

  const [membershipId, setMembershipId] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [status, setStatus] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [posContext, setPosContext] = useState<PosContext | null>(null);
  const [hasCurrentAccount, setHasCurrentAccount] = useState<boolean | null>(
    null
  );

  // Keep track of the last membership ID we attached to POS
  // to prevent multiple lines from one scan / scanner bounce
  const lastTaggedRef = useRef<{ id: string | null; ts: number | null }>({
    id: null,
    ts: null,
  });

  // Load ZXing on client (multi-format: QR + 1D barcodes)
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (!active) return;

        // 300ms between scans for responsiveness
        readerRef.current = new BrowserMultiFormatReader(undefined, 300);
      } catch (err) {
        console.error('Failed to load ZXing', err);
        setStatus('Failed to load scanner library.');
      }
    }

    load();

    return () => {
      active = false;
      if (readerRef.current) {
        try {
          readerRef.current.reset();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Listen for POS context from K-Series + actively request current account
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleMessage(evt: MessageEvent) {
      if (evt?.data?.type === 'LSK_POS_CONTEXT') {
        setPosContext(evt.data.payload || null);
        setHasCurrentAccount(true);
      }
    }

    window.addEventListener('message', handleMessage);

    const w = window as any;

    // 1) If global posContext is already injected, use it
    if (w.posContext) {
      setPosContext(w.posContext);
      setHasCurrentAccount(true);
    }

    // 2) Actively ask POS for the current account if API exists
    if (typeof w.pos_getCurrentAccount === 'function') {
      try {
        w.pos_getCurrentAccount((response: any) => {
          if (response && response.data) {
            setPosContext(response.data);
            setHasCurrentAccount(true);
            console.log('[WX] getCurrentAccount OK', response.data);
          } else {
            setHasCurrentAccount(false);
            setStatus(
              'No open order detected. Start a sale on the POS, then open this membership scanner.'
            );
            console.log('[WX] getCurrentAccount – no active account', response);
          }
        });
      } catch (err) {
        console.error('[WX] pos_getCurrentAccount failed', err);
        setHasCurrentAccount(false);
      }
    } else {
      // No explicit API; if no posContext either, assume no account
      if (!w.posContext) {
        setHasCurrentAccount(false);
      }
    }

    // 3) Optionally ping native app to request context (harmless if unsupported)
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'LSK_GET_CONTEXT' }, '*');
      } catch {
        // ignore
      }
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  function camErrorMessage(err: any): string {
    const name = err && err.name ? err.name : '';
    const map: Record<string, string> = {
      NotAllowedError: 'Camera permission denied.',
      NotFoundError: 'No camera found.',
      NotReadableError: 'Camera is in use by another app.',
      OverconstrainedError: 'Camera constraints not satisfied.',
      SecurityError: 'Camera blocked (check HTTPS / app permissions).',
      AbortError: 'Camera start aborted.',
      TypeError: 'Invalid camera constraints.',
    };
    return map[name] || `Camera error: ${err?.message || 'unknown'}`;
  }

  // Attach member to POS: external reference + special item
  function addMembershipToPos(rawId: string) {
    if (typeof window === 'undefined') {
      return { ok: false, reason: 'no-window' as const };
    }

    const id = String(rawId).trim();
    if (!id) return { ok: false, reason: 'empty-id' as const };

    // 🔒 Duplicate guard: avoid multiple lines for the same scan
    const now = Date.now();
    if (
      lastTaggedRef.current.id === id &&
      lastTaggedRef.current.ts &&
      now - lastTaggedRef.current.ts < 3000 // 3 seconds
    ) {
      console.log('[LOYALTY] Skipping duplicate membership tag', id);
      return { ok: false, reason: 'duplicate-scan' as const };
    }
    lastTaggedRef.current = { id, ts: now };

    const label = `DreamTripMember-${id}`;
    const itemId = '1285251783460764';

    const used: string[] = [];
    let lastMethod: string | null = null;

    try {
      const w = window as any;

      // 1) External reference
      if (typeof w.pos_addExternalReference === 'function') {
        w.pos_addExternalReference(id, 'DreamTripMember');
        used.push('pos_addExternalReference');
        lastMethod = 'pos_addExternalReference';
      } else if (w.posContext?.api?.setOrderExternalField) {
        w.posContext.api.setOrderExternalField({
          key: 'external_reference',
          value: label,
        });
        used.push('setOrderExternalField');
        lastMethod = 'setOrderExternalField';
      } else if (w.parent && w.parent !== w) {
        w.parent.postMessage(
          {
            type: 'SET_EXTERNAL_FIELD',
            payload: { key: 'external_reference', value: label },
          },
          '*'
        );
        used.push('postMessage');
        lastMethod = 'postMessage';
      }

      // 2) Visible $0 special item
      if (typeof w.pos_addSpecialItemToCurrentAccount === 'function') {
        w.pos_addSpecialItemToCurrentAccount(itemId, 0, id); // id = scanned membership ID
        used.push('pos_addSpecialItemToCurrentAccount');
        lastMethod = 'pos_addSpecialItemToCurrentAccount';
      }

      if (!used.length) {
        return { ok: false, reason: 'no-pos-bridge' as const };
      }

      (w as any).__lastMembershipAdded = id;
      return { ok: true, method: lastMethod, methods: used };
    } catch (e: any) {
      return { ok: false, reason: e?.message || 'error' };
    }
  }

  async function startScan() {
    if (hasCurrentAccount === false) {
      setStatus(
        'No open order detected. Start a sale on the POS, then open this membership scanner.'
      );
      return;
    }

    if (!readerRef.current) {
      setStatus('Scanner not ready yet. Try again in a moment.');
      return;
    }
    const video = videoRef.current;
    if (!video) {
      setStatus('Video element not found.');
      return;
    }

    setStatus('Opening camera…');
    setIsScanning(true);

    try {
      await readerRef.current.decodeFromVideoDevice(
        undefined,
        video,
        (result: any) => {
          if (result && result.getText) {
            const code = String(result.getText()).trim();
            setMembershipId(code);

            const wr = addMembershipToPos(code);

            if (wr.ok) {
              setStatus(
                `Scanned → attached to POS via ${wr.method}. ID: ${code}`
              );
            } else {
              setStatus(
                `Scanned: ${code}, but POS attach failed (${wr.reason}). You can still hit SAVE to retry.`
              );
            }

            stopScan();
          }
          // ignore decode errors while scanning
        }
      );

      setStatus('Scanning… align barcode / QR within the orange line.');
    } catch (err: any) {
      console.error(err);
      setStatus(camErrorMessage(err));
      setIsScanning(false);
    }
  }

  function stopScan() {
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch {
        // ignore
      }
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (hasCurrentAccount === false) {
      setStatus(
        'No open order detected. Start a sale on the POS, then open this membership scanner.'
      );
      return;
    }

    const id = membershipId.trim();
    if (!id) {
      setStatus('Membership ID is required.');
      return;
    }

    const wr = addMembershipToPos(id);
    if (wr.ok) {
      setStatus(`Saved to POS via ${wr.method}. Syncing to server…`);
    } else if (wr.reason === 'duplicate-scan') {
      // We already tagged POS, just sync to server
      setStatus('Already tagged in POS. Syncing to server…');
    } else {
      setStatus(
        `POS attach failed (${wr.reason || 'n/a'}). Syncing to server anyway…`
      );
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalReference: id,
          receiptNumber: receiptNumber || undefined,
          posContext: posContext || null,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setStatus('POS + server sync complete.');
    } catch (err: any) {
      console.error(err);
      setStatus(`Server save error: ${err.message || 'unknown error'}`);
    }
  }

  function handleRetry() {
    // Clear the current membership + status and restart scan
    setMembershipId('');
    setStatus('');

    // Reset duplicate guard so a new scan can add again
    lastTaggedRef.current = { id: null, ts: null };

    stopScan();
    startScan();
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-6">
      <div className="max-w-6xl w-full">
        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-2">
          Scan Membership ID
        </h1>

        {hasCurrentAccount === false && (
          <div className="mb-3 rounded-md bg-amber-100 border border-amber-300 px-3 py-2 text-[11px] text-amber-900">
            No open order detected on the POS. Please start a sale, then open
            this Web Extension from the order screen.
          </div>
        )}

        {/* Layout */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-10">
          {/* Left: Scanner */}
          <section className="flex-1">
            <div className="relative w-full rounded-2xl bg-black overflow-hidden shadow-md">
              {/* 4:3 box */}
              <div className="pt-[75%]" />
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
              {/* Orange scan line */}
              <div className="pointer-events-none absolute inset-x-10 top-1/2 -mt-[1px] h-[2px] bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.9)]" />
            </div>

            <p className="mt-2 text-[11px] md:text-xs text-slate-500">
              On iPad/POS: tap <span className="font-semibold">Start Camera</span> once to
              allow access. Hold the barcode or QR steady in the orange line. If the
              camera is blocked by the POS container, you can still type the Membership ID
              and press <span className="font-semibold">SAVE</span>.
            </p>
          </section>

          {/* Right: Controls */}
          <section className="w-full md:w-80 lg:w-96 flex flex-col gap-6">
            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={startScan}
                disabled={isScanning || hasCurrentAccount === false}
                className="flex-1 h-12 rounded-full bg-[#211F45] text-white text-xs md:text-sm font-semibold tracking-[0.12em] uppercase hover:bg-[#1a1936] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isScanning ? 'SCANNING…' : 'START CAMERA'}
              </button>
              <button
                type="button"
                onClick={handleRetry}
                disabled={hasCurrentAccount === false}
                className="flex-1 h-12 rounded-full bg-[#211F45] text-white text-xs md:text-sm font-semibold tracking-[0.12em] uppercase hover:bg-[#1a1936] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                RETRY
              </button>
              <button
                type="button"
                onClick={stopScan}
                className="flex-1 h-12 rounded-full bg-[#211F45] text-white text-xs md:text-sm font-semibold tracking-[0.12em] uppercase hover:bg-[#1a1936]"
              >
                STOP
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="membership"
                  className="block text-xs md:text-sm font-medium text-slate-800"
                >
                  Membership ID
                </label>
                <input
                  id="membership"
                  value={membershipId}
                  onChange={(e) => setMembershipId(e.target.value)}
                  placeholder="Scan / Auto-Fill Here"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm md:text-base outline-none focus:ring-2 focus:ring-[#211F45] focus:border-[#211F45]"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="receipt"
                  className="block text-xs md:text-sm font-medium text-slate-800"
                >
                  Receipt Number (Optional)
                </label>
                <input
                  id="receipt"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="E.g., 10432"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm md:text-base outline-none focus:ring-2 focus:ring-[#211F45] focus:border-[#211F45]"
                />
              </div>

              <button
                type="submit"
                disabled={hasCurrentAccount === false}
                className="w-40 h-12 rounded-full bg-[#211F45] text-white text-xs md:text-sm font-semibold tracking-[0.12em] uppercase hover:bg-[#1a1936] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                SAVE
              </button>
            </form>

            {/* Status */}
            <div className="min-h-[1.5rem] text-[11px] md:text-xs text-slate-700">
              {status && <span>{status}</span>}
            </div>

            {/* POS DIAGNOSTICS */}
            <div className="mt-4 p-3 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-700">
              <div className="font-semibold mb-1">POS Diagnostics</div>
              <pre className="whitespace-pre-wrap text-[10px]">
                {typeof window !== 'undefined'
                  ? `
                    pos_addSpecialItemToCurrentAccount: ${
                    typeof (window as any).pos_addSpecialItemToCurrentAccount
                  }
                  pos_addExternalReference:          ${
                    typeof (window as any).pos_addExternalReference
                  }
                  pos_getCurrentAccount:            
                 ${
                    typeof (window as any).pos_getCurrentAccount
                  }
                      hasCurrentAccount (state):         ${String(hasCurrentAccount)}
                      posContext (state is set):         ${String(!!posContext)}
                      userAgent:                         ${navigator.userAgent}
                      origin:                            ${window.location.origin}
                      `
                  : 'Loading…'}
              </pre>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
