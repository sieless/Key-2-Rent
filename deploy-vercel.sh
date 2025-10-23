#!/bin/bash

echo "🚀 Deploying Timelaine to Vercel with Image Fixes"
echo "=================================================="

# Step 1: Build the application
echo ""
echo "📦 Step 1: Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Step 2: Commit changes
echo ""
echo "📝 Step 2: Committing changes..."
git add .
git commit -m "Fix: Image loading issues with OptimizedImage component and CORS configuration"

# Step 3: Push to GitHub
echo ""
echo "🔄 Step 3: Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "Next steps:"
echo "1. Configure Firebase Storage CORS:"
echo "   gsutil cors set cors.json gs://studio-8585842935-1485a.appspot.com"
echo ""
echo "2. Wait for Vercel to auto-deploy from GitHub"
echo "3. Check https://studio1-ecru.vercel.app/ for images"
echo ""
echo "4. If images still don't load:"
echo "   - Clear Vercel cache (Dashboard → Settings → Data Cache → Purge)"
echo "   - Check Vercel environment variables are set"
echo "   - Review IMAGE_FIX_GUIDE.md for troubleshooting"
echo ""
