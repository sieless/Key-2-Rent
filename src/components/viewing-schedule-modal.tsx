/**
 * Viewing Schedule Modal
 * Request property viewing appointment
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
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Listing } from '@/types';

interface ViewingScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing;
  landlordName?: string;
}

export function ViewingScheduleModal({
  open,
  onOpenChange,
  listing,
  landlordName,
}: ViewingScheduleModalProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    preferredDate: '',
    preferredTime: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !db) {
      toast({
        title: 'Not logged in',
        description: 'Please log in to request a viewing',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Combine date and time
      const requestedDateTime = new Date(`${formData.preferredDate}T${formData.preferredTime}`);

      const viewingData = {
        listingId: listing.id,
        listingTitle: listing.name || `${listing.type} in ${listing.location}`,
        tenantId: user.uid,
        tenantName: formData.name,
        tenantEmail: formData.email,
        tenantPhone: formData.phone,
        landlordId: listing.userId,
        landlordName: landlordName || 'Landlord',
        requestedDate: requestedDateTime,
        status: 'PENDING',
        notes: formData.notes,
        createdAt: serverTimestamp(),
      };

      const firestore = db;
      await addDoc(collection(firestore, 'viewings'), viewingData);

      toast({
        title: 'Viewing request sent',
        description: 'The landlord will be notified and will respond soon',
      });

      onOpenChange(false);

      // Reset form
      setFormData({
        name: user?.displayName || '',
        email: user?.email || '',
        phone: '',
        preferredDate: '',
        preferredTime: '',
        notes: '',
      });
    } catch (error: any) {
      console.error('Error requesting viewing:', error);
      toast({
        title: 'Failed to send request',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Request Viewing
          </DialogTitle>
          <DialogDescription>
            Schedule a viewing for {listing.name || `${listing.type} in ${listing.location}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="254712345678"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Preferred Date *</Label>
                <Input
                  id="date"
                  type="date"
                  min={minDate}
                  value={formData.preferredDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferredDate: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Preferred Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.preferredTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferredTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any specific requirements or questions..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
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
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
