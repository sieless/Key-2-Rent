'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { analyzeListingImage } from '@/app/actions';
import { ImageUpload } from '@/components/image-upload';
import { useCurrentUserProfile } from '@/hooks/use-user-profile';
import { getVacancyPaymentAmount } from '@/lib/vacancy-payments';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { houseTypes, locations, allFeatureOptions } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Textarea } from './ui/textarea';

const KENYA_PHONE_REGEX = /^\+254\d{9}$/;

const formatKenyanPhoneNumber = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const digits = trimmed.replace(/[^0-9]/g, '');
  if (!digits) return trimmed;

  if (digits.startsWith('254') && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `+254${digits}`;
  }

  if (trimmed.startsWith('+254') && digits.length === 12) {
    return `+${digits}`;
  }

  return trimmed;
};


const listingSchema = z.object({
  name: z.string().optional(),
  type: z.string().min(1, 'House type is required.'),
  location: z.string().min(1, 'Location is required.'),
  locationDescription: z
    .string()
    .max(200, 'Location description should be under 200 characters.')
    .optional()
    .or(z.literal('')),
  price: z.coerce.number().min(1, 'Price is required.'),
  deposit: z.coerce.number().optional().or(z.literal('')),
  depositMonths: z.coerce.number().optional().or(z.literal('')),
  businessTerms: z.string().optional(),
  contact: z
    .string()
    .min(10, 'A valid contact number is required.')
    .transform(formatKenyanPhoneNumber)
    .refine(value => KENYA_PHONE_REGEX.test(value), {
      message: 'Enter a Kenyan phone number in the format +2547XXXXXXXX.',
    }),
  images: z.array(z.string()).default([]),
  features: z.array(z.string()).optional(),
  status: z.enum(['Vacant', 'Occupied', 'Available Soon'], {
    required_error: 'Please select the availability status.',
  }),
  totalUnits: z.coerce.number().min(1, 'Total units must be at least 1.'),
  availableUnits: z.coerce.number().min(0, 'Available units cannot be negative.'),
}).refine((data) => {
  if (Number.isNaN(data.totalUnits) || Number.isNaN(data.availableUnits)) return true;
  return data.availableUnits <= data.totalUnits;
}, {
  message: 'Available units cannot exceed total units.',
  path: ['availableUnits'],
});

type AddListingModalProps = {
  isOpen?: boolean;
  onClose?: () => void;
  renderInline?: boolean;
};

type ListingData = z.infer<typeof listingSchema>;

