export function computeVacancyCharge(monthlyRent: number): number {
  if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
    return 0;
  }
  return Math.round(monthlyRent * 0.1);
}

export function getVacancyPaymentAmount(monthlyRent?: number | null): number {
  return computeVacancyCharge(Number(monthlyRent ?? 0));
}

export function getVacancyPaymentLabel(propertyType?: string | null): string {
  if (!propertyType || !propertyType.trim()) {
    return 'Vacancy Listing';
  }
  return propertyType;
}
