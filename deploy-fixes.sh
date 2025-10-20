#!/bin/bash

echo "🔥 CRITICAL FIXES DEPLOYMENT"
echo "============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build test
echo -e "${YELLOW}📦 Step 1: Testing build...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed! Please fix errors and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"
echo ""

# Step 2: Firebase CORS setup
echo -e "${YELLOW}🔧 Step 2: Firebase Storage CORS Configuration${NC}"
echo "Run this command to configure CORS:"
echo ""
echo -e "${GREEN}gsutil cors set cors.json gs://studio-8585842935-1485a.appspot.com${NC}"
echo ""
echo -e "If you don't have gsutil installed:"
echo "1. Install Google Cloud SDK: curl https://sdk.cloud.google.com | bash"
echo "2. Initialize: gcloud init"
echo "3. Then run the gsutil command above"
echo ""
read -p "Have you configured CORS? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Please configure CORS before deploying.${NC}"
    echo "Deployment will continue, but images may not load without CORS."
    echo ""
fi

# Step 3: Commit changes
echo -e "${YELLOW}📝 Step 3: Committing changes...${NC}"
git add .
git commit -m "Critical fix: Firebase initialization error and image display issues

- Fixed Firebase 'no-options' error
- Enhanced OptimizedImage component with better error handling
- Fixed container sizing to prevent layout squeeze
- Added min-height to prevent collapsed containers
- Disabled Next.js image optimization for Firebase Storage
- Added blob URL support for upload previews
- Improved loading states with proper dimensions"

# Step 4: Push to GitHub
echo ""
echo -e "${YELLOW}🚀 Step 4: Pushing to GitHub...${NC}"
git push origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git push failed!${NC}"
    echo "Check your SSH keys or authentication."
    exit 1
fi

echo -e "${GREEN}✅ Code pushed to GitHub!${NC}"
echo ""

# Step 5: Vercel Environment Variables Check
echo -e "${YELLOW}⚙️  Step 5: Vercel Environment Variables${NC}"
echo "Make sure these are set in Vercel Dashboard:"
echo ""
echo "NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY"
echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID"
echo "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
echo "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
echo "NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID"
echo ""
echo "Set these at: https://vercel.com/studio1-ecru/settings/environment-variables"
echo ""

# Done
echo ""
echo -e "${GREEN}✅ Deployment initiated!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 NEXT STEPS:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. ⏳ Wait for Vercel to auto-deploy (1-3 minutes)"
echo "   Check: https://vercel.com/studio1-ecru"
echo ""
echo "2. 🧹 Clear Vercel cache after deployment:"
echo "   Dashboard → Settings → Data Cache → Purge Everything"
echo ""
echo "3. ✅ Test the live site:"
echo "   https://studio1-ecru.vercel.app/"
echo ""
echo "4. 🔍 Verify images are loading:"
echo "   - Homepage category sections"
echo "   - Individual listing pages"
echo "   - My Listings dashboard"
echo ""
echo "5. 🐛 If images still don't load:"
echo "   - Check browser console for errors"
echo "   - Verify CORS is set: gsutil cors get gs://studio-8585842935-1485a.appspot.com"
echo "   - Check Vercel environment variables"
echo "   - Review CRITICAL_FIXES.md for troubleshooting"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}📚 Documentation:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "- CRITICAL_FIXES.md - Complete fix documentation"
echo "- IMAGE_FIX_GUIDE.md - Image troubleshooting guide"
echo "- DEPLOYMENT.md - General deployment guide"
echo ""
