import Image from 'next/image';

import { cn } from '@/lib/utils';

const ICON_DIMENSION = 1024;
const FULL_DIMENSION = 1024;

interface LogoProps {
  variant?: 'full' | 'icon';
  className?: string;
  iconClassName?: string;
}

/**
 * Timelaine Logo Component
 * - variant="full": Shows full logo with text (default)
 * - variant="icon": Shows icon only
 * Uses inline SVG for reliability
 */
export function Logo({ variant = 'full', className, iconClassName }: LogoProps) {
  if (variant === 'icon') {
    return (
      <div className={cn('relative flex items-center justify-center', className)}>
        <Image
          src="/logos/timelaine-logo-icon.png"
          alt="Timelaine logo icon"
          width={ICON_DIMENSION}
          height={ICON_DIMENSION}
          className={cn('h-10 w-10 object-contain', iconClassName)}
          priority
        />
      </div>
    );
  }

  // Full logo
  return (
    <div className={cn('relative flex items-center', className)}>
      <Image
        src="/logos/timelaine-logo-full.png"
        alt="Timelaine logo"
        width={FULL_DIMENSION}
        height={FULL_DIMENSION}
        className={cn('h-10 w-auto object-contain', iconClassName)}
        priority
      />
    </div>
  );
}
