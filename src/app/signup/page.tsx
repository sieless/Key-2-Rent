'use client';

// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
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
import { Mail, Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/logo';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'renter' | 'landlord'>('renter');

  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!auth) {
        throw new Error('Authentication service unavailable. Please try again later.');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: name });

      // Create a user profile document in Firestore
      if (!db) {
        throw new Error('Database unavailable');
      }

      await setDoc(doc(db, 'users', user.uid), {
        name: name,
        email: user.email,
        phone,
        id: user.uid,
        listings: [],
        canViewContacts: true, // FREE LAUNCH: All users can view contacts
        role,
        accountType: role,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Account Created', description: 'You have been successfully signed up.' });
      router.push('/');
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error instanceof Error ? error.message : 'Unable to create your account right now.',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
           <div className="flex justify-center mb-4">
            <Logo variant="icon" iconClassName="text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Sign Up</CardTitle>
          <CardDescription className="text-center">
            Create an account to start listing properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSignUp} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name-email">Name</Label>
                  <Input id="name-email" placeholder="" required value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
                </div>
                <div className="grid gap-2">
                  <Label>What is your primary role?</Label>
                  <RadioGroup
                    value={role}
                    onValueChange={(value) => setRole(value as 'renter' | 'landlord')}
                    className="grid grid-cols-1 gap-3"
                  >
                    <div className="flex items-center space-x-3 rounded-md border p-3">
                      <RadioGroupItem value="renter" id="role-renter-email" />
                      <Label htmlFor="role-renter-email" className="font-medium cursor-pointer">
                        Tenant
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 rounded-md border p-3">
                      <RadioGroupItem value="landlord" id="role-landlord-email" />
                      <Label htmlFor="role-landlord-email" className="font-medium cursor-pointer">
                        Landlord
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="254712345678"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create an account'}
                </Button>
              </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
