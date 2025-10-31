import Image from 'next/image';

import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon';
  className?: string;
  iconClassName?: string;
  iconSize?: number;
  fullHeight?: number;
}

const LOGO_SOURCE_WIDTH = 561;
const LOGO_SOURCE_HEIGHT = 449;

export function Logo({
  variant = 'full',
  className,
  iconClassName,
  iconSize,
  fullHeight,
}: LogoProps) {
  if (variant === 'icon') {
    const displaySize = iconSize ?? 48;

    return (
      <div
        className={cn('relative flex items-center justify-center', className)}
        style={{ width: displaySize, height: displaySize }}
      >
        <Image
          src="/logos/timelainelogo.png"
          alt="Timelaine logo icon"
          width={LOGO_SOURCE_WIDTH}
          height={LOGO_SOURCE_HEIGHT}
          className={cn('h-full w-full object-contain dark:hidden', iconClassName)}
          priority
        />
        <Image
          src="/logos/timelainelogo-white.png"
          alt="Timelaine logo icon light"
          width={LOGO_SOURCE_WIDTH}
          height={LOGO_SOURCE_HEIGHT}
          className={cn('hidden h-full w-full object-contain dark:block', iconClassName)}
          priority
        />
      </div>
    );
  }

  const displayHeight = fullHeight ?? 40;

  // Full logo
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <Image
        src="/logos/timelainelogo.png"
        alt="Timelaine logo"
        width={LOGO_SOURCE_WIDTH}
        height={LOGO_SOURCE_HEIGHT}
        className={cn('object-contain dark:hidden', iconClassName)}
        style={{ height: displayHeight, width: 'auto' }}
        priority
      />
      <Image
        src="/logos/timelainelogo-white.png"
        alt="Timelaine logo light"
        width={LOGO_SOURCE_WIDTH}
        height={LOGO_SOURCE_HEIGHT}
        className={cn('hidden object-contain dark:block', iconClassName)}
        style={{ height: displayHeight, width: 'auto' }}
        priority
      />
    </div>
  );
}
