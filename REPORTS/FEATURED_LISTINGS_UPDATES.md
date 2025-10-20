## Featured Listings & Payment Enhancements

- Added an `adminListingId` property mirroring the Firestore document ID to every listing.
- Listing creation now sets `adminListingId` immediately after Firestore returns the new document reference.
- Admin-only views (dashboard listings table and featured properties panel) show the ID with a copy-to-clipboard action and toast feedback.

## Property Detail Page Updates

- Relocated the “Learn More” CTA from the admin featured panel to the public property detail page.
- Button links to `/payment-info` (temporary reuse of the local preview functionality) so landlords can understand the featured program.
- Admins also see the internal property ID on the detail page with copy support.

## Pending Follow-Ups

- Publish permanent educational content for the featured program and replace the temporary `/payment-info` link once finalized.
- Audit other admin surfaces to ensure `adminListingId` appears wherever property IDs are useful.
