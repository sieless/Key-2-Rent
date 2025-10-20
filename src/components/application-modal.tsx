/**
 * Property Application Modal
 * Submit rental application
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Loader2, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Listing } from '@/types';

interface ApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing;
  landlordName?: string;
}

export function ApplicationModal({
  open,
  onOpenChange,
  listing,
  landlordName,
}: ApplicationModalProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    idNumber: '',
    employmentStatus: 'EMPLOYED' as const,
    employer: '',
    position: '',
    monthlyIncome: '',
    moveInDate: '',
    additionalInfo: '',
  });

  const [references, setReferences] = useState([
    { name: '', relationship: '', phone: '' },
  ]);

  const [submitting, setSubmitting] = useState(false);

  const addReference = () => {
    if (references.length < 3) {
      setReferences([...references, { name: '', relationship: '', phone: '' }]);
    }
  };

  const removeReference = (index: number) => {
    setReferences(references.filter((_, i) => i !== index));
  };

  const updateReference = (index: number, field: string, value: string) => {
    const updated = [...references];
    updated[index] = { ...updated[index], [field]: value };
    setReferences(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Not logged in',
        description: 'Please log in to submit an application',
        variant: 'destructive',
      });
      return;
    }

    // Validate at least one reference
    const validReferences = references.filter(ref => ref.name && ref.phone);
    if (validReferences.length === 0) {
      toast({
        title: 'Missing references',
        description: 'Please provide at least one reference',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const applicationData = {
        listingId: listing.id,
        listingTitle: listing.name || `${listing.type} in ${listing.location}`,
        listingPrice: listing.price,
        tenantId: user.uid,
        tenantName: formData.name,
        tenantEmail: formData.email,
        tenantPhone: formData.phone,
        landlordId: listing.userId,
        idNumber: formData.idNumber,
        employment: {
          status: formData.employmentStatus,
          employer: formData.employer || undefined,
          position: formData.position || undefined,
          monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : undefined,
        },
        references: validReferences,
        moveInDate: new Date(formData.moveInDate),
        additionalInfo: formData.additionalInfo || undefined,
        status: 'PENDING',
        createdAt: serverTimestamp(),
      };

      if (!db) {
        throw new Error('Database unavailable');
      }

      await addDoc(collection(db, 'applications'), applicationData);

      toast({
        title: 'Application submitted',
        description: 'The landlord will review your application and respond soon',
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Failed to submit application',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const minMoveInDate = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Apply for Property
          </DialogTitle>
          <DialogDescription>
            Submit your application for {listing.name || `${listing.type} in ${listing.location}`} - KES {listing.price.toLocaleString()}/month
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Personal Information</h3>

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
                  <Label htmlFor="idNumber">National ID *</Label>
                  <Input
                    id="idNumber"
                    value={formData.idNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
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
            </div>

            {/* Employment Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Employment Information</h3>

              <div className="space-y-2">
                <Label htmlFor="employmentStatus">Employment Status *</Label>
                <Select
                  value={formData.employmentStatus}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, employmentStatus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYED">Employed</SelectItem>
                    <SelectItem value="SELF_EMPLOYED">Self-Employed</SelectItem>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.employmentStatus === 'EMPLOYED' || formData.employmentStatus === 'SELF_EMPLOYED') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employer">Employer/Business</Label>
                    <Input
                      id="employer"
                      value={formData.employer}
                      onChange={(e) => setFormData(prev => ({ ...prev, employer: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Position/Role</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="monthlyIncome">Monthly Income (KES, optional)</Label>
                <Input
                  id="monthlyIncome"
                  type="number"
                  value={formData.monthlyIncome}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthlyIncome: e.target.value }))}
                />
              </div>
            </div>

            {/* References */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">References (At least 1 required)</h3>
                {references.length < 3 && (
                  <Button type="button" variant="outline" size="sm" onClick={addReference}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Reference
                  </Button>
                )}
              </div>

              {references.map((ref, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Reference {index + 1}</span>
                    {references.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReference(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      placeholder="Name *"
                      value={ref.name}
                      onChange={(e) => updateReference(index, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="Relationship *"
                      value={ref.relationship}
                      onChange={(e) => updateReference(index, 'relationship', e.target.value)}
                    />
                    <Input
                      placeholder="Phone *"
                      value={ref.phone}
                      onChange={(e) => updateReference(index, 'phone', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Move-in Date */}
            <div className="space-y-2">
              <Label htmlFor="moveInDate">Desired Move-in Date *</Label>
              <Input
                id="moveInDate"
                type="date"
                min={minMoveInDate}
                value={formData.moveInDate}
                onChange={(e) => setFormData(prev => ({ ...prev, moveInDate: e.target.value }))}
                required
              />
            </div>

            {/* Additional Info */}
            <div className="space-y-2">
              <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
              <Textarea
                id="additionalInfo"
                placeholder="Any additional information you'd like to share..."
                value={formData.additionalInfo}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
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
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
