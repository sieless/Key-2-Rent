import { cn } from '@/lib/utils';

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
      <div className={cn('flex items-center justify-center relative', className)}>
        <svg
          width="40"
          height="40"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn(iconClassName)}
        >
          <path
            d="M10 20L24 8L38 20V40H10V20Z"
            fill="currentColor"
            opacity="0.2"
          />
          <path
            d="M24 8L38 20V40H10V20L24 8Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="19" y="30" width="10" height="10" fill="currentColor" opacity="0.3" />
          <g transform="translate(8, 18)">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2.5" fill="none" />
            <circle cx="8" cy="8" r="2.5" fill="currentColor" />
            <line x1="14" y1="8" x2="28" y2="8" stroke="currentColor" strokeWidth="2.5" />
            <line x1="21" y1="8" x2="21" y2="12" stroke="currentColor" strokeWidth="2.5" />
            <line x1="25" y1="8" x2="25" y2="13" stroke="currentColor" strokeWidth="2.5" />
            <line x1="28" y1="8" x2="28" y2="11" stroke="currentColor" strokeWidth="2.5" />
          </g>
        </svg>
      </div>
    );
  }

  // Full logo with text
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(iconClassName)}
      >
        <path
          d="M10 20L24 8L38 20V40H10V20Z"
          fill="currentColor"
          opacity="0.2"
        />
        <path
          d="M24 8L38 20V40H10V20L24 8Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="19" y="30" width="10" height="10" fill="currentColor" opacity="0.3" />
        <g transform="translate(8, 18)">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2.5" fill="none" />
          <circle cx="8" cy="8" r="2.5" fill="currentColor" />
          <line x1="14" y1="8" x2="28" y2="8" stroke="currentColor" strokeWidth="2.5" />
          <line x1="21" y1="8" x2="21" y2="12" stroke="currentColor" strokeWidth="2.5" />
          <line x1="25" y1="8" x2="25" y2="13" stroke="currentColor" strokeWidth="2.5" />
          <line x1="28" y1="8" x2="28" y2="11" stroke="currentColor" strokeWidth="2.5" />
        </g>
      </svg>
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-foreground font-headline leading-tight">
          Timelaine
        </h1>
        <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">
          Find Your Home in Kenya
        </p>
      </div>
    </div>
  );
}
