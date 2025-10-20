/**
 * Auto-Logout Hook
 * Monitors user inactivity and handles auto-logout
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { inactivityMonitor } from '@/lib/auth/auto-logout';
import { useToast } from '@/hooks/use-toast';

export function useAutoLogout() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(120); // 2 minutes

  useEffect(() => {
    // Only enable auto-logout for authenticated users
    if (!user) {
      inactivityMonitor.stop();
      return;
    }

    const handleWarning = () => {
      setShowWarning(true);
      setSecondsRemaining(120); // Reset to 2 minutes

      toast({
        title: 'Inactivity Warning',
        description: 'You will be logged out in 2 minutes due to inactivity.',
        duration: 5000,
      });

      // Start countdown
      const countdown = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Clean up countdown after 2 minutes
      setTimeout(() => {
        clearInterval(countdown);
      }, 120000);
    };

    const handleLogout = async () => {
      try {
        // Clear session
        if (auth) {
          await signOut(auth);
        }

        // Clear local storage
        localStorage.clear();
        sessionStorage.clear();

        toast({
          title: 'Logged out',
          description: 'You have been logged out due to inactivity',
        });

        // Redirect to home
        router.push('/');
      } catch (error) {
        console.error('Auto-logout error:', error);
      }
    };

    // Start monitoring
    inactivityMonitor.start(handleWarning, handleLogout);

    // Cleanup on unmount
    return () => {
      inactivityMonitor.stop();
    };
  }, [user, auth, router, toast]);

  const dismissWarning = () => {
    setShowWarning(false);
    inactivityMonitor.dismissWarning();

    toast({
      title: 'Welcome back',
      description: 'Inactivity timer has been reset',
    });
  };

  const logoutNow = () => {
    inactivityMonitor.triggerLogout();
  };

  return {
    showWarning,
    secondsRemaining,
    dismissWarning,
    logoutNow,
  };
}
