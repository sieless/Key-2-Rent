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
      case '3-4 Bedroom':
      case 'House':
        return 3000;
      default: // Bedsitter and others
        return 500; 
    }
};

export const getStatusClass = (status: Listing['status']) => {
  const base =
    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs md:text-sm font-bold uppercase tracking-wide text-white shadow-md transition-colors duration-150 ring-1 ring-offset-0';

  const normalized = status.trim().toLowerCase();

  switch (normalized) {
    case 'vacant':
      return cn(base, 'bg-green-600 hover:bg-green-700 ring-green-300/70 shadow-green-500/40');
    case 'available soon':
      return cn(base, 'bg-blue-600 hover:bg-blue-700 ring-blue-300/70 shadow-blue-500/40');
    case 'occupied':
      return cn(base, 'bg-rose-600 hover:bg-rose-700 ring-rose-300/70 shadow-rose-500/40');
    case 'for sale':
      return cn(base, 'bg-amber-500 hover:bg-amber-600 ring-amber-200/70 shadow-amber-500/40');
    default:
      return cn(base, 'bg-slate-600 hover:bg-slate-700 shadow-slate-500/40');
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
