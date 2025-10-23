'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getVacancyPaymentAmount, getVacancyPaymentLabel } from '@/lib/vacancy-payments';
import { ShieldCheck, Trash2, Upload, X, Paperclip } from 'lucide-react';

type PaymentConfirmationResult = {
  redirectUrl?: string;
};

export type PaymentProofPayload = {
  text?: string;
  file?: File;
};

interface VacancyPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyType: string;
  monthlyRent: number;
  listingStatus?: 'Vacant' | 'Occupied' | 'Available Soon';
  listingReference?: string;
  onPaymentConfirmed: (proof: PaymentProofPayload) => Promise<PaymentConfirmationResult | void>;
  isLoading?: boolean;
  successRedirectUrl?: string;
}

const PAYMENT_METHOD = 'M-Pesa';
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_TEXT_LENGTH = 1200;
const TILL_NUMBER = '6046866';
const ACCOUNT_NAME = 'TITUS KIPKIRUI';
const SUPPORT_CONTACT = process.env.NEXT_PUBLIC_VACANCY_SUPPORT_CONTACT ?? '0708674665';

export function VacancyPaymentModal({
  open,
  onOpenChange,
  propertyType,
  monthlyRent,
  listingStatus = 'Vacant',
  listingReference,
  onPaymentConfirmed,
  isLoading = false,
  successRedirectUrl = '/payments/success',
}: VacancyPaymentModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [proofText, setProofText] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const paymentLabel = useMemo(() => getVacancyPaymentLabel(propertyType), [propertyType]);
  const amount = useMemo(() => {
    return getVacancyPaymentAmount(monthlyRent);
  }, [monthlyRent]);
  const formattedAmount = amount > 0 ? `KES ${amount.toLocaleString()}` : 'KES 0';
  const reference = listingReference || paymentLabel;

  useEffect(() => {
    if (!proofFile) {
      setProofPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(proofFile);
    setProofPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [proofFile]);

  const resetProofState = () => {
    setProofText('');
    setProofFile(null);
    setProofPreviewUrl(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setProofFile(null);
      return;
    }

    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      setValidationError('Only JPG or PNG screenshots are accepted.');
      setProofFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError('Screenshot must be smaller than 5MB.');
      setProofFile(null);
      return;
    }

    setValidationError(null);
    setProofFile(file);
  };

  const handleRemoveFile = () => {
    setProofFile(null);
    setProofPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirm = async () => {
    if (listingStatus === 'Vacant' && !proofText.trim() && !proofFile) {
      setValidationError('Provide a payment confirmation message or upload a screenshot before continuing.');
      return;
    }

    if (proofText.length > MAX_TEXT_LENGTH) {
      setValidationError(`Proof message must be under ${MAX_TEXT_LENGTH} characters.`);
      return;
    }

    setIsConfirming(true);
    try {
      const result = await onPaymentConfirmed({
        text: proofText.trim() || undefined,
        file: proofFile ?? undefined,
      });
      onOpenChange(false);
      resetProofState();
      const redirectTarget = result?.redirectUrl || successRedirectUrl;
      router.push(redirectTarget);
    } catch (error) {
      console.error('Failed to confirm payment', error);
      toast({
        title: 'Payment failed',
        description: 'Something went wrong while confirming payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isConfirming ? () => undefined : onOpenChange}>
      <DialogContent className="sm:max-w-lg w-full p-6">
        <div className="flex justify-end">
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close payment modal" disabled={isConfirming || isLoading}>
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>

        <DialogHeader className="space-y-3 text-left">
          <DialogTitle className="text-2xl font-semibold">Confirm Listing Payment</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Submit your payment confirmation so we can verify and publish the listing.
          </DialogDescription>
          <Link
            href="/payment-info"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-primary underline"
          >
            Read payment rules and details
          </Link>
        </DialogHeader>

        <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 sm:pr-2">
          <section className="rounded-lg border border-border/60 bg-muted/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount due</p>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-primary">{formattedAmount}</p>
                <p className="text-xs text-muted-foreground">Charged at 10% of monthly rent</p>
              </div>
              <Badge variant="secondary" className="px-3 py-1 text-xs">{paymentLabel}</Badge>
            </div>
          </section>

          <section className="rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Listing reference</p>
                <p className="mt-1 text-sm font-semibold text-foreground break-words">{reference}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                Status: {listingStatus}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border/60 p-4 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment method</p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{PAYMENT_METHOD}</Badge>
                <span className="text-muted-foreground">Pay via official till number</span>
              </div>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Till number</span>
                <span className="font-mono text-base text-primary font-semibold">{TILL_NUMBER}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Account name</span>
                <span className="font-semibold">{ACCOUNT_NAME}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Support contact</span>
                <span>{SUPPORT_CONTACT}</span>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border/60 p-4 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment proof</p>
              <p className="text-xs text-muted-foreground">
                Paste the confirmation message or upload an M-Pesa screenshot (JPG/PNG, max 5MB).
              </p>
            </div>

            <Textarea
              value={proofText}
              onChange={event => setProofText(event.target.value)}
              maxLength={MAX_TEXT_LENGTH}
              placeholder="e.g. Confirmed. QH12CD34J sent to Timelaine till 6046866 at 12:45 PM"
              className="min-h-[120px]"
              disabled={isConfirming || isLoading}
            />
            <div className="text-right text-xs text-muted-foreground">
              {proofText.length}/{MAX_TEXT_LENGTH} characters
            </div>

            <div className="space-y-3">
              <Input
                ref={fileInputRef}
                type="file"
                accept={VALID_IMAGE_TYPES.join(',')}
                onChange={handleFileChange}
                disabled={isConfirming || isLoading}
              />

              {proofFile && (
                <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/20 p-3">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 overflow-hidden text-sm">
                    <p className="truncate font-medium text-foreground">{proofFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(proofFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    aria-label="Remove screenshot"
                    disabled={isConfirming || isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {proofPreviewUrl && (
                <div className="overflow-hidden rounded-md border border-border/60 bg-black/5">
                  <div className="relative h-56 w-full">
                    <Image
                      src={proofPreviewUrl}
                      alt="Payment screenshot preview"
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-contain bg-black/80"
                      unoptimized
                    />
                  </div>
                </div>
              )}
            </div>

            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
          </section>

          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Confirm payment to publish your property.
            </div>
            <p className="text-xs text-primary/80">
              Listings marked Occupied or Available Soon publish instantly without any charges.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:flex-1"
            onClick={() => {
              resetProofState();
              onOpenChange(false);
            }}
            disabled={isConfirming || isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full sm:flex-1"
            onClick={handleConfirm}
            disabled={isConfirming || isLoading}
          >
            {isConfirming ? (
              <span className="inline-flex items-center gap-2">
                <Upload className="h-4 w-4 animate-spin" />
                Submitting…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Submit payment proof
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
