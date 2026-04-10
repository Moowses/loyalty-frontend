const MEMBER_SAVINGS_RATE = 0.08;

function toAmount(value: unknown) {
  const n = typeof value === "number" ? value : Number(String(value ?? 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function getMemberPricing(input: {
  roomRate?: unknown;
  cleaningFee?: unknown;
  taxesAndFees?: unknown;
  petFee?: unknown;
}) {
  const roomRate = toAmount(input.roomRate);
  const cleaningFee = toAmount(input.cleaningFee);
  const taxesAndFees = toAmount(input.taxesAndFees);
  const petFee = toAmount(input.petFee);
  const memberSavings = roundCurrency(roomRate * MEMBER_SAVINGS_RATE);
  const discountedRoomRate = Math.max(0, roundCurrency(roomRate - memberSavings));
  // Preserve PMS/Meta taxes exactly as returned. Member pricing only discounts the room rate.
  const discountedTaxesAndFees = taxesAndFees;
  const retailTotal = roundCurrency(
    roomRate + cleaningFee + taxesAndFees + petFee
  );
  const memberTotal = roundCurrency(
    discountedRoomRate + cleaningFee + discountedTaxesAndFees + petFee
  );

  return {
    rate: MEMBER_SAVINGS_RATE,
    roomRate,
    discountedRoomRate,
    cleaningFee,
    taxesAndFees,
    discountedTaxesAndFees,
    petFee,
    memberSavings,
    retailTotal: Math.max(0, retailTotal),
    memberTotal: Math.max(0, memberTotal),
  };
}
