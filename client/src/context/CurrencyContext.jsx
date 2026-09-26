import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();

export const CURRENCIES = [
  { code: 'USD', symbol: '$', rate: 1, label: 'USD ($)' },
  { code: 'EUR', symbol: '€', rate: 0.92, label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', rate: 0.79, label: 'GBP (£)' },
  { code: 'JPY', symbol: '¥', rate: 155, label: 'JPY (¥)' },
  { code: 'BDT', symbol: '৳', rate: 120, label: 'BDT (৳)' },
];

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('wandernest_currency') || 'USD';
  });

  useEffect(() => {
    localStorage.setItem('wandernest_currency', currency);
  }, [currency]);

  const currentCurrencyObj = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  /**
   * Converts a USD amount to the selected currency
   */
  const convertAmount = (amountUSD) => {
    if (amountUSD === null || amountUSD === undefined || isNaN(amountUSD)) return 0;
    return Math.round(Number(amountUSD) * currentCurrencyObj.rate);
  };

  /**
   * Formats a USD amount in the selected currency
   */
  const formatPrice = (amountUSD, showDecimals = false) => {
    if (amountUSD === null || amountUSD === undefined || isNaN(amountUSD)) return `${currentCurrencyObj.symbol}0`;
    const converted = Number(amountUSD) * currentCurrencyObj.rate;
    
    // For currencies like JPY / BDT, don't show cents
    if (currency === 'JPY' || currency === 'BDT' || !showDecimals) {
      return `${currentCurrencyObj.symbol}${Math.round(converted).toLocaleString()}`;
    }
    return `${currentCurrencyObj.symbol}${converted.toFixed(2)}`;
  };

  /**
   * Formats a budget estimate or range
   */
  const formatEstimateRange = (minUSD = 40, maxUSD = 90, unit = 'day') => {
    const min = Math.round(minUSD * currentCurrencyObj.rate).toLocaleString();
    const max = Math.round(maxUSD * currentCurrencyObj.rate).toLocaleString();
    return `${currentCurrencyObj.symbol}${min} – ${currentCurrencyObj.symbol}${max} / ${unit}`;
  };

  /**
   * Convert priceTier ('$', '$$', '$$$', '$$$$') into a readable currency estimate
   */
  const formatPriceTier = (tier) => {
    switch (tier) {
      case '$':
        return `Budget · ${formatPrice(25)}–${formatPrice(60)}`;
      case '$$':
        return `Moderate · ${formatPrice(70)}–${formatPrice(150)}`;
      case '$$$':
        return `Upscale · ${formatPrice(160)}–${formatPrice(320)}`;
      case '$$$$':
        return `Luxury · ${formatPrice(350)}+`;
      default:
        return `Moderate · ${formatPrice(60)}–${formatPrice(120)}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      currencies: CURRENCIES,
      currentCurrency: currentCurrencyObj,
      convertAmount,
      formatPrice,
      formatEstimateRange,
      formatPriceTier
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
