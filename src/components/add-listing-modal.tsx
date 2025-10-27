'use client';

import { useState, useTransition, useEffect, useRef, useMemo } from 'react';
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
import type { Listing } from '@/types';

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
  status: z.enum(['Vacant', 'Occupied', 'Available Soon', 'For Sale'], {
    required_error: 'Please select the availability status.',
  }),
  salePrice: z.coerce.number().optional().or(z.literal('')),
  totalUnits: z.coerce.number().min(1, 'Total units must be at least 1.'),
  availableUnits: z.coerce.number().min(0, 'Available units cannot be negative.'),
}).refine((data) => {
  if (Number.isNaN(data.totalUnits) || Number.isNaN(data.availableUnits)) return true;
  return data.availableUnits <= data.totalUnits;
}, {
  message: 'Available units cannot exceed total units.',
  path: ['availableUnits'],
}).refine((data) => {
  if (data.status === 'For Sale') {
    const numericSalePrice = Number(data.salePrice);
    return !Number.isNaN(numericSalePrice) && numericSalePrice > 0;
  }
  return true;
}, {
  message: 'Sale price is required and must be greater than 0 for properties on sale.',
  path: ['salePrice'],
});

type AddListingModalProps = {
  isOpen?: boolean;
  onClose?: () => void;
  renderInline?: boolean;
  mode?: 'create' | 'edit';
  listing?: Listing | null;
};

type ListingData = z.infer<typeof listingSchema>;

const createDefaultListingValues = (): ListingData => ({
  name: '',
  type: 'Bedsitter',
  location: 'Machakos Town',
  locationDescription: '',
  price: 5000,
  salePrice: '',
  deposit: '',
  depositMonths: '',
  businessTerms: '',
  contact: '',
  images: [],
  features: [],
  status: 'Available Soon',
  totalUnits: 1,
  availableUnits: 1,
});

const mapListingToFormValues = (item: Listing): ListingData => ({
  name: item.name ?? '',
  type: item.type,
  location: item.location,
  locationDescription: item.locationDescription ?? '',
  price: item.price,
  salePrice: typeof item.salePrice === 'number' ? item.salePrice : '',
  deposit: typeof item.deposit === 'number' ? item.deposit : '',
  depositMonths: typeof item.depositMonths === 'number' ? item.depositMonths : '',
  businessTerms: item.businessTerms ?? '',
  contact: item.contact,
  images: Array.isArray(item.images) ? [...item.images] : [],
  features: Array.isArray(item.features) ? [...item.features] : [],
  status: item.status,
  totalUnits: typeof item.totalUnits === 'number' ? item.totalUnits : 1,
  availableUnits: typeof item.availableUnits === 'number' ? item.availableUnits : 0,
});

