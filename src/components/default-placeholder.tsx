'use client';
import { Bed, Building, School, Store } from "lucide-react";
import { getPropertyIcon } from "@/lib/utils";

type Props = {
    type: string;
};

export function DefaultPlaceholder({ type }: Props) {
    return (
        <div className="flex flex-col items-center justify-center text-muted-foreground/50 h-full text-center p-4 space-y-2">
            {getPropertyIcon(type, "w-16 h-16")}
            <span className="mt-2 font-bold text-lg">{type}</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ask landlord for photos
            </span>
            <span className="text-xs text-muted-foreground/80">
                Call or text to request more property images.
            </span>
        </div>
    );
}
