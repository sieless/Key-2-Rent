/**
 * M-Pesa STK Push API Route
 * Initiates M-Pesa payment requests
 */

import { NextResponse } from 'next/server';

export function POST() {
  console.warn('M-Pesa STK push requested while integration disabled');
  return NextResponse.json(
    { message: 'M-Pesa integration temporarily disabled' },
    { status: 503 }
  );
}
