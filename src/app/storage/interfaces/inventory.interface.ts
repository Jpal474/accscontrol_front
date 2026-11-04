export type InventoryAction =
  | 'location'
  | 'entry'
  | 'exit'
  | 'sale'
  | 'return'
  | 'transfer'
  | 'reserve'
  | 'release'
  | 'consume'
  | 'count'
  | 'approve'
  | 'reject';
export interface InventoryCommand {
  action: InventoryAction;
  idempotencyKey: string;
  reason: string;
  reference: string;
  warehouse?: string;
  shelf?: string;
  position?: string;
  variantId?: string;
  positionId?: string;
  targetPositionId?: string;
  quantity?: number;
  reservationId?: string;
  countId?: string;
  items?: { variantId: string; positionId: string; counted: number }[];
}
export interface InventoryLocation {
  id: string;
  name: string;
  shelf: string;
  warehouse: string;
  active: boolean;
}
export interface InventoryVariant {
  id: string;
  sku: string;
  name: string;
  product: string;
  status: string;
}
export interface StockBalance {
  positionId: string;
  variantId: string;
  sku: string;
  product: string;
  position: string;
  quantity: string;
  reserved: string;
  available: string;
  version: string;
}
export interface StockMovement {
  id: string;
  kind: string;
  quantity: string;
  sku: string;
  position: string;
  actorId: string;
  reason: string;
  reference: string;
  correlationId: string;
  createdAt: string;
}
export interface StockReservation {
  id: string;
  status: string;
  quantity: string;
  sku: string;
  position: string;
  reason: string;
  reference: string;
}
export interface StockCountItem {
  variantId: string;
  positionId: string;
  sku: string;
  position: string;
  expected: string;
  counted: string;
  difference: string;
}
export interface StockCount {
  id: string;
  status: string;
  reason: string;
  reference: string;
  actorId: string;
  reviewerId: string | null;
  items: StockCountItem[];
}
export interface InventoryPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
