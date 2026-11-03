export function minorUnits(value: string): bigint {
  if (!/^[0-9]{1,16}\.[0-9]{2}$/.test(value))
    throw new Error('Usa un importe con dos decimales');
  const [whole, fraction] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction);
}
export function decimalAmount(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const positive = value < 0n ? -value : value;
  return (
    sign +
    (positive / 100n).toString() +
    '.' +
    (positive % 100n).toString().padStart(2, '0')
  );
}
export function displayMoney(value: string, currency: string): string {
  const [whole, fraction] = value.split('.');
  return `${currency} ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction || '00'}`;
}
