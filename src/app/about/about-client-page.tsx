
'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AddListingModal } from '@/components/add-listing-modal';

export function AboutClientPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePostClick = () => {
    if (isUserLoading) return;
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to post a new listing.',
        variant: 'destructive',
      });
      router.push('/login');
    } else {
      setIsModalOpen(true);
    }
  };


  return (
    <div className="flex flex-col min-h-screen">
      <Header onPostClick={handlePostClick} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Info className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl font-bold">About Timelaine</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-lg text-muted-foreground">
            <p>
              Welcome to Timelaine, your number one source for finding rental properties. We're dedicated to giving you the very best of rental listings, with a focus on dependability, customer service, and uniqueness.
            </p>
            <p>
              Founded in 2024, Timelaine has come a long way from its beginnings. When we first started out, our passion for helping people find their next home drove us to do intense research, and gave us the impetus to turn hard work and inspiration into a booming online platform.
            </p>
            <p>
              We now serve customers all over Machakos and beyond, and are thrilled to be a part of the fair-trade wing of the real estate industry. We hope you enjoy our platform as much as we enjoy offering it to you. If you have any questions or comments, please don't hesitate to contact us.
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
       {isModalOpen && (
        <AddListingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
