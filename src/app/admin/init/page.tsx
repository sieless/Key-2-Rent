'use client';

// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { isAdmin } from '@/lib/admin';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Rocket } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getDefaultSettings } from '@/services/platform-settings';

type TaskStatus = 'pending' | 'running' | 'success' | 'error';

interface Task {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  message?: string;
}

export default function AdminInitPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'platform-settings',
      name: 'Initialize Platform Settings',
      description: 'Create FREE mode configuration (all payment features OFF)',
      status: 'pending',
    },
    {
      id: 'migrate-images',
      name: 'Migrate Listing Images',
      description: 'Add images:[] field to all existing listings',
      status: 'pending',
    },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [allComplete, setAllComplete] = useState(false);

  useEffect(() => {
    if (!isUserLoading && (!user || !isAdmin(user.email))) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const updateTaskStatus = (taskId: string, status: TaskStatus, message?: string) => {
    setTasks(prev =>
      prev.map(task => (task.id === taskId ? { ...task, status, message } : task))
    );
  };

  const initializePlatformSettings = async () => {
    updateTaskStatus('platform-settings', 'running');

    try {
      if (!db) {
        updateTaskStatus('platform-settings', 'error', 'Database connection unavailable');
        throw new Error('Firestore not initialized');
      }

      const settingsRef = doc(db, 'platformSettings', 'config');
      const settingsSnap = await getDoc(settingsRef);

      if (!settingsSnap.exists()) {
        const defaults = getDefaultSettings();
        await setDoc(settingsRef, defaults);
        updateTaskStatus(
          'platform-settings',
          'success',
          'Platform settings created (FREE MODE - all features OFF)'
        );
      } else {
        updateTaskStatus(
          'platform-settings',
          'success',
          'Platform settings already exist'
        );
      }
    } catch (error: any) {
      updateTaskStatus('platform-settings', 'error', error.message);
      throw error;
    }
  };

  const migrateListingsAddImages = async () => {
    updateTaskStatus('migrate-images', 'running');

    try {
      if (!db) {
        updateTaskStatus('migrate-images', 'error', 'Database connection unavailable');
        throw new Error('Firestore not initialized');
      }

      const listingsCollection = collection(db, 'listings');
      const snapshot = await getDocs(listingsCollection);

      let updatedCount = 0;
      let skippedCount = 0;

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();

        if (!data.images || !Array.isArray(data.images)) {
          await updateDoc(doc(db, 'listings', docSnapshot.id), {
            images: [],
          });
          updatedCount++;
        } else {
          skippedCount++;
        }
      }

      updateTaskStatus(
        'migrate-images',
        'success',
        `Updated ${updatedCount} listings, skipped ${skippedCount} (already had images). Total: ${snapshot.docs.length}`
      );
    } catch (error: any) {
      updateTaskStatus('migrate-images', 'error', error.message);
      throw error;
    }
  };

  const runInitialization = async () => {
    setIsRunning(true);

    try {
      await initializePlatformSettings();
      await migrateListingsAddImages();

      setAllComplete(true);
    } catch (error) {
      console.error('Initialization failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin(user.email)) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header onPostClick={() => {}} />
      <main className="flex-grow bg-background">
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Rocket className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Platform Initialization</h1>
            <p className="text-muted-foreground">
              One-time setup for FREE launch on Monday
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Initialization Tasks</CardTitle>
              <CardDescription>
                Run these tasks once to prepare the platform for launch
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className="flex-shrink-0 mt-1">
                    {task.status === 'pending' && (
                      <div className="h-6 w-6 rounded-full border-2 border-muted" />
                    )}
                    {task.status === 'running' && (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    )}
                    {task.status === 'success' && (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    )}
                    {task.status === 'error' && (
                      <AlertCircle className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold text-foreground">{task.name}</h3>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    {task.message && (
                      <p
                        className={`text-sm mt-2 ${
                          task.status === 'error' ? 'text-red-500' : 'text-green-600'
                        }`}
                      >
                        {task.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {allComplete && (
            <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900 dark:text-green-100">
                Initialization Complete! 🎉
              </AlertTitle>
              <AlertDescription className="text-green-800 dark:text-green-200">
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Platform settings initialized in FREE mode</li>
                  <li>All listings now have images field</li>
                  <li>Ready for Monday launch!</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            <Button
              onClick={runInitialization}
              disabled={isRunning || allComplete}
              className="flex-1"
              size="lg"
            >
              {isRunning && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {allComplete ? '✓ Completed' : isRunning ? 'Running...' : 'Run Initialization'}
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push('/admin')}
              disabled={isRunning}
              size="lg"
            >
              Back to Admin
            </Button>
          </div>

          <Alert className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important Notes</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>This is a one-time initialization - safe to run multiple times</li>
                <li>All payment features will be set to OFF (FREE mode)</li>
                <li>
                  Existing listings will get <code>images: []</code> if they don't have it
                </li>
                <li>You can enable payment features later from Payment Settings</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </main>
      <Footer />
    </div>
  );
}
