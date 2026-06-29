// frontend/src/lib/CurrencyContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const CurrencyContext = createContext({});

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState("INR");

  useEffect(() => {
    // Check saved preference first — this makes it stick after refresh
    const saved = localStorage.getItem("gigvorx_currency");
    if (saved) {
      setCurrencyState(saved);
      return;
    }

    // Auto detect from IP
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        const detected = data.country_code === "IN" ? "INR" : "USD";
        setCurrencyState(detected);
        localStorage.setItem("gigvorx_currency", detected);
      })
      .catch(() => {
        // Fallback: detect from timezone
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const isIndia =
            tz.includes("Kolkata") || tz.includes("Calcutta");
          const fallback = isIndia ? "INR" : "USD";
          setCurrencyState(fallback);
          localStorage.setItem("gigvorx_currency", fallback);
        } catch {
          setCurrencyState("INR");
        }
      });
  }, []);

  // Always saves to localStorage when changed
  const setCurrency = (c) => {
    setCurrencyState(c);
    localStorage.setItem("gigvorx_currency", c);
  };

  const toggleCurrency = () => {
    const next = currency === "INR" ? "USD" : "INR";
    setCurrency(next);
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