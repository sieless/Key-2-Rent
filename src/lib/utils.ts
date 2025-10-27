import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Listing } from '@/types';
import { Bed, Building, School, Store, LucideProps } from "lucide-react";
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getSubscriptionFee = (type: string) => {
    switch (type) {
      case 'Single Room':
        return 500;
      case '1 Bedroom':
      case 'Double Room':
        return 1000;
      case '2 Bedroom':
        return 2000;
      case '3 Bedroom':
      case 'House':
        return 3000;
      default: // Bedsitter and others
        return 500; 
    }
};

export const getStatusClass = (status: Listing['status']) => {
  switch (status) {
    case 'Vacant':
      return 'bg-emerald-600 text-white hover:bg-emerald-700';
    case 'Available Soon':
      return 'bg-sky-600 text-white hover:bg-sky-700';
    case 'Occupied':
      return 'bg-rose-600 text-white hover:bg-rose-700';
    case 'For Sale':
      return 'bg-amber-500 text-white hover:bg-amber-600';
    default:
      return 'bg-gray-500 text-white hover:bg-gray-600';
  }
};

export const getPropertyIcon = (type: string, className?: string): React.ReactElement<LucideProps> => {
    const lowerType = type.toLowerCase();
    const props = { className: cn("w-4 h-4", className) };
    if (lowerType.includes('bedroom') || lowerType.includes('bedsitter') || lowerType === 'single room') {
      return React.createElement(Bed, props);
    }
     if (lowerType === 'house') {
      return React.createElement(Building, props);
    }
    if (lowerType === 'hostel') {
      return React.createElement(School, props);
    }
    if (lowerType === 'business') {
        return React.createElement(Store, props);
    }
    return React.createElement(Building, props);
  };
