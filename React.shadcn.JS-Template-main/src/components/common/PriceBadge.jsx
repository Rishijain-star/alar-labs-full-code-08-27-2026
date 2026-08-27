import { Badge } from "@/components/ui/badge";
import { usePlatformSettings } from "@/context/PlatformSettingsContext";

/** Catalog items are stored in INR unless a currency field is provided. */
export const DEFAULT_STORED_CURRENCY = "INR";

export function DisplayPrice({ price, currency = DEFAULT_STORED_CURRENCY, className }) {
  const { formatPrice } = usePlatformSettings();
  return <span className={className}>{formatPrice(price, currency)}</span>;
}

export function PriceBadge({
  isFree,
  price,
  currency = DEFAULT_STORED_CURRENCY,
  variant,
  className,
  ...props
}) {
  const { formatPrice } = usePlatformSettings();
  const badgeVariant = variant || (isFree ? "free" : "paid");

  return (
    <Badge variant={badgeVariant} className={className} {...props}>
      {isFree ? "FREE" : formatPrice(price, currency)}
    </Badge>
  );
}
