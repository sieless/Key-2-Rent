
'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AddListingModal } from '@/components/add-listing-modal';

export function ContactClientPage() {
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
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-4">
                <Mail className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold">Contact Us</CardTitle>
            </div>
            <p className="text-muted-foreground pt-2">
                Have questions? We'd love to hear from you.
            </p>
          </CardHeader>
          <CardContent className="space-y-6 text-lg">
            <div className="flex items-center gap-4">
              <Phone className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold">Phone</h3>
                <a href="tel:0708674665" className="text-muted-foreground hover:text-primary transition-colors">0708674665</a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Mail className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold">Email</h3>
                <a href="mailto:timelaine@gmail.com" className="text-muted-foreground hover:text-primary transition-colors">timelaine@gmail.com</a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <MapPin className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold">Office</h3>
                <p className="text-muted-foreground">Kimutwa Building, Opp Kpipes (Lau Junction), Machakos Town</p>
              </div>
            </div>
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
