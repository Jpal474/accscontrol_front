import { formatProductMoney, productCurrencySymbol } from './product-money';

describe('Store currency formatting', () => {
  it('uses the active store currency without assuming pesos', () => {
    const euro = { id: 'currency', code: 'EUR', description: 'Euro' };
    expect(productCurrencySymbol(euro)).toBe('€');
    expect(formatProductMoney('20.5', euro)).toBe('€20.50');
    expect(formatProductMoney('20.5', { ...euro, code: 'MXN' })).toBe('$20.50');
    expect(formatProductMoney('20.5', { ...euro, code: 'GBP' })).toContain('£');
  });
});
