/**
 * Edit Profile Page
 * Allow users to update their profile information
 */

'use client';

// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, AlertCircle, CheckCircle, User, Mail, Phone, MapPin, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { kenyanCounties } from '@/lib/constants';
import {
  validatePassword,
  getStrengthColor,
  getStrengthLabel,
  type PasswordValidationResult,
} from '@/lib/security/password-validator';
import { logPasswordChange } from '@/lib/security/audit-logger';

interface ProfileFormData {
  name: string;
  email: string;
  phoneNumber: string;
  preferredCounty: string;
}

export default function EditProfilePage() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    phoneNumber: '',
    preferredCounty: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult | null>(null);

  // Validate password whenever it changes
  useEffect(() => {
    if (passwordData.newPassword) {
      const validation = validatePassword(passwordData.newPassword);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation(null);
    }
  }, [passwordData.newPassword]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !loading) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load user data
  useEffect(() => {
    async function loadProfile() {
      if (!user || !db) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setFormData({
            name: userData.name || user.displayName || '',
            email: userData.email || user.email || '',
            phoneNumber: userData.phoneNumber || user.phoneNumber || '',
            preferredCounty: userData.preferredCounty || '',
          });
        } else {
          // Initialize with auth data
          setFormData({
            name: user.displayName || '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            preferredCounty: '',
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user, db, toast]);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);

    try {
      // Update Firestore user document
      if (!db) {
        throw new Error('Database unavailable');
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        preferredCounty: formData.preferredCounty,
        updatedAt: new Date(),
      });

      // Update email if changed (requires re-authentication in production)
      if (formData.email !== user.email) {
        // Note: In production, you should re-authenticate the user first
        // For now, we'll just show a warning
        toast({
          title: 'Email update pending',
          description: 'Email updates require verification. Please check your inbox.',
        });
        // await updateEmail(user, formData.email);
      }

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
      });

      // Optionally refresh the page to show updated data
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please ensure both passwords match',
        variant: 'destructive',
      });
      return;
    }

    // Validate password strength
    if (!passwordValidation?.isValid) {
      toast({
        title: 'Password requirements not met',
        description: passwordValidation?.errors[0] || 'Please use a stronger password',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);

    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );

      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, passwordData.newPassword);

      // Log password change for security audit
      await logPasswordChange(user.uid, user.email || '');

      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully',
      });

      // Clear password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error changing password:', error);

      let errorMessage = 'Failed to change password';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password';
      }

      toast({
        title: 'Password change failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-2xl">
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Edit Profile</h1>
        <p className="text-muted-foreground">Update your personal information</p>
      </div>

      <div className="space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Update your name, email, and contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="your@email.com"
                  className="pl-10"
                  disabled // Disable email editing for now
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email updates require verification (feature coming soon)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="254712345678"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="county">Preferred County</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <Select
                  value={formData.preferredCounty}
                  onValueChange={(value) => handleInputChange('preferredCounty', value)}
                >
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Select your county" />
                  </SelectTrigger>
                  <SelectContent>
                    {kenyanCounties.filter(c => c !== 'All Counties').map((county) => (
                      <SelectItem key={county} value={county}>
                        {county}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                We'll show you listings in your preferred area first
              </p>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Password must be at least 8 characters long and include uppercase, lowercase, numbers, and symbols for better security.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password"
              />
              {passwordValidation && passwordData.newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Password Strength:</span>
                    <span className={`text-sm font-medium ${getStrengthColor(passwordValidation.strength)}`}>
                      {getStrengthLabel(passwordValidation.strength)}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordValidation.strength === 'WEAK'
                          ? 'bg-red-500'
                          : passwordValidation.strength === 'MEDIUM'
                          ? 'bg-yellow-500'
                          : passwordValidation.strength === 'STRONG'
                          ? 'bg-blue-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${(passwordValidation.score / 7) * 100}%` }}
                    />
                  </div>
                  {!passwordValidation.isValid && (
                    <ul className="text-xs text-red-500 space-y-1 mt-2">
                      {passwordValidation.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword}
              variant="outline"
              className="w-full"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
