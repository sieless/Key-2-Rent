'use client';
import { Card } from '@/components/ui/card';
import { houseTypes } from '@/lib/constants';
import { Bed, Building, School, Store, Tag } from 'lucide-react';

type RentalTypesProps = {
  onTypeSelect: (type: string) => void;
  onStatusSelect?: (status: string) => void;
  selectedType: string;
  selectedStatus?: string;
};

export function RentalTypes({ onTypeSelect, onStatusSelect, selectedType, selectedStatus }: RentalTypesProps) {
  const getPropertyIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('bedroom') || lowerType.includes('bedsitter') || lowerType === 'single room') {
      return <Bed className="w-8 h-8 mb-2" />;
    }
     if (lowerType === 'house') {
      return <Building className="w-8 h-8 mb-2" />;
    }
    if (lowerType === 'hostel') {
      return <School className="w-8 h-8 mb-2" />;
    }
    if (lowerType === 'business') {
        return <Store className="w-8 h-8 mb-2" />;
    }
    // Default Icon
    return <Building className="w-8 h-8 mb-2" />;
  };
  
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-foreground mb-4">
        Browse by Category
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {houseTypes.map(type => (
          <Card
            key={type}
            className={`p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
              selectedType === type
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-card hover:bg-muted'
            }`}
            onClick={() => onTypeSelect(type)}
          >
            {getPropertyIcon(type)}
            <p className="font-semibold">{type}</p>
          </Card>
        ))}
        {onStatusSelect && (
          <Card
            key="for-sale"
            className={`p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
              selectedStatus === 'For Sale'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-card hover:bg-muted'
            }`}
            onClick={() => onStatusSelect(selectedStatus === 'For Sale' ? 'All' : 'For Sale')}
          >
            <Tag className="w-8 h-8 mb-2" />
            <p className="font-semibold">For Sale</p>
          </Card>
        )}
      </div>
    </div>
  );
}
