export interface PosLineInput {
  variantId: string;
  positionId: string;
  quantity: number;
}
export interface PosPaymentInput {
  method: 'cash' | 'card' | 'manual';
  amount: string;
  reference: string;
}
export interface PosCartInput {
  items: PosLineInput[];
  promotionId?: string;
}
export interface PosCheckoutInput extends PosCartInput {
  cashSessionId?: string;
  idempotencyKey: string;
  quoteToken: string;
  payments: PosPaymentInput[];
}
export interface PosReturnLineInput {
  saleItemId: string;
  quantity: number;
  restocked: boolean;
  positionId?: string;
}
export interface PosReturnInput {
  saleId: string;
  items: PosReturnLineInput[];
}
export interface PosRefundInput extends PosReturnInput {
  cashSessionId?: string;
  idempotencyKey: string;
  quoteToken: string;
  reason: string;
  payments: PosPaymentInput[];
}
export interface PosQuoteLine extends PosLineInput {
  sku: string;
  name: string;
  position: string;
  unitPrice: string;
  subtotal: string;
  discount: string;
  net: string;
  tax: string;
  total: string;
}
export interface PosQuote {
  items: PosQuoteLine[];
  subtotal: string;
  discount: string;
  net: string;
  tax: string;
  total: string;
  currency: string;
  taxBps: number;
  taxIncluded: boolean;
  settingsVersion: number;
  promotionId: string | null;
  promotionName: string | null;
  discountBps: number;
  quoteToken: string;
}
export interface PosReturnQuote {
  saleId: string;
  currency: string;
  items: (PosReturnLineInput & {
    variantId: string;
    net: string;
    tax: string;
    total: string;
  })[];
  net: string;
  tax: string;
  total: string;
  quoteToken: string;
}
export interface PosSettings {
  configured: boolean;
  taxBps: number;
  taxIncluded: boolean;
  version: number;
}
export interface PosPromotion {
  id: string;
  name: string;
  discountBps: number;
  active: boolean;
}
export interface PosSearchItem {
  id: string;
  sku: string;
  name: string;
  price: string;
  currency: string;
  barcodes: string[];
  positions: { id: string; name: string; available: string }[];
}
export interface PosSaleItem extends PosQuoteLine {
  id: string;
  returnedQuantity: string;
}
export interface PosReturnDocument {
  id: string;
  reason: string;
  net: string;
  tax: string;
  total: string;
  createdAt: string;
  actorId: string;
  items: (PosReturnLineInput & { net: string; tax: string; total: string })[];
  payments: PosPaymentInput[];
}
export interface PosSale {
  id: string;
  status: 'COMPLETED';
  currency: string;
  companyName: string;
  branchName: string;
  timezone: string;
  cashierName: string;
  actorId: string;
  createdAt: string;
  taxBps: number;
  taxIncluded: boolean;
  promotionName: string | null;
  subtotal: string;
  discount: string;
  net: string;
  tax: string;
  total: string;
  items: PosSaleItem[];
  payments: PosPaymentInput[];
  returns: PosReturnDocument[];
  correlationId: string;
}
