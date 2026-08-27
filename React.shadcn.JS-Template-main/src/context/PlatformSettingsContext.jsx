import { createContext, useContext, useMemo } from "react";
import { useSelector } from "react-redux";
import { useGetPublicPlatformSettingsQuery } from "@/store/api/siteContentApi";
import {
  formatUserPrice,
  formatUtcForUser,
  resolveDisplayCurrency,
  DEFAULT_RATES,
} from "@/lib/localeFormat";

const PlatformSettingsContext = createContext(null);

export function PlatformSettingsProvider({ children }) {
  const { data, isLoading } = useGetPublicPlatformSettingsQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const user = useSelector((s) => s.auth?.user);

  const settings = data?.data?.settings || data?.settings || {};

  const value = useMemo(() => {
    const siteName = settings.siteName || "ALAR Labs";
    const siteDescription = settings.siteDescription || "";
    const displayCurrency = resolveDisplayCurrency(user, settings);

    return {
      settings,
      siteName,
      siteDescription,
      displayCurrency,
      isLoading,
      formatPrice: (amount, itemCurrency) =>
        formatUserPrice(amount, itemCurrency, user, settings),
      formatDateTime: (utcDate) => formatUtcForUser(utcDate, user, settings),
    };
  }, [settings, user, isLoading]);

  return (
    <PlatformSettingsContext.Provider value={value}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettings() {
  const ctx = useContext(PlatformSettingsContext);
  if (!ctx) {
    return {
      settings: {},
      siteName: "ALAR Labs",
      siteDescription: "",
      displayCurrency: "INR",
      isLoading: false,
      formatPrice: (amount, currency) => formatUserPrice(amount, currency, null, { baseCurrency: "INR", currency: "INR", exchangeRates: DEFAULT_RATES }),
      formatDateTime: (d) => (d ? new Date(d).toLocaleString() : ""),
    };
  }
  return ctx;
}

export function usePlatformSettingsOptional() {
  return useContext(PlatformSettingsContext);
}
