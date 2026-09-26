// Vehicle finance repayment estimator.
//
// Rate confirmed by the dealer (2026-07-20). Every repayment figure on the site
// derives from this — update it here when the quoted rate changes.
export const DEFAULT_INTEREST_RATE = 0.125; // 12.5% p.a.

// NCA-capped fees (incl. VAT). Update if the regulated caps change.
export const INITIATION_FEE = 1207.5; // capitalised into the loan
export const MONTHLY_SERVICE_FEE = 69;

export const TERM_OPTIONS = [12, 24, 36, 48, 60, 72];

/**
 * Estimate the monthly instalment on a vehicle.
 *
 * @param {object} opts
 * @param {number} opts.price        Vehicle retail price (ZAR)
 * @param {number} [opts.deposit]    Cash deposit (ZAR)
 * @param {number} [opts.termMonths] Repayment term in months
 * @param {number} [opts.balloonPct] Balloon/residual as a fraction of price (0–0.4)
 * @param {number} [opts.annualRate] Nominal annual interest rate as a fraction
 * @returns {{ monthly: number, balloonAmount: number, financedAmount: number,
 *             totalRepayment: number, totalInterest: number }}
 */
export function calculateMonthly({
  price,
  deposit = 0,
  termMonths = 72,
  balloonPct = 0,
  annualRate = DEFAULT_INTEREST_RATE,
}) {
  const safePrice = Math.max(0, Number(price) || 0);
  const safeDeposit = Math.min(Math.max(0, Number(deposit) || 0), safePrice);
  const balloonAmount = safePrice * Math.min(Math.max(0, balloonPct), 0.4);

  const financedAmount = safePrice - safeDeposit + INITIATION_FEE;
  const r = annualRate / 12;
  const n = termMonths;

  if (safePrice <= 0 || financedAmount <= 0 || n <= 0) {
    return { monthly: 0, balloonAmount: 0, financedAmount: 0, totalRepayment: 0, totalInterest: 0 };
  }

  let principalPortion;
  if (r === 0) {
    principalPortion = (financedAmount - balloonAmount) / n;
  } else {
    const discount = Math.pow(1 + r, -n);
    // Present value of the balloon is deducted before amortising the remainder.
    principalPortion = ((financedAmount - balloonAmount * discount) * r) / (1 - discount);
  }

  const monthly = principalPortion + MONTHLY_SERVICE_FEE;
  const totalRepayment = monthly * n + balloonAmount + safeDeposit;

  return {
    monthly,
    balloonAmount,
    financedAmount,
    totalRepayment,
    totalInterest: totalRepayment - safePrice - INITIATION_FEE - MONTHLY_SERVICE_FEE * n,
  };
}

export function formatRand(value) {
  return `R ${new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 0 }).format(Math.round(value || 0))}`;
}
