/**
 * Treat content as free when explicitly flagged or price is zero.
 */
function resolveIsFree(item) {
  if (!item) return true;
  const price = Number(item.price);
  return !!item.is_free || price === 0 || Number.isNaN(price);
}

module.exports = { resolveIsFree };
