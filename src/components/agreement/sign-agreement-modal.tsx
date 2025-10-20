/**
 * Sign Agreement Modal
 * Digital signature collection for rental agreements
 */

'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileSignature, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SignaturePad } from './signature-pad';
import type { Listing } from '@/types';

interface SignAgreementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing;
  agreementUrl: string;
  landlordName?: string;
}

export function SignAgreementModal({
  open,
  onOpenChange,
  listing,
  agreementUrl,
  landlordName,
}: SignAgreementModalProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [tenantFormData, setTenantFormData] = useState({
    fullName: user?.displayName || '',
    idNumber: '',
    phone: '',
    email: user?.email || '',
  });

  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Not logged in',
        description: 'Please log in to sign the agreement',
        variant: 'destructive',
      });
      return;
    }

    if (!signatureDataUrl) {
      toast({
        title: 'Signature required',
        description: 'Please draw your signature',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Convert data URL to blob
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();

      // Upload signature image to Cloudinary
      const formData = new FormData();
      formData.append('image', blob, 'signature.png');

      const uploadResponse = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload signature');
      }

      const { url: signatureUrl } = await uploadResponse.json();

      // Create signed agreement record
      const signedAgreementData = {
        listingId: listing.id,
        listingTitle: listing.name || `${listing.type} in ${listing.location}`,
        listingPrice: listing.price,
        landlordId: listing.userId,
        landlordName: landlordName || 'Landlord',
        tenantId: user.uid,
        tenantName: tenantFormData.fullName,
        tenantDetails: {
          fullName: tenantFormData.fullName,
          idNumber: tenantFormData.idNumber,
          phone: tenantFormData.phone,
          email: tenantFormData.email,
          signatureUrl,
        },
        originalAgreementUrl: agreementUrl,
        signedAgreementUrl: agreementUrl, // In production, generate PDF with signature
        signedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

      if (!db) {
        throw new Error('Database unavailable');
      }

      await addDoc(collection(db, 'signedAgreements'), signedAgreementData);

      toast({
        title: 'Agreement signed',
        description: 'Your signed agreement has been saved successfully',
      });

      onOpenChange(false);

      // Reset form
      setTenantFormData({
        fullName: user?.displayName || '',
        idNumber: '',
        phone: '',
        email: user?.email || '',
      });
      setSignatureDataUrl(null);
    } catch (error: any) {
      console.error('Error signing agreement:', error);
      toast({
        title: 'Failed to sign agreement',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Sign Rental Agreement
          </DialogTitle>
          <DialogDescription>
            Review and sign the rental agreement for {listing.name || `${listing.type} in ${listing.location}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please review the agreement carefully before signing. Your digital signature is legally binding.
              </AlertDescription>
            </Alert>

            {/* Agreement Preview */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Agreement Document</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(agreementUrl, '_blank')}
                >
                  View PDF
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click "View PDF" to review the full agreement before signing
              </p>
            </div>

            {/* Tenant Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Your Details</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Legal Name *</Label>
                  <Input
                    id="fullName"
                    value={tenantFormData.fullName}
                    onChange={(e) => setTenantFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idNumber">National ID *</Label>
                  <Input
                    id="idNumber"
                    value={tenantFormData.idNumber}
                    onChange={(e) => setTenantFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="254712345678"
                    value={tenantFormData.phone}
                    onChange={(e) => setTenantFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={tenantFormData.email}
                    onChange={(e) => setTenantFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Signature */}
            <div className="space-y-2">
              <Label>Digital Signature *</Label>
              <SignaturePad onSignatureChange={setSignatureDataUrl} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !signatureDataUrl}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <FileSignature className="mr-2 h-4 w-4" />
                  Sign Agreement
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
