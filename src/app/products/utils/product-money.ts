import { StoreCurrency } from '../interfaces/product.interface';

export function formatProductMoney(value: number | string, currency: StoreCurrency | null): string {
  const options: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  if (currency) {
    try { return new Intl.NumberFormat('es-MX', { ...options, style: 'currency', currency: currency.code, currencyDisplay: 'narrowSymbol' }).format(Number(value)); }
    catch { return `${currency.code} ${new Intl.NumberFormat('es-MX', options).format(Number(value))}`; }
  }
  return new Intl.NumberFormat('es-MX', options).format(Number(value));
}

export function productCurrencySymbol(currency: StoreCurrency | null): string {
  if (!currency) return '';
  try { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency.code, currencyDisplay: 'narrowSymbol' }).formatToParts(0)
    .find(part => part.type === 'currency')?.value || currency.code; }
  catch { return currency.code; }
}
