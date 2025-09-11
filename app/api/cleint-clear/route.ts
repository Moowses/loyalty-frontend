// Next.js route on member.dreamtripclub.com
import { NextResponse } from 'next/server';

export async function POST() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Clear-Site-Data', '"cookies", "storage", "cache"');
  // optional hardening
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
