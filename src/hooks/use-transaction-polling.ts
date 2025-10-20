/**
 * Transaction Polling Hook
 * Polls transaction status after STK Push initiation
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { TransactionStatus } from '@/types';

interface TransactionPollResult {
  status: TransactionStatus | null;
  statusMessage: string | null;
  mpesaReceiptNumber: string | null;
  isPolling: boolean;
  error: string | null;
}

export function useTransactionPolling(transactionId: string | null): TransactionPollResult {
  const db = useFirestore();
  const [result, setResult] = useState<TransactionPollResult>({
    status: null,
    statusMessage: null,
    mpesaReceiptNumber: null,
    isPolling: false,
    error: null,
  });

  useEffect(() => {
    if (!transactionId) {
      setResult({
        status: null,
        statusMessage: null,
        mpesaReceiptNumber: null,
        isPolling: false,
        error: null,
      });
      return;
    }

    if (!db) {
      setResult(prev => ({ ...prev, isPolling: false, error: 'Database unavailable' }));
      return;
    }

    setResult(prev => ({ ...prev, isPolling: true }));

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      doc(db, 'transactions', transactionId),
      (docSnapshot) => {
        if (!docSnapshot.exists()) {
          setResult({
            status: null,
            statusMessage: null,
            mpesaReceiptNumber: null,
            isPolling: false,
            error: 'Transaction not found',
          });
          return;
        }

        const data = docSnapshot.data();
        const status = data.status as TransactionStatus;

        // Stop polling if transaction is completed (success or failed)
        const isComplete = status === 'SUCCESS' || status === 'FAILED' || status === 'CANCELLED';

        setResult({
          status,
          statusMessage: data.statusMessage || null,
          mpesaReceiptNumber: data.mpesaReceiptNumber || null,
          isPolling: !isComplete,
          error: status === 'FAILED' ? data.statusMessage || 'Payment failed' : null,
        });
      },
      (error) => {
        console.error('Transaction polling error:', error);
        setResult({
          status: null,
          statusMessage: null,
          mpesaReceiptNumber: null,
          isPolling: false,
          error: 'Failed to poll transaction status',
        });
      }
    );

    // Timeout after 2 minutes
    const timeout = setTimeout(() => {
      setResult(prev => ({
        ...prev,
        isPolling: false,
        error: prev.status === 'PENDING' ? 'Transaction timeout. Please check your payment history.' : null,
      }));
    }, 2 * 60 * 1000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [transactionId, db]);

  return result;
}
