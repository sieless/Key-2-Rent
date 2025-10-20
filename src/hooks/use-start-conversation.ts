/**
 * Hook to start or find existing conversation with a landlord
 */

import { useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Listing } from '@/types';

export function useStartConversation() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const startConversation = async (listing: Listing) => {
    if (!user || !db) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to message landlords',
        variant: 'destructive',
      });
      router.push('/signup');
      return;
    }

    // Can't message yourself
    if (user.uid === listing.userId) {
      toast({
        title: 'Cannot message yourself',
        description: 'This is your own listing',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Check if conversation already exists
      const firestore = db;
      const conversationsRef = collection(firestore, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', user.uid),
        where('listingId', '==', listing.id)
      );

      const existingConversations = await getDocs(q);

      if (!existingConversations.empty) {
        // Conversation exists, navigate to it
        const conversationId = existingConversations.docs[0].id;
        router.push(`/messages?conversation=${conversationId}`);
        return;
      }

      // Create new conversation
      const conversationData = {
        participants: [user.uid, listing.userId],
        listingId: listing.id,
        listingTitle: listing.name || `${listing.type} in ${listing.location}`,
        lastMessage: 'Conversation started',
        lastMessageAt: serverTimestamp(),
        unreadCount: {
          [user.uid]: 0,
          [listing.userId]: 1, // Landlord has 1 unread
        },
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(conversationsRef, conversationData);

      // Add initial system message
      await addDoc(collection(firestore, 'messages'), {
        conversationId: docRef.id,
        senderId: 'system',
        senderName: 'System',
        text: `Conversation started about: ${conversationData.listingTitle}`,
        read: false,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Conversation started',
        description: 'You can now message the landlord',
      });

      router.push(`/messages?conversation=${docRef.id}`);
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      toast({
        title: 'Failed to start conversation',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    startConversation,
    loading,
  };
}
