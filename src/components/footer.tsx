import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card mt-12 border-t">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
        <p>&copy; {currentYear} Timelaine. All rights reserved.</p>
        <p className="text-sm mt-1">Simplifying your search for a new home.</p>
        <div className="mt-3 flex items-center justify-center gap-4 text-sm">
          <Link href="/legal/terms" className="underline underline-offset-4 hover:text-primary transition-colors">
            Terms &amp; Policies
          </Link>
        </div>
      </div>
    </footer>
  );
}
