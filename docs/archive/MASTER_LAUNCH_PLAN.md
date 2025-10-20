# 🚀 Key-2-Rent - Master Launch Plan

**Target:** Monday Launch (FREE Mode)
**Current Status:** All features implemented, testing phase

---

## 📊 **PHASE 1: CRITICAL IMAGE UPLOAD FIX** ⚠️ **DO THIS FIRST**

### **Problem (Identified by Gemini AI):**
- Images not appearing in Firebase Storage console
- Storage Security Rules not deployed/optimized

### **Solution:**

**1️⃣ Deploy Updated Storage Rules**
```bash
# Make sure you're in the project directory
cd /home/sieless-ubuntu/Key-2-Rent

# Login to Firebase (if not already)
firebase login

# Verify correct project
firebase use studio-8585842935-1485a

# Deploy ONLY storage rules
firebase deploy --only storage
```

**Expected Output:**
```
✔ Deploy complete!
✔ storage: released rules storage.rules to firebase.storage/...
```

**2️⃣ Verify in Firebase Console**
- Visit: https://console.firebase.google.com/project/studio-8585842935-1485a/storage
- Click **"Rules"** tab
- Confirm rules match the updated `storage.rules` file
- Check "Last deployed" timestamp

**3️⃣ Test Image Upload**
1. Start dev server: `npm run dev`
2. Login to http://localhost:9002
3. Create a test listing with 2-3 images
4. **Watch browser console** (F12) for upload progress
5. **Check Firebase Storage console** - should see files appear in `listings/{userId}/...`

**✅ Success Criteria:**
- Browser console: "Image X upload is 100% done"
- Firebase Storage: Files visible in console
- Firestore: Listing has `images: [...]` array
- Website: Images display on listing cards

---

## 📊 **PHASE 2: PLATFORM INITIALIZATION** (One-time setup)

### **Initialize Firestore Settings**

**1️⃣ Run Admin Initialization**
```bash
# With dev server running
# Visit: http://localhost:9002/admin/init
# Login as: titwzmaihya@gmail.com
# Click: "Run Initialization"
```

**What it does:**
- Creates `/platformSettings/config` document
- Sets all payment features to OFF (FREE mode)
- Adds `images: []` field to existing listings

**2️⃣ Verify in Firestore Console**
- Visit: https://console.firebase.google.com/project/studio-8585842935-1485a/firestore
- Check `/platformSettings/config` exists
- Verify all `*Enabled` fields are `false`
- Check random listing has `images` field

---

## 📊 **PHASE 3: FEATURE TESTING** (Critical before launch)

### **Test Checklist:**

#### **A. Image Upload (HIGHEST PRIORITY)** ✅
After deploying storage rules:

- [ ] Upload 3 images to new listing
- [ ] Images appear in Firebase Storage console
- [ ] Images appear in Firestore `images` array
- [ ] Images display on listing card
- [ ] Images display on listing detail page
- [ ] Test on mobile browser
- [ ] No console errors

#### **B. Vacancy Filter & Sorting** ✅
- [ ] Go to `/all-properties`
- [ ] Open "Vacancy Status" dropdown
- [ ] Select "Vacant Only" → only vacant listings show
- [ ] Select "Occupied" → only occupied listings show
- [ ] Select "All" → all listings show
- [ ] Verify vacant listings appear at top (Featured → Boosted → Vacant → Soon → Occupied)

#### **C. Multi-Unit Controls** ✅
- [ ] Create listing with: "Total Units: 5, Available: 3"
- [ ] Go to "My Listings"
- [ ] See: "3 / 5 units available" counter
- [ ] Click **[+]** → counter becomes "4 / 5"
- [ ] Click **[-]** until "0 / 5"
- [ ] Status auto-changes to "Occupied"
- [ ] Click **[+]** again → status changes back to "Vacant"

#### **D. Password Visibility Toggles** ✅
- [ ] Visit `/login`
- [ ] Type password
- [ ] Click eye icon → password visible
- [ ] Click again → password hidden
- [ ] Repeat on `/signup` page

#### **E. Logo Display** ✅
- [ ] Check header - new logo appears
- [ ] Check `/login` - icon logo appears
- [ ] Check `/signup` - icon logo appears
- [ ] Toggle dark mode → logo color adapts
- [ ] Resize browser → tagline hides on mobile

#### **F. Admin Panel** ✅
- [ ] Visit `/admin`
- [ ] Click "Payment Settings" tab
- [ ] Verify all toggles OFF:
  - Contact Payment: OFF
  - Featured Listings: OFF
  - Boosted Vacancy: OFF
- [ ] Platform Status shows: "🟢 FREE"
- [ ] Try viewing a listing → phone number visible (no "Unlock" button)

---

## 📊 **PHASE 4: BUILD & DEPLOY**

### **1️⃣ Run Type Check**
```bash
npm run typecheck
```
**Expected:** Only Sentry SDK errors (safe to ignore)

### **2️⃣ Production Build**
```bash
npm run build
```
**Expected:** Build completes successfully
**If errors:** Fix and rebuild

