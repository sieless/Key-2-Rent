/**
 * Image Upload API Route
 * Handles image uploads to Cloudinary
 */

import { NextRequest, NextResponse } from 'next/server';
import cloudinary, { validateCloudinaryConfig } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  console.log('📤 Image upload API called');
  
  try {
    // Validate Cloudinary configuration first
    console.log('🔧 Validating Cloudinary configuration...');
    try {
      validateCloudinaryConfig();
      console.log('✅ Cloudinary configuration valid');
    } catch (configError) {
      console.error('❌ Cloudinary configuration error:', configError);
      return NextResponse.json(
        { 
          error: 'Server configuration error. Please contact support.',
          details: process.env.NODE_ENV === 'development' && configError instanceof Error ? configError.message : undefined
        },
        { status: 500 }
      );
    }
    
    // Parse the form data
    console.log('📋 Parsing form data...');
    
    let formData;
    let file;
    
    try {
      formData = await request.formData();
      file = formData.get('image') as File;
      console.log('📁 File received:', {
        name: file?.name || 'No name',
        type: file?.type || 'No type',
        size: file?.size || 0
      });
    } catch (parseError) {
      console.error('❌ FormData parsing failed:', parseError);
      return NextResponse.json(
        { 
          error: 'Invalid form data. Please ensure you are sending a proper multipart/form-data request.',
          details: process.env.NODE_ENV === 'development' && parseError instanceof Error ? parseError.message : undefined
        },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type (images and PDFs)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, WebP, and PDF are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    console.log('🔄 Converting file to buffer...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('✅ Buffer created, size:', buffer.length, 'bytes');

    // Upload to Cloudinary using upload_stream
    console.log('☁️ Starting Cloudinary upload...');
    const uploadResult = await new Promise<{
      secure_url: string;
      public_id: string;
      width?: number;
      height?: number;
    }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'key-2-rent/listings',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' }
          ],
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', {
              message: error.message,
              http_code: error.http_code,
              error: error.error
            });
            reject(error);
          } else {
            console.log('✅ Cloudinary upload successful:', {
              public_id: result?.public_id,
              secure_url: result?.secure_url,
              width: result?.width,
              height: result?.height
            });
            resolve({
              secure_url: result?.secure_url ?? '',
              public_id: result?.public_id ?? '',
              width: result?.width,
              height: result?.height,
            });
          }
        }
      );

      // Write buffer to stream
      uploadStream.end(buffer);
    });

    // Return the secure URL
    return NextResponse.json(
      {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorObj = error as { message?: string; stack?: string; name?: string; cause?: unknown; http_code?: number; error?: unknown };
    console.error('❌ Image upload error details:', {
      message: errorObj.message,
      stack: errorObj.stack,
      name: errorObj.name,
      cause: errorObj.cause,
      http_code: errorObj.http_code,
      error_details: errorObj.error
    });
    
    // Determine specific error message
    let errorMessage = 'Failed to upload image. Please try again.';
    if (errorObj.message?.includes('configuration') || errorObj.message?.includes('API key')) {
      errorMessage = 'Server configuration error. Please contact support.';
    } else if (errorObj.http_code === 401) {
      errorMessage = 'Authentication failed. Please contact support.';
    } else if (errorObj.http_code === 400) {
      errorMessage = 'Invalid file format or corrupted file.';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorObj.message : undefined
      },
      { status: 500 }
    );
  }
}
