/**
 * M-Pesa Callback Handler
 * Receives payment confirmations from Safaricom and updates user permissions
 */

import { NextResponse } from 'next/server';

export function POST() {
  return NextResponse.json(
    { message: 'M-Pesa integration temporarily disabled' },
    { status: 503 }
  );
}

export function GET() {
  return NextResponse.json(
    { message: 'M-Pesa integration temporarily disabled' },
    { status: 503 }
  );
}