### **3️⃣ Deploy to Vercel**
```bash
# Deploy to production
vercel --prod

# Or use Vercel dashboard:
# - Push to main branch
# - Vercel auto-deploys
```

### **4️⃣ Deploy Firestore Rules** (if changed)
```bash
firebase deploy --only firestore:rules
```

### **5️⃣ Verify Live Site**
- Visit: https://key-2-rent-ecru.vercel.app
- Test image upload on live site
- Test all critical features
- Check mobile responsiveness

---

## 📊 **PHASE 5: LAUNCH DAY** (Monday)

### **Morning Checklist:**

**1️⃣ Final Verification (8:00 AM)**
- [ ] Visit live site: https://key-2-rent-ecru.vercel.app
- [ ] Test image upload with real listing
- [ ] Verify all features working
- [ ] Check mobile responsiveness
- [ ] Verify payment features OFF

**2️⃣ Launch Announcement (9:00 AM)**

**Social Media Post:**
```
🎉 Key-2-Rent is NOW LIVE! 🏠🔑

Find your perfect rental home in Machakos, Kenya - 100% FREE!

✅ Browse properties at no cost
✅ Contact landlords directly (zero fees!)
✅ Real-time vacancy updates
✅ Multi-unit apartments tracked

🔗 Visit: https://key-2-rent-ecru.vercel.app/all-properties

Landlords: List your properties FREE today!

#MachakosRentals #KeyToRent #KenyaRentals #MachakosHomes
```

**3️⃣ Monitor (Throughout Day)**
- Watch Firebase usage (Firestore reads/writes)
- Monitor error logs in browser console
- Check for user feedback
- Respond to questions

---

## 🐛 **TROUBLESHOOTING QUICK REFERENCE**

### **Images Not Uploading**
```bash
# 1. Redeploy storage rules
firebase deploy --only storage

# 2. Check browser console for errors
# 3. Verify user is logged in
# 4. Check Firebase Storage console for files
```

### **Permission Denied Error**
```javascript
// storage/unauthorized
```
**Fix:** Storage rules not deployed or userId mismatch
```bash
firebase deploy --only storage
```

### **Images Upload But Don't Display**
**Check:**
1. Firestore has `images: [...]` array? (wait 5-10 seconds)
2. Browser Network tab: Any failed requests?
3. CORS errors? (should be fixed with your cors.json)

**Quick test:**
```tsx
{/* Replace Next.js Image temporarily */}
<img src={listing.images[0]} alt="test" />
```

### **Build Fails**
```bash
# Check TypeScript errors
npm run typecheck

# Fix errors and rebuild
npm run build
```

---

## 📈 **POST-LAUNCH MONITORING**

### **Week 1 Goals:**
- [ ] 50+ property listings
- [ ] 200+ site visits
- [ ] Zero critical errors
- [ ] Collect user feedback

### **Metrics to Track:**
- Firebase Firestore reads/writes (stay within free tier)
- Firebase Storage usage (stay within free tier)
- User registrations
- Listings created
- Image uploads successful

### **Firebase Quotas (Free Tier):**
- **Firestore:** 50,000 reads/day, 20,000 writes/day
- **Storage:** 5GB total, 1GB/day downloads
- **Authentication:** Unlimited

### **When to Enable Payments:**
Monitor platform usage for 1-2 weeks, then:
1. Go to `/admin` → Payment Settings
2. Toggle features ON as needed
3. Integrate M-Pesa (future)

---

## ✅ **FINAL CHECKLIST BEFORE LAUNCH**

**Technical:**
- [ ] Storage rules deployed
- [ ] Platform initialization complete
- [ ] All features tested
- [ ] Production build successful
- [ ] Deployed to Vercel
- [ ] Live site tested

**Business:**
- [ ] Launch announcement ready
- [ ] Social media accounts set up
- [ ] Monitoring plan in place
- [ ] Support channel ready (email/WhatsApp)

**Documentation:**
- [ ] `IMPLEMENTATION_SUMMARY.md` - Complete ✅
- [ ] `IMAGE_UPLOAD_FIX_PLAN.md` - Complete ✅
- [ ] `DEBUG_IMAGE_UPLOAD.md` - Complete ✅
- [ ] `MASTER_LAUNCH_PLAN.md` - Complete ✅

---

## 🎊 **SUCCESS!**

When you see:
- ✅ Images uploading to Firebase Storage
- ✅ Images displaying on listings
- ✅ Vacant listings sorting to top
- ✅ Multi-unit controls working
- ✅ All payment features OFF
- ✅ No console errors
- ✅ Mobile responsive

**You're ready to launch! 🚀**

---

## 📞 **Support Contacts**

**Firebase Issues:**
- Console: https://console.firebase.google.com/project/studio-8585842935-1485a
- Documentation: https://firebase.google.com/docs

**Vercel Issues:**
- Dashboard: https://vercel.com/dashboard
- Documentation: https://vercel.com/docs

**Critical Errors:**
- Check browser console first
- Check Firebase logs
- Review `DEBUG_IMAGE_UPLOAD.md`

---

**CURRENT PRIORITY: Deploy storage rules and test image upload!**

```bash
firebase deploy --only storage
```

Then test upload and verify files appear in Firebase Storage console.
