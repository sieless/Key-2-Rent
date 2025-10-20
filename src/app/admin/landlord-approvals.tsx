'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LandlordApprovalsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Landlord Applications</CardTitle>
        <CardDescription>
          Verification is no longer required. Landlords can list properties immediately from the landlord guide.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This section has been retired. Use the Vacant Listing Payments tab to review payment proofs for vacant homes.
        </p>
      </CardContent>
    </Card>
  );
}
