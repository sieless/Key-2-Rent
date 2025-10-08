/**
 * M-Pesa STK Push API Route
 * Initiates M-Pesa payment requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { initiateSTKPush } from '@/lib/mpesa';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { Transaction, TransactionType } from '@/types';

// Initialize Firebase Admin for server-side operations
const app = initializeApp(firebaseConfig, 'mpesa-stk-push');
const db = getFirestore(app);

// Rate limiting: Track requests per user
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = requestCounts.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize
    requestCounts.set(userId, { count: 1, resetTime: now + 60 * 60 * 1000 }); // 1 hour
    return true;
  }

  if (userLimit.count >= 5) {
    return false; // Rate limit exceeded
  }

  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, amount, type, userId, userEmail, userName, listingId } = body;

    // Validation
    if (!phoneNumber || !amount || !type || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: phoneNumber, amount, type, userId' },
        { status: 400 }
      );
    }

    // Validate transaction type
    const validTypes: TransactionType[] = ['CONTACT_ACCESS', 'VACANCY_LISTING', 'FEATURED_LISTING', 'BOOSTED_LISTING'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Too many payment requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate amount
    if (amount <= 0 || amount > 150000) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be between 1 and 150,000 KES' },
        { status: 400 }
      );
    }

    // Generate unique transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Prepare transaction description
    const descriptions: Record<TransactionType, string> = {
      'CONTACT_ACCESS': 'Contact Access Subscription',
      'VACANCY_LISTING': 'Vacancy Listing Payment',
      'FEATURED_LISTING': 'Featured Listing Payment',
      'BOOSTED_LISTING': 'Boosted Listing Payment',
    };

    const accountReference = `KEY2RENT-${type}`;
    const transactionDesc = descriptions[type as TransactionType];

    // Initiate STK Push
    const stkResponse = await initiateSTKPush({
      phoneNumber,
      amount,
      accountReference,
      transactionDesc,
    });

    if (!stkResponse.success) {
      return NextResponse.json(
        {
          error: stkResponse.error || 'Failed to initiate payment',
          code: stkResponse.responseCode
        },
        { status: 500 }
      );
    }

    // Save transaction to Firestore
    const transactionData: Omit<Transaction, 'id'> = {
      transactionId,
      userId,
      userEmail,
      userName,
      type: type as TransactionType,
      amount,
      phoneNumber,
      checkoutRequestID: stkResponse.checkoutRequestID,
      merchantRequestID: stkResponse.merchantRequestID,
      status: 'PENDING',
      statusMessage: stkResponse.customerMessage,
      listingId,
      createdAt: serverTimestamp() as any,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    const docRef = await addDoc(collection(db, 'transactions'), transactionData);

    return NextResponse.json({
      success: true,
      transactionId,
      checkoutRequestID: stkResponse.checkoutRequestID,
      message: stkResponse.customerMessage,
      documentId: docRef.id,
    });

  } catch (error: any) {
    console.error('STK Push API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
