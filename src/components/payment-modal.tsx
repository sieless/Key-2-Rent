/**
 * Payment Modal Component
 * Handles M-Pesa STK Push payments for all transaction types
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Phone, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { TransactionType } from '@/types';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  type: TransactionType;
  listingId?: string;
  onSuccess?: () => void;
  title?: string;
  description?: string;
}

export function PaymentModal({
  open,
  onOpenChange,
  amount,
  type,
  listingId,
  onSuccess,
  title,
  description,
}: PaymentModalProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isInitiating, setIsInitiating] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [checkoutRequestID, setCheckoutRequestID] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'FAILED' | 'PENDING'>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Auto-format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits

    // Limit to 12 digits (254XXXXXXXXX)
    if (value.length > 12) {
      value = value.slice(0, 12);
    }

    // Auto-add 254 prefix if user starts with 0 or 7
    if (value.startsWith('0')) {
      value = '254' + value.slice(1);
    } else if (value.startsWith('7') || value.startsWith('1')) {
      value = '254' + value;
    }

    setPhoneNumber(value);
  };

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: 'Not logged in',
        description: 'Please log in to continue',
        variant: 'destructive',
      });
      return;
    }

    // Validate phone number
    if (!/^254[71]\d{8}$/.test(phoneNumber)) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid Kenyan phone number (254XXXXXXXXX)',
        variant: 'destructive',
      });
      return;
    }

    setIsInitiating(true);

    try {
      const response = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          amount,
          type,
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName,
          listingId,
        }),
      });

      const data = await response.json();

      if (response.status === 503) {
        throw new Error('M-Pesa integration is temporarily unavailable. Please try again later.');
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Payment initiation failed');
      }

      setTransactionId(data.transactionId);
      setCheckoutRequestID(data.documentId);
      setStatus('PENDING');
      toast({
        title: 'Payment initiated',
        description: 'Please enter your M-Pesa PIN on your phone',
      });

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment failed',
        description: error.message || 'Failed to initiate payment. Please try again.',
        variant: 'destructive',
      });
      setStatus('FAILED');
      setStatusMessage(error.message);
      setIsInitiating(false);
    }
  };

  const handleClose = () => {
    // Don't close if payment is in progress
    if (isInitiating || status === 'PENDING') {
      return;
    }

    // Reset state
    setPhoneNumber('');
    setTransactionId(null);
    setCheckoutRequestID(null);
    setIsInitiating(false);
    setStatus('IDLE');
    setStatusMessage(null);

    onOpenChange(false);

    // Call success callback if payment was successful
    if (status === 'SUCCESS' && onSuccess) {
      onSuccess();
    }
  };

  const handleRetry = () => {
    setTransactionId(null);
    setCheckoutRequestID(null);
    setIsInitiating(false);
    setStatus('IDLE');
    setStatusMessage(null);
  };

  const getStatusIcon = () => {
    if (status === 'SUCCESS') {
      return <CheckCircle2 className="h-12 w-12 text-green-500" />;
    }
    if (status === 'FAILED') {
      return <XCircle className="h-12 w-12 text-red-500" />;
    }
    if (status === 'PENDING') {
      return <Loader2 className="h-12 w-12 text-primary animate-spin" />;
    }
    return null;
  };

  const getStatusMessage = () => {
    if (status === 'SUCCESS') {
      return {
        title: 'Payment Successful!',
        description: 'Your payment has been processed successfully.',
        variant: 'default' as const,
      };
    }
    if (status === 'FAILED') {
      return {
        title: 'Payment Failed',
        description: statusMessage || 'Payment was not completed. Please try again.',
        variant: 'destructive' as const,
      };
    }
    if (status === 'PENDING') {
      return {
        title: 'Waiting for payment...',
        description: 'Please enter your M-Pesa PIN on your phone to complete the payment.',
        variant: 'default' as const,
      };
    }
    return null;
  };

  const statusInfo = getStatusMessage();
  const showPaymentForm = !isInitiating && transactionId === null && status === 'IDLE';
  const showStatus = transactionId && status !== 'IDLE';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title || 'Complete Payment'}</DialogTitle>
          <DialogDescription>
            {description || 'Enter your M-Pesa phone number to continue'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payment Amount */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">Amount to pay:</span>
            <span className="text-2xl font-bold text-primary">KES {amount.toLocaleString()}</span>
          </div>

          {/* Payment Form */}
          {showPaymentForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">M-Pesa Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="254712345678"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    className="pl-10"
                    maxLength={12}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the phone number registered with M-Pesa
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You will receive a prompt on your phone to enter your M-Pesa PIN. Please complete within 1 minute.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Payment Status */}
          {showStatus && statusInfo && (
            <div className="flex flex-col items-center justify-center space-y-4 py-4">
              {getStatusIcon()}
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">{statusInfo.title}</h3>
                <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          {showPaymentForm && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={isInitiating || phoneNumber.length !== 12}
              >
                {isInitiating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initiating...
                  </>
                ) : (
                  'Pay with M-Pesa'
                )}
              </Button>
            </>
          )}

          {pollResult.status === 'SUCCESS' && (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}

          {pollResult.status === 'FAILED' && (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleRetry} className="flex-1">
                Try Again
              </Button>
            </div>
          )}

          {pollResult.isPolling && (
            <Button variant="outline" onClick={handleClose} className="w-full" disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing payment...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
