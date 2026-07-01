import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CurrencyContext = createContext({
  currency: "INR",
  setCurrency: () => {},
  toggleCurrency: () => {},
  symbol: "₹",
});

function detectFallbackCurrency() {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const language = navigator.language || "";

    if (
      timezone.includes("Kolkata") ||
      timezone.includes("Calcutta") ||
      language === "hi" ||
      language === "en-IN"
    ) {
      return "INR";
    }
  } catch {
    return "INR";
  }

  return "USD";
}

function normalizeCurrency(currency) {
  return currency === "USD" ? "USD" : "INR";
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState("INR");

  useEffect(() => {
    const saved = localStorage.getItem("gigvorx_currency");

    if (saved) {
      setCurrencyState(normalizeCurrency(saved));
      return;
    }

    const detected = detectFallbackCurrency();
    setCurrencyState(detected);
    localStorage.setItem("gigvorx_currency", detected);
  }, []);

  const setCurrency = (nextCurrency) => {
    const cleanCurrency = normalizeCurrency(nextCurrency);
    setCurrencyState(cleanCurrency);
    localStorage.setItem("gigvorx_currency", cleanCurrency);
  };

  const toggleCurrency = () => {
    setCurrency(currency === "INR" ? "USD" : "INR");
  };

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      toggleCurrency,
      symbol: currency === "INR" ? "₹" : "$",
    }),
    [currency]
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

export default CurrencyContext;