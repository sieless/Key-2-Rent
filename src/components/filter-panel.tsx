"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { houseTypes, locations } from "@/lib/constants";

const locationOptions = ['All', ...locations.filter((loc) => loc !== 'All Counties')];

type FilterPanelProps = {
  filters: {
    location: string;
    type: string;
    maxPrice: number;
    status: string;
  };
  onFilterChange: (name: string, value: string | number) => void;
};

const statusOptions = [
  { value: 'All', label: 'All' },
  { value: 'Vacant', label: 'Vacant' },
  { value: 'Occupied', label: 'Occupied' },
  { value: 'Available Soon', label: 'Available Soon' },
  { value: 'For Sale', label: 'For Sale' },
];

export function FilterPanel({ filters, onFilterChange }: FilterPanelProps) {
  return (
    <div className="bg-card p-6 rounded-xl shadow-lg mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <Label htmlFor="location" className="block text-sm font-medium text-foreground mb-1">
            Location / Estate
          </Label>
          <Select
            name="location"
            value={filters.location}
            onValueChange={(value) => onFilterChange("location", value)}
          >
            <SelectTrigger id="location" className="w-full">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locationOptions.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc === 'All' ? 'All Locations' : loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="type" className="block text-sm font-medium text-foreground mb-1">
            Type of House
          </Label>
          <Select
            name="type"
            value={filters.type}
            onValueChange={(value) => onFilterChange("type", value)}
          >
            <SelectTrigger id="type" className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {houseTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status" className="block text-sm font-medium text-foreground mb-1">
            Vacancy Status
          </Label>
          <Select
            name="status"
            value={filters.status}
            onValueChange={(value) => onFilterChange("status", value)}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="maxPrice" className="block text-sm font-medium text-foreground mb-1">
            Max Price:{" "}
            <span className="font-bold text-primary">
              Ksh {Number(filters.maxPrice).toLocaleString()}
            </span>
          </Label>
          <Slider
            id="maxPrice"
            name="maxPrice"
            min={3000}
            max={100000}
            step={1000}
            value={[filters.maxPrice]}
            onValueChange={(value) => onFilterChange("maxPrice", value[0])}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
