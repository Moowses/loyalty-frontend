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
  const estimatedTotal = roundCurrency(roomRate + cleaningFee + taxesAndFees + petFee - memberSavings);

  return {
    rate: MEMBER_SAVINGS_RATE,
    roomRate,
    cleaningFee,
    taxesAndFees,
    petFee,
    memberSavings,
    estimatedTotal: Math.max(0, estimatedTotal),
  };
}
