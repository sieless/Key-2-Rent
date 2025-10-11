import { z } from 'zod';

/**
 * Sanitizes HTML and potentially dangerous characters from user input
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validates and sanitizes phone numbers (Kenyan format)
 */
export const phoneNumberSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(13, 'Phone number is too long')
  .regex(/^(\+?254|0)?[17]\d{8}$/, 'Invalid Kenyan phone number format')
  .transform((val) => {
    // Normalize to E.164 format
    const digits = val.replace(/\D/g, '');
    if (digits.startsWith('254')) return `+${digits}`;
    if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
    return `+254${digits}`;
  });

/**
 * Validates listing name (optional field)
 */
export const listingNameSchema = z
  .string()
  .max(100, 'Listing name too long')
  .transform(sanitizeInput)
  .optional();

/**
 * Validates business terms
 */
export const businessTermsSchema = z
  .string()
  .max(1000, 'Business terms too long (max 1000 characters)')
  .transform(sanitizeInput)
  .optional();

/**
 * Validates price and deposit amounts
 */
export const amountSchema = z
  .number()
  .int('Amount must be a whole number')
  .positive('Amount must be positive')
  .max(10000000, 'Amount is unrealistically high')
  .or(z.literal(''));

/**
 * Comprehensive listing validation schema
 */
export const listingValidationSchema = z.object({
  name: listingNameSchema,
  type: z.string().min(1, 'House type is required.'),
  location: z.string().min(1, 'Location is required.'),
  price: z.coerce.number().min(1, 'Price is required.').max(10000000, 'Price is too high'),
  deposit: z.coerce.number().optional().or(z.literal('')),
  depositMonths: z.coerce.number().optional().or(z.literal('')),
  businessTerms: businessTermsSchema,
  contact: phoneNumberSchema,
  images: z
    .any()
    .refine((files) => files?.length >= 1, 'At least one image is required.')
    .refine((files) => files?.length <= 10, 'Maximum 10 images allowed.')
    .refine(
      (files) => {
        if (!files) return true;
        return Array.from(files as File[]).every((file) => file.size <= 5 * 1024 * 1024);
      },
      'Each image must be less than 5MB'
    )
    .refine(
      (files) => {
        if (!files) return true;
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        return Array.from(files as File[]).every((file) => validTypes.includes(file.type));
      },
      'Only JPEG, PNG, and WebP images are allowed'
    ),
  features: z.array(z.string()).optional(),
  totalUnits: z.coerce.number().min(1, 'Total units must be at least 1'),
  availableUnits: z.coerce.number().min(0, 'Available units cannot be negative'),
}).refine((data) => data.availableUnits <= data.totalUnits, {
  message: 'Available units cannot exceed total units.',
  path: ['availableUnits'],
});
