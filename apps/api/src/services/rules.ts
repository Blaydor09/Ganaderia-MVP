export const isBatchExpired = (expiresAt: Date, now = new Date()) => {
  return expiresAt.getTime() < now.getTime();
};

export const hasSufficientStock = (available: number, dose: number) => {
  return available >= dose;
};

export const isWithdrawalActive = (until: Date | null, now = new Date()) => {
  return Boolean(until && until.getTime() > now.getTime());
};
