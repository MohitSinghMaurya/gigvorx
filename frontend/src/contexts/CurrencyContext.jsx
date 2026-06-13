import { createContext, useContext, useEffect, useState } from "react";

const CurrencyContext = createContext({ currency: "INR", setCurrency: () => {} });

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(res => res.json())
      .then(data => {
        if (data.country_code !== "IN") setCurrency("USD");
      })
      .catch(() => {});
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}