export function AddListingModal({
  isOpen = false,
  onClose,
  renderInline = false,
  mode = 'create',
  listing = null,
}: AddListingModalProps) {
  const isEditMode = mode === 'edit' && Boolean(listing);
  const initialValues = useMemo<ListingData>(() => {
    if (isEditMode && listing) {
      return mapListingToFormValues(listing);
    }
    return createDefaultListingValues();
  }, [isEditMode, listing]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, startTransition] = useTransition();
  const [analysisResult, setAnalysisResult] = useState<{
    suggestedTags: string[];
    suggestedImprovements: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [featureOptions, setFeatureOptions] = useState(allFeatureOptions.residential);
  const previousTypeRef = useRef<string | null>(null);
  const previousStatusRef = useRef<string | null>(null);


  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();
  const safeOnClose = onClose ?? (() => {});

  const form = useForm<ListingData>({
    resolver: zodResolver(listingSchema),
    defaultValues: initialValues,
  });
  
  const selectedType = form.watch('type');
  const selectedStatus = form.watch('status');
  const salePriceValue = form.watch('salePrice');

  useEffect(() => {
    if (!renderInline && !isOpen) {
      return;
    }
    form.reset(initialValues);
    const nextOptions = initialValues.type === 'Business'
      ? allFeatureOptions.business
      : allFeatureOptions.residential;
    setFeatureOptions(nextOptions);
    previousTypeRef.current = initialValues.type;
    previousStatusRef.current = initialValues.status;
    setAnalysisResult(null);
    setAnalysisError(null);
  }, [initialValues, form, isOpen, renderInline]);

  useEffect(() => {
    const nextOptions = selectedType === 'Business'
      ? allFeatureOptions.business
      : allFeatureOptions.residential;
    setFeatureOptions(nextOptions);

    const previousType = previousTypeRef.current;
    if (previousType && previousType !== selectedType) {
      form.setValue('features', []);
    }
    previousTypeRef.current = selectedType;
  }, [selectedType, form]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    if (previousStatus === 'For Sale' && selectedStatus !== 'For Sale') {
      form.setValue('salePrice', '', { shouldValidate: false });
    }
    previousStatusRef.current = selectedStatus;
  }, [selectedStatus, form]);

  useEffect(() => {
    if (selectedStatus === 'For Sale') {
      const numericSalePrice = Number(salePriceValue);
      if (!Number.isNaN(numericSalePrice) && numericSalePrice > 0) {
        form.setValue('price', numericSalePrice, { shouldValidate: false });
      }
    }
  }, [selectedStatus, salePriceValue, form]);


  const imageUrls = form.watch('images') || [];


  const handleAnalyzeImage = async (imageUrl: string) => {
    setAnalysisError(null);
    setAnalysisResult(null);

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
        description: 'You must be logged in to manage listings.',
      });
      return;
    }

    if (!db) {
      toast({
        variant: 'destructive',
        title: 'Database unavailable',
        description: 'Please try again in a moment.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        ...data,
        features: Array.isArray(data.features) ? [...data.features] : [],
        images: Array.isArray(data.images) ? [...data.images] : [],
      };

      const optionalTextFields: Array<keyof ListingData> = ['name', 'businessTerms', 'locationDescription'];
      optionalTextFields.forEach(field => {
        const value = payload[field];
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed) {
            payload[field] = trimmed;
          } else {
            delete payload[field];
          }
        }
      });

      const numericFields: Array<keyof ListingData> = ['price', 'deposit', 'depositMonths', 'totalUnits', 'availableUnits'];

      if (data.status === 'For Sale') {
        const salePriceValue = payload.salePrice;
        if (salePriceValue === '' || salePriceValue === null || salePriceValue === undefined) {
          delete payload.salePrice;
        } else {
          const numericSalePrice = Number(salePriceValue);
          if (Number.isNaN(numericSalePrice) || numericSalePrice <= 0) {
            delete payload.salePrice;
          } else {
            payload.salePrice = numericSalePrice;
            payload.price = numericSalePrice;
          }
        }
      } else {
        delete payload.salePrice;
      }

      numericFields.forEach(field => {
        const value = payload[field];
        if (value === '' || value === undefined || value === null) {
          delete payload[field];
          return;
        }

        const numericValue = Number(value);
        if (Number.isNaN(numericValue)) {
          delete payload[field];
          return;
        }

        payload[field] = numericValue;
      });

      if (isEditMode && listing) {
        if (data.status === 'For Sale') {
          payload.visibilityStatus = 'visible';
          payload.approvalStatus = 'auto';
          payload.paymentStatus = null;
          payload.paymentMode = null;
          payload.amountDue = null;
        }

        payload.updatedAt = serverTimestamp();

        await updateDoc(doc(db, 'listings', listing.id), payload as Partial<Listing>);

        toast({
          title: 'Listing updated',
          description: 'Your changes have been saved.',
        });
        safeOnClose();
        return;
      }

      payload.userId = user.uid;
      payload.createdAt = serverTimestamp();

      const isVacant = data.status === 'Vacant';
      const isForSale = data.status === 'For Sale';
      const priceValue = typeof payload.price === 'number' ? payload.price : Number(payload.price ?? 0);
      const computedAmount = isVacant ? getVacancyPaymentAmount(priceValue) : null;

      payload.approvalStatus = 'auto';
      payload.visibilityStatus = isVacant ? 'hidden' : 'visible';
      payload.paymentStatus = isVacant ? 'pending' : 'paid';
      payload.paymentMode = isVacant ? '10% Monthly Rent' : null;
      payload.amountDue = isVacant ? computedAmount : null;
      payload.proofUploadUrl = null;
      payload.confirmationText = null;

      if (isForSale) {
        payload.visibilityStatus = 'visible';
        payload.paymentStatus = null;
        payload.paymentMode = null;
        payload.amountDue = null;
      }

      const listingRef = await addDoc(collection(db, 'listings'), payload);

      const userRef = doc(db, 'users', user.uid);
      updateDocumentNonBlocking(userRef, { listings: arrayUnion(listingRef.id) });

      toast({
        title: isVacant ? 'Listing created - payment required' : 'Listing published',
        description: isVacant
          ? 'Head to the payment steps to get your property live.'
          : 'Your listing is live for renters to view!',
      });

      form.reset(createDefaultListingValues());
      safeOnClose();
    } catch (error) {
      console.error('Error saving listing: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Failed to save listing. Please try again.',
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
                          <SelectItem value="For Sale">For Sale</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs text-muted-foreground">
                        {selectedStatus === 'Vacant'
                          ? 'Vacant listings require proof of payment before they appear publicly.'
                          : selectedStatus === 'For Sale'
                          ? 'Buyers will see this property as available for purchase at the sale price you set.'
                          : 'Choose the current availability of the property.'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedStatus === 'For Sale' && (
                  <FormField
                    control={form.control}
                    name="salePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sale Price (Ksh)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="e.g. 2500000"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground">
                          Enter the one-off purchase price for buyers.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {selectedStatus === 'For Sale' ? 'Sale Price (auto)' : 'Rent per Month (Ksh)'}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 8500"
                            disabled={selectedStatus === 'For Sale'}
                            {...field}
                          />
                        </FormControl>
                        {selectedStatus === 'For Sale' ? (
                          <FormDescription className="text-xs text-muted-foreground">
                            Automatically synced from the sale price above.
                          </FormDescription>
                        ) : null}
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
                 
                 {selectedStatus !== 'For Sale' && selectedType === 'Business' && (
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

                 {selectedStatus !== 'For Sale' && selectedType !== 'Business' && (
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
                          onClick={() => handleAnalyzeImage(imageUrls[0])}
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