export function AddListingModal({ isOpen = false, onClose, renderInline = false }: AddListingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, startTransition] = useTransition();
  const [analysisResult, setAnalysisResult] = useState<{
    suggestedTags: string[];
    suggestedImprovements: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyzedImageIndex, setAnalyzedImageIndex] = useState<number | null>(null);
  const [featureOptions, setFeatureOptions] = useState(allFeatureOptions.residential);


  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();
  const { profile } = useCurrentUserProfile();
  const safeOnClose = onClose ?? (() => {});

  const form = useForm<ListingData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      name: '',
      type: 'Bedsitter',
      location: 'Machakos Town',
      locationDescription: '',
      price: 5000,
      contact: '',
      features: [],
      images: [],
      deposit: '',
      depositMonths: '',
      businessTerms: '',
      status: 'Available Soon',
      totalUnits: 1,
      availableUnits: 1,
    },
  });
  
  const selectedType = form.watch('type');

  useEffect(() => {
    if (selectedType === 'Business') {
      setFeatureOptions(allFeatureOptions.business);
    } else {
      setFeatureOptions(allFeatureOptions.residential);
    }
    // Reset features when type changes
    form.setValue('features', []);
  }, [selectedType, form]);


  const imageUrls = form.watch('images') || [];


  const handleAnalyzeImage = async (imageUrl: string, index: number) => {
    setAnalysisError(null);
    setAnalysisResult(null);
    setAnalyzedImageIndex(index);

    const formData = new FormData();
    formData.append('image', imageUrl);

    startTransition(async () => {
      const result = await analyzeListingImage(formData);
      if (result.error) {
        setAnalysisError(result.error);
      } else if (result.analysis) {
        setAnalysisResult(result.analysis);
      }
    });
  };

  const onSubmit = async (data: ListingData) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'You must be logged in to create a listing.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const listingPayload: Record<string, unknown> = {
        ...data,
        userId: user.uid,
        createdAt: serverTimestamp(),
      };

      if (!listingPayload.name) delete listingPayload.name;
      if (!listingPayload.businessTerms) delete listingPayload.businessTerms;

      if (typeof listingPayload.locationDescription === 'string') {
        const trimmed = listingPayload.locationDescription.trim();
        if (trimmed) {
          listingPayload.locationDescription = trimmed;
        } else {
          delete listingPayload.locationDescription;
        }
      }

      const fieldsToProcessAsNumbers: Array<keyof ListingData> = ['price', 'deposit', 'depositMonths', 'totalUnits', 'availableUnits'];
      fieldsToProcessAsNumbers.forEach(field => {
        const value = listingPayload[field];
        if (value === '' || value === undefined || value === null) {
          delete listingPayload[field];
          return;
        }

        const numericValue = Number(value);
        if (Number.isNaN(numericValue)) {
          delete listingPayload[field];
          return;
        }

        listingPayload[field] = numericValue;
      });

      const isVacant = data.status === 'Vacant';
      const priceValue = typeof listingPayload.price === 'number' ? listingPayload.price : Number(listingPayload.price ?? 0);
      const computedAmount = isVacant ? getVacancyPaymentAmount(priceValue) : null;

      listingPayload.approvalStatus = 'auto';
      listingPayload.visibilityStatus = isVacant ? 'hidden' : 'visible';
      listingPayload.paymentStatus = isVacant ? 'pending' : 'paid';
      listingPayload.paymentMode = isVacant ? '10% Monthly Rent' : null;
      listingPayload.amountDue = isVacant ? computedAmount : null;
      listingPayload.proofUploadUrl = null;
      listingPayload.confirmationText = null;

      if (!db) {
        throw new Error('Database unavailable');
      }

      const listingRef = await addDoc(collection(db, 'listings'), listingPayload);

      const userRef = doc(db, 'users', user.uid);
      updateDocumentNonBlocking(userRef, { listings: arrayUnion(listingRef.id) });

      toast({
        title: isVacant ? 'Listing created - payment required' : 'Success!',
        description: isVacant
          ? 'Head to the payment steps to get your property live.'
          : 'Your listing is live for renters to view!',
      });

      form.reset();
      safeOnClose();
    } catch (error) {
      console.error('Error adding document: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Failed to create listing. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rental Name (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Gilgal Apartments"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type of House</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a house type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {houseTypes
                              .filter(t => t !== 'All')
                              .map(type => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location / Estate</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations
                              .filter(l => l !== 'All')
                              .map(loc => (
                                <SelectItem key={loc} value={loc}>
                                  {loc}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="locationDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g. Kenya Israel opposite T-Tot Gardens"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-muted-foreground">
                        Give renters a simple landmark or directions to find the property easily.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Availability</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property availability" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Vacant">Vacant</SelectItem>
                          <SelectItem value="Occupied">Occupied</SelectItem>
                          <SelectItem value="Available Soon">Available Soon</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs text-muted-foreground">
                        Vacant listings require proof of payment before they appear publicly.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rent per Month (Ksh)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 8500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            inputMode="tel"
                            placeholder="e.g. +254712345678"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground">
                          Must include the Kenyan country code, for example +254712345678.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                 
                 {selectedType === 'Business' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="deposit"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Goodwill/Deposit (Ksh)</FormLabel>
                                <FormControl>
                                <Input
                                    type="number"
                                    placeholder="e.g. 50000"
                                    {...field}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="depositMonths"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Deposit in Months (Optional)</FormLabel>
                                <FormControl>
                                <Input
                                    type="number"
                                    placeholder="e.g. 2"
                                    {...field}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                 )}

                 {selectedType !== 'Business' && (
                    <FormField
                        control={form.control}
                        name="deposit"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Rent Deposit (Ksh, Optional)</FormLabel>
                            <FormControl>
                            <Input
                                type="number"
                                placeholder="e.g. 8500"
                                {...field}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                 )}
                 
                 {selectedType === 'Business' && (
                    <FormField
                        control={form.control}
                        name="businessTerms"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Business Terms (Optional)</FormLabel>
                            <FormControl>
                            <Textarea
                                placeholder="Describe business-specific terms, e.g., 'Goodwill is non-refundable', 'Lease period is 5 years minimum'."
                                {...field}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                 )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="totalUnits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Units (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1"
                            min="1"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          For multi-unit properties (apartments, hostels). Leave as 1 for single units.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="availableUnits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Units (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1"
                            min="0"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          How many units are currently available for rent?
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="images"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Images</FormLabel>
                      <FormControl>
                        <ImageUpload
                          images={field.value || []}
                          onChange={field.onChange}
                          maxImages={10}
                        />
                      </FormControl>
                      <FormMessage />
                      {imageUrls.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => handleAnalyzeImage(imageUrls[0], 0)}
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Wand2 className="mr-2 h-4 w-4" />
                          )}
                          Analyze First Image with AI
                        </Button>
                      )}
                    </FormItem>
                  )}
                />

                {(isAnalyzing || analysisResult || analysisError) && (
                  <Alert
                    variant={analysisError ? 'destructive' : 'default'}
                    className="bg-muted/50"
                  >
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle>
                      {isAnalyzing
                        ? 'Analyzing...'
                        : analysisError
                        ? 'Analysis Failed'
                        : 'AI Suggestions'}
                    </AlertTitle>
                    <AlertDescription>
                      {isAnalyzing &&
                        'Our AI is looking at your image. Please wait a moment.'}
                      {analysisError && analysisError}
                      {analysisResult && (
                        <div className="space-y-3">
                          <p>{analysisResult.suggestedImprovements}</p>
                          <p className="font-semibold">Suggested Tags:</p>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.suggestedTags.map(tag => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => {
                                  const currentFeatures =
                                    form.getValues('features') || [];
                                  if (
                                    !currentFeatures.includes(tag) &&
                                    featureOptions.includes(tag)
                                  ) {
                                    form.setValue('features', [
                                      ...currentFeatures,
                                      tag,
                                    ]);
                                  }
                                }}
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="features"
                  render={() => (
                    <FormItem>
                      <FormLabel>Features (Select all that apply)</FormLabel>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {featureOptions.map(item => (
                          <FormField
                            key={item}
                            control={form.control}
                            name="features"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={checked =>
                                      checked
                                        ? field.onChange([...(field.value || []), item])
                                        : field.onChange((field.value || []).filter(value => value !== item))
                                    }
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">{item}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
        <div className="pt-6 mt-6 border-t -mb-6 pb-6 -mx-6 px-6 bg-background sticky bottom-0 z-10 flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
          {renderInline ? null : (
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                Cancel
              </Button>
            </DialogClose>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Post Listing'}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (renderInline) {
    return (
      <div className="max-w-4xl mx-auto w-full">
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-2xl font-bold">Create a New Listing</h2>
            <p className="text-sm text-muted-foreground">
              Listings marked Vacant will guide you through payment proof before going live.
            </p>
          </div>
          <div className="max-h-[80vh] overflow-y-auto px-6 py-6">{formContent}</div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={safeOnClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col" onInteractOutside={event => event.preventDefault()}>
        <DialogHeader className="pr-6">
          <DialogTitle className="text-2xl font-bold">Add a New Rental Property</DialogTitle>
          <DialogDescription>Fill in the details below to post your property.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-6 pl-6 -mr-6">{formContent}</div>
      </DialogContent>
    </Dialog>
  );
}
