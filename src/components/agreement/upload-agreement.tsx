/**
 * Upload Agreement Component
 * For landlords to upload rental agreement templates
 */

'use client';

import { useState, useRef } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Upload, Loader2, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Listing } from '@/types';

interface UploadAgreementProps {
  listing: Listing;
  onUploadComplete?: () => void;
}

export function UploadAgreement({ listing, onUploadComplete }: UploadAgreementProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type (PDF only)
    if (selectedFile.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'PDF must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    setUploadSuccess(false);
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);

    try {
      // Upload file to Cloudinary
      const formData = new FormData();
      formData.append('image', file);

      const uploadResponse = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload agreement');
      }

      const { url: downloadURL } = await uploadResponse.json();

      // Save agreement record to Firestore
      if (!db) {
        throw new Error('Database unavailable');
      }

      await addDoc(collection(db, 'agreements'), {
        listingId: listing.id,
        landlordId: user.uid,
        templateUrl: downloadURL,
        templateName: file.name,
        uploadedAt: serverTimestamp(),
      });

      setUploadSuccess(true);

      toast({
        title: 'Agreement uploaded',
        description: 'Your rental agreement template has been saved',
      });

      if (onUploadComplete) {
        onUploadComplete();
      }

      // Reset after 2 seconds
      setTimeout(() => {
        setFile(null);
        setUploadSuccess(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);
    } catch (error: any) {
      console.error('Error uploading agreement:', error);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Rental Agreement Template
        </CardTitle>
        <CardDescription>
          Upload a rental agreement template for this property (optional)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agreement">Agreement PDF</Label>
          <Input
            ref={fileInputRef}
            id="agreement"
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <p className="text-xs text-muted-foreground">
            Upload a PDF file (max 5MB). This will be shown to interested tenants.
          </p>
        </div>

        {file && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>

            {uploadSuccess ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFile}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || uploading || uploadSuccess}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : uploadSuccess ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Uploaded
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Agreement
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
