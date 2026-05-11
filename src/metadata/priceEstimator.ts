export interface SellingPriceBreakdown {
  supplierPrice: number;
  marketplaceFee: number;
  profit: number;
  estimatedSellingPrice: number;
}

export function formatPriceNumber(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

export function buildSellingPriceBreakdown(
  supplierPrice: number | null
): SellingPriceBreakdown | null {
  if (supplierPrice === null || !Number.isFinite(supplierPrice) || supplierPrice < 0) {
    return null;
  }

  const normalizedSupplierPrice = Math.round(supplierPrice);
  const marketplaceFee = Math.round(normalizedSupplierPrice * 0.25);
  const profit = Math.round(normalizedSupplierPrice * 0.25);

  return {
    supplierPrice: normalizedSupplierPrice,
    marketplaceFee,
    profit,
    estimatedSellingPrice: normalizedSupplierPrice + marketplaceFee + profit
  };
}
