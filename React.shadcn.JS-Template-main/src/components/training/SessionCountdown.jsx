import { useSessionCountdown } from "@/lib/sessionCountdown";

export default function SessionCountdown({ startAt }) {
  const label = useSessionCountdown(startAt);
  if (!label) return null;

  return (
    <p className="text-sm md:text-base font-semibold text-red-600 tracking-tight">
      {label}
    </p>
  );
}
