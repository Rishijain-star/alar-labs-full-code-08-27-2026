/**
 * User-facing spots-left copy. Hides total capacity.
 * @param {number|null|undefined} spotsLeft
 * @returns {string|null}
 */
export function formatSpotsLeft(spotsLeft) {
  if (spotsLeft == null || !Number.isFinite(spotsLeft)) return null;
  if (spotsLeft <= 0) return "No Spots Left";
  if (spotsLeft <= 5) return `Only ${spotsLeft} Spot${spotsLeft === 1 ? "" : "s"} Left`;
  return `${spotsLeft} Spots Left`;
}

/**
 * @param {number} original
 * @param {number} price
 * @returns {number|null}
 */
export function computeDiscountPercent(original, price) {
  const orig = Number(original);
  const sale = Number(price);
  if (!Number.isFinite(orig) || !Number.isFinite(sale) || orig <= sale || orig <= 0 || sale <= 0) {
    return null;
  }
  return Math.round(((orig - sale) / orig) * 100);
}
