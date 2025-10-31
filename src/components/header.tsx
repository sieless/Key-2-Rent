'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, PlusCircle, LayoutGrid, Menu, Info, Mail, LogIn, Shield, Heart } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { ModeToggle } from './mode-toggle';
import { isAdmin } from '@/lib/admin';
import { Logo } from './logo';

type HeaderProps = {
  onPostClick?: () => void;
};

export function Header({ onPostClick }: HeaderProps) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { profile, loading: profileLoading } = useUserProfile();
  const canPostListing = !!profile && profile.accountType === 'landlord';

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('');
  };

  return (
    <header className="relative bg-card shadow-sm sticky top-0 z-40 overflow-hidden">
      <div className="absolute inset-0 hidden dark:block">
        <Image
          src="/backgrounds/timelaine-header-dark.png"
          alt="Timelaine dark theme header background"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur" />
      </div>
      <nav className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/">
          <Logo iconClassName="text-primary" fullHeight={50} />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {profileLoading ? (
            <Skeleton className="h-10 w-32 hidden sm:block" />
          ) : user && canPostListing ? (
            <Button
              onClick={() => onPostClick?.()}
              className="font-semibold shadow-md hover:bg-primary/90 transition-all duration-300 transform hover:-translate-y-0.5 hidden sm:flex"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Post a Listing
            </Button>
          ) : user ? (
            <Button asChild variant="outline" className="hidden sm:flex">
              <Link href="/landlord/payment-schedule">Landlord Guide</Link>
            </Button>
          ) : null}
          {!user && !isUserLoading && (
             <Button asChild className="hidden sm:flex">
                <Link href="/login">
                  <LogIn className="mr-2 h-5 w-5" />
                  Login to Post
                </Link>
              </Button>
          )}
          
          <div className="hidden sm:flex items-center gap-2">
             <Button variant="ghost" asChild>
                <Link href="/all-properties">All Properties</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/about">About</Link>
              </Button>
               <Button variant="ghost" asChild>
                <Link href="/contact">Contact</Link>
              </Button>
          </div>

           <ModeToggle />

          {isUserLoading ? (
             <Skeleton className="h-10 w-10 rounded-full" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarImage
                      src={user.photoURL || undefined}
                      alt={user.displayName || 'User'}
                    />
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.displayName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email || user.phoneNumber}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                   <Link href="/my-listings">
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    <span>My Listings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                   <Link href="/favorites">
                    <Heart className="mr-2 h-4 w-4" />
                    <span>Saved Listings</span>
                  </Link>
                </DropdownMenuItem>
                {isAdmin(user.email) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Shield className="mr-2 h-4 w-4 text-orange-500" />
                        <span className="font-semibold text-orange-500">Admin Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline">
              <Link href="/login">Login</Link>
            </Button>
          )}

           <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                 {user && (
                    <>
                      <DropdownMenuItem onClick={() => onPostClick?.()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>Post Listing</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/favorites">
                          <Heart className="mr-2 h-4 w-4" />
                          <span>Saved Listings</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                 )}
                 {!user && !isUserLoading && (
                   <DropdownMenuItem asChild>
                     <Link href="/login">
                       <LogIn className="mr-2 h-4 w-4" />
                       <span>Login to Post</span>
                     </Link>
                   </DropdownMenuItem>
                 )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/all-properties">
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    <span>All Properties</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/about">
                    <Info className="mr-2 h-4 w-4" />
                    <span>About Us</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/contact">
                    <Mail className="mr-2 h-4 w-4" />
                    <span>Contact</span>
                  </Link>
                </DropdownMenuItem>
                {user && isAdmin(user.email) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Shield className="mr-2 h-4 w-4 text-orange-500" />
                        <span className="font-semibold text-orange-500">Admin</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
    </header>
  );
}
