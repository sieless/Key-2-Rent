'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { type UserProfile } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Ban, CheckCircle, Search, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function UsersManagementTable() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const db = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  async function fetchUsers() {
    try {
      if (!db) {
        console.warn('UsersTable: Firestore unavailable.');
        setLoading(false);
        return;
      }

      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserProfile[];
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser(user: UserProfile) {
    setActionLoading(true);
    try {
      // Delete all user's listings first
      if (user.listings && user.listings.length > 0) {
        if (!db) {
          throw new Error('Firestore not available');
        }

        const batch = writeBatch(db);
        user.listings.forEach((listingId) => {
          batch.delete(doc(db, 'listings', listingId));
        });
        await batch.commit();
      }

      // Delete user document
      if (!db) {
        throw new Error('Firestore not available');
      }

      await deleteDoc(doc(db, 'users', user.id));

      toast({
        title: 'Success',
        description: `User ${user.email} and their listings have been deleted`,
      });

      // Refresh users list
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  }

  async function handleToggleSuspend(user: UserProfile) {
    setActionLoading(true);
    try {
      if (!db) {
        throw new Error('Firestore not available');
      }

      await updateDoc(doc(db, 'users', user.id), {
        suspended: !user.suspended,
      });

      toast({
        title: 'Success',
        description: `User ${user.suspended ? 'unsuspended' : 'suspended'} successfully`,
      });

      // Refresh users list
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  }

  function formatDate(timestamp: any) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users Management</CardTitle>
          <CardDescription>Loading users...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Users Management</CardTitle>
          <CardDescription>Manage user accounts and permissions</CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead>Listings</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.accountType === 'landlord' ? 'Landlord' : 'Renter'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.listings?.length || 0}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        {user.suspended ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant={user.suspended ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleToggleSuspend(user)}
                            disabled={actionLoading}
                          >
                            {user.suspended ? (
                              <>
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Unsuspend
                              </>
                            ) : (
                              <>
                                <Ban className="mr-1 h-3 w-3" />
                                Suspend
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={actionLoading}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user <strong>{selectedUser?.email}</strong> and all
              their listings ({selectedUser?.listings?.length || 0} listings). This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && handleDeleteUser(selectedUser)}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
