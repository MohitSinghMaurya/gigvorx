import React, { createContext, useContext, useState, useEffect } from "react";

const CurrencyContext = createContext({});

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    // Try to detect user location for currency
    const saved = localStorage.getItem("gigvorx_currency");
    if (saved) {
      setCurrency(saved);
      return;
    }

    // Auto-detect based on timezone
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone && !timezone.includes("Asia/Kolkata") && !timezone.includes("Asia/Calcutta")) {
        setCurrency("USD");
      } else {
        setCurrency("INR");
      }
    } catch {
      setCurrency("INR");
    }
  }, []);

  const toggleCurrency = () => {
    const next = currency === "INR" ? "USD" : "INR";
    setCurrency(next);
    localStorage.setItem("gigvorx_currency", next);
  };

  const value = {
    currency,
    setCurrency,
    toggleCurrency,
    symbol: currency === "INR" ? "₹" : "$",
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

export default CurrencyContext;