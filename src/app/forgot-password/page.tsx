'use client';

// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!auth) {
        throw new Error('Authentication service unavailable. Please try again later.');
      }

      await sendPasswordResetEmail(auth, email);
      setIsSent(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground font-headline">
              Key 2 Rent
            </h1>
          </div>
          <CardTitle className="text-2xl text-center">Forgot Password</CardTitle>
          <CardDescription className="text-center">
            {isSent
              ? 'A password reset link has been sent to your email.'
              : "Enter your email and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSent ? (
             <div className="text-center">
                 <p className="text-muted-foreground">
                    Please check your inbox (and spam folder) to continue.
                </p>
                 <Button asChild className="w-full mt-4">
                    <Link href="/login">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                    </Link>
                </Button>
             </div>
          ) : (
            <form onSubmit={handleResetPassword} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          )}
           <div className="mt-4 text-center text-sm">
             Remember your password?{' '}
            <Link href="/login" className="underline">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
