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

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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


const listingSchema = z.object({
  name: z.string().optional(),
  type: z.string().min(1, 'House type is required.'),
  location: z.string().min(1, 'Location is required.'),
  price: z.coerce.number().min(1, 'Price is required.'),
  deposit: z.coerce.number().optional().or(z.literal('')),
  depositMonths: z.coerce.number().optional().or(z.literal('')),
  businessTerms: z.string().optional(),
  contact: z.string().min(10, 'A valid contact number is required.'),
  images: z
    .array(z.string())
    .min(1, 'At least one image is required.'),
  features: z.array(z.string()).optional(),
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
  isOpen: boolean;
  onClose: () => void;
};

type ListingData = z.infer<typeof listingSchema>;

export function AddListingModal({ isOpen, onClose }: AddListingModalProps) {
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

  const form = useForm<ListingData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      name: '',
      type: 'Bedsitter',
      location: 'Machakos Town',
      price: 5000,
      contact: '',
      features: [],
      images: [],
      deposit: '',
      depositMonths: '',
      businessTerms: '',
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
      const listingPayload: any = {
        ...data,
        userId: user.uid,
        createdAt: serverTimestamp(),
        status: 'pending_approval',
      };

      if (!listingPayload.name) delete listingPayload.name;
      if (!listingPayload.businessTerms) delete listingPayload.businessTerms;

      const fieldsToProcessAsNumbers = ['price', 'deposit', 'depositMonths', 'totalUnits', 'availableUnits'];
      fieldsToProcessAsNumbers.forEach(field => {
        if (listingPayload[field] === '' || listingPayload[field] === undefined || isNaN(listingPayload[field])) {
            delete listingPayload[field];
        } else {
            listingPayload[field] = Number(listingPayload[field]);
        }
      });

      const docRef = await addDoc(collection(db, 'listings'), listingPayload);

      const userRef = doc(db, 'users', user.uid);
      updateDocumentNonBlocking(userRef, { listings: arrayUnion(docRef.id) });

      toast({
        title: 'Success!',
        description: 'Your listing has been created successfully!',
      });

      form.reset();
      onClose();
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pr-6">
            <DialogTitle className="text-2xl font-bold">
              Add a New Rental Property
            </DialogTitle>
            <DialogDescription>
              Fill in the details below to post your property.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-6 pl-6 -mr-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
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
                            placeholder="e.g. 0712345678"
                            {...field}
                          />
                        </FormControl>
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
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={item}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item)}
                                      onCheckedChange={checked => {
                                        return checked
                                          ? field.onChange([
                                              ...(field.value || []),
                                              item,
                                            ])
                                          : field.onChange(
                                              (field.value || []).filter(
                                                value => value !== item
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {item}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-6 mt-6 border-t -mb-6 pb-6 -mx-6 px-6 bg-background sticky bottom-0 z-10">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : 'Post Listing'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
      
    </>
  );
}
