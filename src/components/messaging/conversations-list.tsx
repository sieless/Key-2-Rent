/**
 * Conversations List Component
 * Shows all conversations for current user
 */

'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types';

interface ConversationsListProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string;
}

export function ConversationsList({
  onSelectConversation,
  selectedConversationId,
}: ConversationsListProps) {
  const { user } = useUser();
  const db = useFirestore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    const firestore = db;
    const conversationsRef = collection(firestore, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const conversationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Conversation[];

      setConversations(conversationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, db]);

  const getInitials = (title: string) => {
    return title
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Please sign in to view messages</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading conversations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Messages
          {conversations.length > 0 && (
            <Badge variant="secondary">{conversations.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        {conversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start a conversation by messaging a landlord from a listing
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="divide-y">
              {conversations.map((conversation) => {
                const unreadCount = conversation.unreadCount[user.uid] || 0;
                const isSelected = conversation.id === selectedConversationId;

                return (
                  <button
                    key={conversation.id}
                    onClick={() => onSelectConversation(conversation.id)}
                    className={cn(
                      'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                      isSelected && 'bg-muted'
                    )}
                  >
                    <div className="flex gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback>
                          {getInitials(conversation.listingTitle || 'Property')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">
                            {conversation.listingTitle || 'Property Listing'}
                          </h3>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(conversation.lastMessageAt)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage}
                          </p>
                          {unreadCount > 0 && (
                            <Badge variant="default" className="h-5 min-w-5 px-1 text-xs">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
