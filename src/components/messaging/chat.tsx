/**
 * Chat Component
 * Real-time messaging between tenant and landlord
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  getDocs,
  limit,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Message, Conversation } from '@/types';

interface ChatProps {
  conversationId: string;
  onBack?: () => void;
}

export function Chat({ conversationId, onBack }: ChatProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load conversation details
  useEffect(() => {
    if (!conversationId || !db) return;

    const unsubscribe = onSnapshot(
      doc(db, 'conversations', conversationId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setConversation({ id: docSnapshot.id, ...docSnapshot.data() } as Conversation);
        }
      }
    );

    return () => unsubscribe();
  }, [conversationId, db]);

  // Load messages
  useEffect(() => {
    if (!conversationId || !db) return;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      setMessages(messagesData);

      // Mark messages as read
      if (user) {
        snapshot.docs.forEach(async (messageDoc) => {
          const message = messageDoc.data() as Message;
          if (message.senderId !== user.uid && !message.read) {
      if (!db) {
        return;
      }

      await updateDoc(doc(db, 'messages', messageDoc.id), {
              read: true,
            });
          }
        });

        // Update unread count in conversation
        updateUnreadCount();
      }

      // Scroll to bottom
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [conversationId, db, user]);

  const updateUnreadCount = async () => {
    if (!user || !conversationId || !db) return;

    const firestore = db;

    try {
      const conversationRef = doc(firestore, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        [`unreadCount.${user.uid}`]: 0,
      });
    } catch (error) {
      console.error('Error updating unread count:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !conversation || !db) return;

    const firestore = db;

    setSending(true);

    try {
      // Add message to Firestore
      const messageData: Omit<Message, 'id'> = {
        conversationId,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'User',
        text: newMessage.trim(),
        read: false,
        createdAt: serverTimestamp() as Timestamp,
      };

      if (!db) {
        return;
      }

      if (!db) {
        return;
      }

      await addDoc(collection(firestore, 'messages'), messageData);

      // Update conversation
      const otherUserId = conversation.participants.find(p => p !== user.uid);

      if (!db) {
        return;
      }

      await updateDoc(doc(firestore, 'conversations', conversationId), {
        lastMessage: newMessage.trim(),
        lastMessageAt: serverTimestamp(),
        [`unreadCount.${otherUserId}`]: (conversation.unreadCount[otherUserId || ''] || 0) + 1,
      });

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !conversation || !db) return;

    const firestore = db;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Upload image to Cloudinary
      const formData = new FormData();
      formData.append('image', file);

      const uploadResponse = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const { url: imageUrl } = await uploadResponse.json();

      // Send message with image
      const messageData: Omit<Message, 'id'> = {
        conversationId,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'User',
        text: 'Sent an image',
        imageUrl,
        read: false,
        createdAt: serverTimestamp() as Timestamp,
      };

      await addDoc(collection(firestore, 'messages'), messageData);

      // Update conversation
      const otherUserId = conversation.participants.find(p => p !== user.uid);

      await updateDoc(doc(firestore, 'conversations', conversationId), {
        lastMessage: 'Sent an image',
        lastMessageAt: serverTimestamp(),
        [`unreadCount.${otherUserId}`]: (conversation.unreadCount[otherUserId || ''] || 0) + 1,
      });

      toast({
        title: 'Image sent',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Failed to upload image',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!conversation) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading conversation...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1">
            <CardTitle className="text-lg">{conversation.listingTitle || 'Conversation'}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {messages.length} messages
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.senderId === user?.uid;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3',
                      isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {getInitials(message.senderName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className={cn(
                      'flex flex-col gap-1 max-w-[70%]',
                      isOwnMessage ? 'items-end' : 'items-start'
                    )}>
                      <div className={cn(
                        'rounded-lg px-4 py-2',
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}>
                        {message.imageUrl && (
                          <img
                            src={message.imageUrl}
                            alt="Shared image"
                            className="rounded mb-2 max-w-full h-auto"
                            style={{ maxHeight: '300px' }}
                          />
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.text}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground px-1">
                        {(message.createdAt as Timestamp)?.toDate().toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>

            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={sending || uploading}
            />

            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending || uploading}
            >
              {sending ? (
                'Sending...'
              ) : (
                <>
                  <Send className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
