'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
  images: string[];
  alt: string;
  className?: string;
  showThumbnails?: boolean;
}

/**
 * Image gallery component with horizontal scroll and thumbnail navigation
 */
export function ImageGallery({
  images,
  alt,
  className,
  showThumbnails = true,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const validImages = images.filter((_, index) => !imageErrors.has(index));

  useEffect(() => {
    setIsLoading(true);
  }, [currentIndex]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
    if (scrollRef.current) {
      const thumbnail = scrollRef.current.children[index] as HTMLElement;
      thumbnail?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const handleImageError = (index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
    setIsLoading(false);
  };

  if (!validImages || validImages.length === 0) {
    return (
      <div className={cn('relative bg-muted flex items-center justify-center rounded-lg', className)}>
        <div className="text-center p-8 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ask landlord for photos
          </p>
          <p className="text-sm text-muted-foreground/80">
            Call or text the landlord to request more property images.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Main Image Display */}
      <div className="relative aspect-[16/10] w-full bg-muted overflow-hidden rounded-lg">
        {isLoading && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        <Image
          src={validImages[currentIndex]}
          alt={`${alt} - image ${currentIndex + 1}`}
          fill
          className={cn(
            'object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          priority={currentIndex === 0}
          onLoad={() => setIsLoading(false)}
          onError={() => handleImageError(currentIndex)}
          unoptimized
        />

        {/* Navigation Arrows */}
        {validImages.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full opacity-80 hover:opacity-100"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full opacity-80 hover:opacity-100"
              onClick={handleNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Image Counter */}
        {validImages.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {validImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {showThumbnails && validImages.length > 1 && (
        <div className="mt-4">
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
          >
            {validImages.map((image, index) => (
              <button
                key={index}
                onClick={() => handleThumbnailClick(index)}
                className={cn(
                  'relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all',
                  currentIndex === index
                    ? 'border-primary ring-2 ring-primary ring-offset-2'
                    : 'border-transparent hover:border-gray-300'
                )}
              >
                <Image
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
